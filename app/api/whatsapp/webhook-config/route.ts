import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { getEvolutionClient } from '@/lib/evolution'
import { prisma } from '@/lib/db'

// GET - Check current webhook config in Evolution API
export async function GET() {
  try {
    const session = await requireSession()
    const evo = await getEvolutionClient(session.clinicId)
    if (!evo) return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 })

    const current = await evo.getWebhook()
    const expected = `${(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')}/api/whatsapp/webhook`

    return NextResponse.json({ current, expected, match: current?.url === expected })
  } catch (err: any) {
    return NextResponse.json({ error: err.response?.data || err.message }, { status: 500 })
  }
}

// POST - Force reconfigure webhook
export async function POST() {
  try {
    const session = await requireSession()
    const evo = await getEvolutionClient(session.clinicId)
    if (!evo) return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 })

    const webhookUrl = `${(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')}/api/whatsapp/webhook`
    const result = await evo.setWebhook(webhookUrl)

    await prisma.whatsappInstance.update({
      where: { clinicId: session.clinicId },
      data: { webhookUrl },
    })

    return NextResponse.json({ ok: true, webhookUrl, result })
  } catch (err: any) {
    return NextResponse.json({ error: err.response?.data || err.message }, { status: 500 })
  }
}
