import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getEvolutionClient } from '@/lib/evolution'
import { jidToPhone } from '@/lib/utils'

export async function POST() {
  try {
    const session = await requireSession()
    const evo = await getEvolutionClient(session.clinicId)

    if (!evo) {
      return NextResponse.json({ error: 'WhatsApp não conectado' }, { status: 400 })
    }

    // 1. Busca todos os chats da instância na Evolution API
    const chatsResponse = await evo.getChats()
    // Dependendo da versão da Evolution, os dados podem estar em chatsResponse.data, ou direto
    const chats = Array.isArray(chatsResponse) ? chatsResponse : (chatsResponse?.data || [])

    if (!Array.isArray(chats) || chats.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhuma conversa encontrada para sincronizar.' })
    }

    let syncedCount = 0

    // 2. Para cada chat, cria/atualiza a Conversation no banco de dados
    for (const chat of chats) {
      const remoteJid = chat.remoteJid
      if (!remoteJid || remoteJid.includes('@g.us') || remoteJid.includes('@lid') || remoteJid.includes('status@broadcast')) continue

      const phone = jidToPhone(remoteJid)
      const pushName = chat.name || chat.pushName || chat.pushname || ''
      const unreadCount = chat.unreadCount || 0

      // Tenta achar paciente correspondente
      const patient = await prisma.patient.findFirst({
        where: { clinicId: session.clinicId, phone: { contains: phone.slice(-10) } },
      })

      // Atualiza ou cria a conversa
      await prisma.conversation.upsert({
        where: { remoteJid },
        update: {
          remoteName: pushName,
          unreadCount,
          patientId: patient?.id,
        },
        create: {
          remoteJid,
          remotePhone: phone,
          remoteName: pushName,
          unreadCount,
          patientId: patient?.id,
          lastMessageAt: new Date(), // fallback
          lastMessageText: 'Mensagem sincronizada',
        },
      })
      syncedCount++
    }

    return NextResponse.json({ success: true, synced: syncedCount })
  } catch (err: any) {
    console.error('Error syncing chats:', err)
    return NextResponse.json({ error: 'Erro ao sincronizar conversas: ' + (err.message || 'Erro interno') }, { status: 500 })
  }
}
