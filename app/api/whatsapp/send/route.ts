import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getEvolutionClient } from '@/lib/evolution'
import { jidToPhone } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const session = await requireSession()

  try {
    const formData = await req.formData()
    const conversationId = formData.get('conversationId') as string
    const text = formData.get('text') as string | null
    const file = formData.get('file') as File | null

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId é obrigatório' }, { status: 400 })
    }

    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conversation) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

    const evo = await getEvolutionClient(session.clinicId)
    if (!evo) return NextResponse.json({ error: 'WhatsApp não configurado' }, { status: 400 })

    const phone = jidToPhone(conversation.remoteJid)
    let externalId = ''
    let savedContent = text || ''
    let msgType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' = 'TEXT'
    let mediaUrl = ''
    let mediaName = ''
    let mediaMimeType = ''

    if (file) {
      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      const mime = file.type
      mediaName = file.name
      mediaMimeType = mime
      savedContent = text || ''

      if (mime.startsWith('image/')) {
        msgType = 'IMAGE'
        const res = await evo.sendMedia({
          number: phone,
          mediatype: 'image',
          media: `data:${mime};base64,${base64}`,
          caption: text || undefined,
          fileName: file.name,
        })
        externalId = res?.key?.id || ''
      } else if (mime.startsWith('audio/')) {
        msgType = 'AUDIO'
        const res = await evo.sendAudio(phone, base64)
        externalId = res?.key?.id || ''
      } else if (mime.startsWith('video/')) {
        msgType = 'VIDEO'
        const res = await evo.sendMedia({
          number: phone,
          mediatype: 'video',
          media: `data:${mime};base64,${base64}`,
          caption: text || undefined,
          fileName: file.name,
        })
        externalId = res?.key?.id || ''
      } else {
        msgType = 'DOCUMENT'
        const res = await evo.sendMedia({
          number: phone,
          mediatype: 'document',
          media: `data:${mime};base64,${base64}`,
          caption: text || undefined,
          fileName: file.name,
        })
        externalId = res?.key?.id || ''
      }
    } else if (text) {
      const res = await evo.sendText({ number: phone, text })
      externalId = res?.key?.id || ''
    } else {
      return NextResponse.json({ error: 'Mensagem ou arquivo é obrigatório' }, { status: 400 })
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        externalId: externalId || undefined,
        direction: 'OUTBOUND',
        type: msgType,
        content: savedContent,
        mediaName,
        mediaMimeType,
        status: 'SENT',
        sentById: session.id,
        isFromAI: false,
        timestamp: new Date(),
      },
    })

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessageText: savedContent || `[${msgType.toLowerCase()}]`,
      },
    })

    return NextResponse.json({ message })
  } catch (error: any) {
    console.error('Send message error:', error)
    return NextResponse.json({ 
      error: 'Erro ao enviar mensagem', 
      details: error.response?.data || error.message 
    }, { status: 500 })
  }
}
