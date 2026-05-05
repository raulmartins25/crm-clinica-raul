import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getEvolutionClient } from '@/lib/evolution'

export async function POST(req: NextRequest) {
  const session = await requireSession()

  try {
    const { conversationId, targetExternalId, emoji } = await req.json()

    if (!conversationId || !targetExternalId || !emoji) {
      return NextResponse.json({ error: 'conversationId, targetExternalId e emoji são obrigatórios' }, { status: 400 })
    }

    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conversation) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

    const evo = await getEvolutionClient(session.clinicId)
    if (!evo) return NextResponse.json({ error: 'WhatsApp não configurado' }, { status: 400 })

    const res = await evo.sendReaction(conversation.remoteJid, targetExternalId, emoji)
    const externalId: string = res?.key?.id || ''

    const message = await prisma.message.create({
      data: {
        conversationId,
        externalId: externalId || undefined,
        direction: 'OUTBOUND',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'REACTION' as any,
        content: emoji,
        mediaName: targetExternalId,
        status: 'SENT',
        sentById: session.id,
        timestamp: new Date(),
      },
    })

    return NextResponse.json({ message })
  } catch (error: any) {
    console.error('Send reaction error:', error)
    return NextResponse.json({ error: 'Erro ao enviar reação', details: error.response?.data || error.message }, { status: 500 })
  }
}
