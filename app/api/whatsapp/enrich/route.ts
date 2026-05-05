import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getEvolutionClient } from '@/lib/evolution'
import { jidToPhone } from '@/lib/utils'

// Returns true if the string is a raw phone number (no real name)
function looksLikePhone(s: string | null): boolean {
  if (!s) return true
  return /^\+?[\d\s\-().]{7,}$/.test(s.trim())
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()

    // Accept optional list of JIDs; if not provided, enrich all conversations
    const body = await req.json().catch(() => ({}))
    const jids: string[] = body.jids || []

    const evo = await getEvolutionClient(session.clinicId)
    if (!evo) return NextResponse.json({ error: 'WhatsApp não configurado' }, { status: 400 })

    // Fetch conversations that need enrichment
    const where = jids.length > 0
      ? { remoteJid: { in: jids } }
      : {}

    const conversations = await prisma.conversation.findMany({
      where,
      select: { id: true, remoteJid: true, remotePhone: true, remoteName: true },
      take: 50,
    })

    // Only enrich those without a real name (or whose name looks like a phone number)
    const toEnrich = conversations.filter(c => looksLikePhone(c.remoteName))

    const results: Record<string, { name: string; pictureUrl: string }> = {}

    await Promise.allSettled(
      toEnrich.map(async (conv) => {
        // Use remotePhone (already extracted) — strip to digits only for the API
        const phone = conv.remotePhone.replace(/\D/g, '')
        if (!phone || phone.length < 8) return

        const profile = await evo.fetchProfile(phone)
        if (!profile) return

        const name = profile.name || ''
        const pictureUrl = profile.picture || ''

        // Persist name in DB so next load is instant
        if (name || pictureUrl) {
          await prisma.conversation.update({
            where: { id: conv.id },
            data: {
              ...(name ? { remoteName: name } : {}),
              ...(pictureUrl ? { remoteAvatarUrl: pictureUrl } : {}),
            },
          })
        }

        results[conv.remoteJid] = { name, pictureUrl }
      })
    )

    // Also return current avatarUrl for conversations that already have one
    const enriched = await prisma.conversation.findMany({
      where: jids.length > 0 ? { remoteJid: { in: jids } } : {},
      select: { remoteJid: true, remoteName: true, remoteAvatarUrl: true },
      take: 50,
    })

    const final: Record<string, { name: string; pictureUrl: string }> = {}
    for (const c of enriched) {
      final[c.remoteJid] = {
        name: c.remoteName || '',
        pictureUrl: c.remoteAvatarUrl || '',
      }
    }

    return NextResponse.json({ profiles: final })
  } catch (err: any) {
    console.error('Enrich error:', err.message)
    return NextResponse.json({ profiles: {} })
  }
}
