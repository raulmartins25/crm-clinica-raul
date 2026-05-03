import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { generateDocument } from '@/lib/ai'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = await req.json()

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: { clinic: true },
    })
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    const patient = await prisma.patient.findFirst({
      where: { id: body.patientId, clinicId: session.clinicId },
    })
    if (!patient) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

    const birthDate = patient.birthDate ? new Date(patient.birthDate) : null
    const age = birthDate
      ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000))
      : undefined

    const typeMap: Record<string, any> = {
      PRESCRIPTION: 'prescription',
      EXAM_REQUEST: 'exam_request',
      REPORT: 'report',
      CERTIFICATE: 'certificate',
      REFERRAL: 'referral',
      OTHER: 'prescription',
    }

    const content = await generateDocument({
      type: typeMap[body.type] || 'prescription',
      patientName: patient.name,
      patientAge: age,
      doctorName: user.name,
      doctorCRM: user.crm || undefined,
      clinicName: user.clinic.name,
      details: body.details,
    })

    return NextResponse.json({ content })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao gerar documento' }, { status: 500 })
  }
}
