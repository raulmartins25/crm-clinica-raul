import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runAgent } from '@/lib/ai'
import { getEvolutionClient } from '@/lib/evolution'
import { phoneToJid, jidToPhone } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Webhook received:', JSON.stringify(body, null, 2))
    const { event, data, instance } = body
    const apiKeyHeader = req.headers.get('x-webhook-secret') || req.headers.get('apikey') || ''

    const eventLower = event?.toLowerCase()

    if (eventLower === 'messages.upsert') {
      // Evolution API v2 sends data as the message object directly OR data.messages[]
      const messages: any[] = data?.messages
        ? data.messages                 // array format
        : Array.isArray(data)
        ? data                           // direct array
        : [data]                         // single message object
      for (const msg of messages) {
        if (msg) await handleIncomingMessage(msg, instance, apiKeyHeader)
      }
    } else if (eventLower === 'connection.update') {
      await handleConnectionUpdate(data, instance)
    } else if (eventLower === 'qrcode.updated') {
      await handleQRCodeUpdate(data, instance)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function handleIncomingMessage(messagePayload: Record<string, any>, instanceName: string, apiKeyHeader = '') {
  if (!messagePayload) return

  // The message wrapper has .key at root level
  // The actual message content is in .message
  const key = messagePayload.key

  if (!key) {
    console.log('Webhook: No key found in payload:', JSON.stringify(messagePayload).slice(0, 300))
    return
  }

  const remoteJid = key.remoteJid as string
  if (!remoteJid || remoteJid.includes('@g.us') || remoteJid.includes('@lid') || remoteJid.includes('status@broadcast')) return

  const fromMe = !!key.fromMe
  const phone = jidToPhone(remoteJid)

  const pushName = (messagePayload.pushName as string) || (messagePayload.pushname as string) || ''
  // The actual message content (conversation, imageMessage, etc.)
  const messageContent = messagePayload.message as Record<string, any>

  if (!messageContent) return

  let text = ''
  let mediaUrl = ''
  let mediaName = ''
  let mediaMimeType = ''
  let msgType = 'TEXT'

  if (messageContent.conversation) {
    text = messageContent.conversation as string
  } else if (messageContent.extendedTextMessage) {
    const ext = messageContent.extendedTextMessage as Record<string, unknown>
    text = (ext.text as string) || ''
  } else if (messageContent.imageMessage) {
    msgType = 'IMAGE'
    const img = messageContent.imageMessage as Record<string, unknown>
    text = (img.caption as string) || ''
    mediaMimeType = (img.mimetype as string) || 'image/jpeg'
  } else if (messageContent.audioMessage) {
    msgType = 'AUDIO'
    mediaMimeType = 'audio/ogg'
  } else if (messageContent.documentMessage) {
    msgType = 'DOCUMENT'
    const doc = messageContent.documentMessage as Record<string, unknown>
    mediaName = (doc.fileName as string) || 'document'
    mediaMimeType = (doc.mimetype as string) || 'application/octet-stream'
    text = (doc.caption as string) || ''
  } else if (messageContent.videoMessage) {
    msgType = 'VIDEO'
    const vid = messageContent.videoMessage as Record<string, unknown>
    text = (vid.caption as string) || ''
    mediaMimeType = (vid.mimetype as string) || 'video/mp4'
  }

  // Permite mensagens sem texto apenas se for mídia
  if (!text && msgType === 'TEXT') {
    console.log('Webhook: Skipping empty TEXT message from', remoteJid)
    return
  }

  const externalId = (key.id as string) || ''
  const timestamp = new Date((messagePayload.messageTimestamp as number) * 1000 || Date.now())

  let whatsappInstance = await prisma.whatsappInstance.findUnique({
    where: { instanceName },
    include: { clinic: true },
  })

  if (!whatsappInstance && apiKeyHeader) {
    whatsappInstance = await prisma.whatsappInstance.findFirst({
      where: { apiKey: apiKeyHeader },
      include: { clinic: true },
    })
  }

  if (!whatsappInstance) return

  const patient = await prisma.patient.findFirst({
    where: { clinicId: whatsappInstance.clinicId, phone: { contains: phone.slice(-10) } },
  })

  let conversation = await prisma.conversation.findUnique({ where: { remoteJid } })
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        remoteJid,
        remotePhone: phone,
        remoteName: pushName,
        patientId: patient?.id,
        unreadCount: fromMe ? 0 : 1,
        lastMessageAt: timestamp,
        lastMessageText: text || `[${msgType.toLowerCase()}]`,
      },
    })
  } else {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        unreadCount: fromMe ? undefined : { increment: 1 },
        lastMessageAt: timestamp,
        lastMessageText: text || `[${msgType.toLowerCase()}]`,
        remoteName: pushName || conversation.remoteName,
        patientId: conversation.patientId || patient?.id,
      },
    })
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      externalId,
      direction: fromMe ? 'OUTBOUND' : 'INBOUND',
      type: msgType as 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT',
      content: text,
      mediaUrl,
      mediaName,
      mediaMimeType,
      status: 'DELIVERED',
      timestamp,
    },
  })

  // Run AI agent if enabled (ONLY for inbound messages)
  if (!fromMe && conversation.aiEnabled && conversation.agentId && text) {
    const agent = await prisma.aIAgent.findUnique({
      where: { id: conversation.agentId },
      include: { clinic: true, knowledgeItems: { where: { active: true } } },
    })
    if (!agent || agent.status !== 'ACTIVE') return

    const now = new Date()
    const hour = now.getHours()
    if (agent.workingHoursStart && agent.workingHoursEnd) {
      const [startH] = agent.workingHoursStart.split(':').map(Number)
      const [endH] = agent.workingHoursEnd.split(':').map(Number)
      if (hour < startH || hour >= endH) {
        if (agent.awayMessage) {
          const evo = await getEvolutionClient(whatsappInstance.clinicId)
          if (evo) await evo.sendText({ number: phone, text: agent.awayMessage })
        }
        return
      }
    }

    const recentMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { timestamp: 'desc' },
      take: 20,
    })

    const history = recentMessages
      .reverse()
      .slice(0, -1)
      .map((m) => ({
        role: (m.direction === 'INBOUND' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content || '',
      }))
      .filter((m) => m.content)

    const knowledgeContext = agent.knowledgeItems
      .map((k) => `### ${k.title}\n${k.content}`)
      .join('\n\n')

    const masterPrompt = knowledgeContext
      ? `${agent.masterPrompt}\n\n## Base de Conhecimento\n${knowledgeContext}`
      : agent.masterPrompt

    const aiResponse = await runAgent({
      masterPrompt,
      clinicName: agent.clinic.name,
      clinicSpecialty: agent.clinic.specialty || undefined,
      patientName: patient?.name,
      conversationHistory: history,
      userMessage: text,
    })

    const evo = await getEvolutionClient(whatsappInstance.clinicId)
    if (evo && aiResponse) {
      await evo.sendText({ number: phone, text: aiResponse })
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: 'OUTBOUND',
          type: 'TEXT',
          content: aiResponse,
          status: 'SENT',
          isFromAI: true,
          timestamp: new Date(),
        },
      })
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageText: aiResponse, lastMessageAt: new Date() },
      })
    }
  }
}

async function handleConnectionUpdate(data: Record<string, unknown>, instanceName: string) {
  const state = data.state as string
  await prisma.whatsappInstance.updateMany({
    where: { instanceName },
    data: { connected: state === 'open' },
  })
}

async function handleQRCodeUpdate(data: Record<string, unknown>, instanceName: string) {
  const qrCode = (data as Record<string, unknown>).qrcode as string
  await prisma.whatsappInstance.updateMany({
    where: { instanceName },
    data: { qrCode },
  })
}
