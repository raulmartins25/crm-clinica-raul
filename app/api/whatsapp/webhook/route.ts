import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runAgent } from '@/lib/ai'
import { getEvolutionClient } from '@/lib/evolution'
import { phoneToJid, jidToPhone } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { event, data, instance } = body

    if (event === 'messages.upsert') {
      await handleIncomingMessage(data, instance)
    } else if (event === 'connection.update') {
      await handleConnectionUpdate(data, instance)
    } else if (event === 'qrcode.updated') {
      await handleQRCodeUpdate(data, instance)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function handleIncomingMessage(data: Record<string, unknown>, instanceName: string) {
  const message = data.message as Record<string, unknown>
  if (!message) return

  const key = message.key as Record<string, unknown>
  if (!key || key.fromMe) return

  const remoteJid = key.remoteJid as string
  const phone = jidToPhone(remoteJid)

  const pushName = (message.pushName as string) || ''
  const messageContent = message.message as Record<string, unknown>
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

  const externalId = (key.id as string) || ''
  const timestamp = new Date((message.messageTimestamp as number) * 1000 || Date.now())

  const whatsappInstance = await prisma.whatsappInstance.findUnique({
    where: { instanceName },
    include: { clinic: true },
  })
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
        unreadCount: 1,
        lastMessageAt: timestamp,
        lastMessageText: text || `[${msgType.toLowerCase()}]`,
      },
    })
  } else {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        unreadCount: { increment: 1 },
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
      direction: 'INBOUND',
      type: msgType as 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT',
      content: text,
      mediaUrl,
      mediaName,
      mediaMimeType,
      status: 'DELIVERED',
      timestamp,
    },
  })

  // Run AI agent if enabled
  if (conversation.aiEnabled && conversation.agentId && text) {
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
