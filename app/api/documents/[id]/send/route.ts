import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getEvolutionClient } from '@/lib/evolution'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  const { id } = await params
  const { via } = await req.json()

  const document = await prisma.document.findFirst({
    where: { id, patient: { clinicId: session.clinicId } },
    include: { patient: true },
  })
  if (!document) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })

  if (via === 'whatsapp') {
    const evo = await getEvolutionClient(session.clinicId)
    if (!evo) return NextResponse.json({ error: 'WhatsApp não configurado' }, { status: 400 })

    const text = `*${document.title}*\n\n${document.content}`
    await evo.sendText({ number: document.patient.phone, text })
    await prisma.document.update({ where: { id }, data: { sentWhatsapp: true } })
  } else if (via === 'email') {
    if (!document.patient.email) {
      return NextResponse.json({ error: 'Paciente sem e-mail cadastrado' }, { status: 400 })
    }
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${document.title}</h2>
        <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${document.content}</pre>
      </div>
    `
    await sendEmail(session.clinicId, document.patient.email, document.title, html)
    await prisma.document.update({ where: { id }, data: { sentEmail: true } })
  }

  return NextResponse.json({ ok: true })
}
