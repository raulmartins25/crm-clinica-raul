import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateDocument } from '@/lib/ai'

export async function GET(req: NextRequest) {
  const session = await requireSession()
  const { searchParams } = new URL(req.url)
  const patientId = searchParams.get('patientId')

  const documents = await prisma.document.findMany({
    where: {
      patient: { clinicId: session.clinicId },
      ...(patientId ? { patientId } : {}),
    },
    include: {
      patient: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ documents })
}

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

    let content = body.content

    // Use AI to generate if requested
    if (body.useAI && body.details) {
      const birthDate = patient.birthDate ? new Date(patient.birthDate) : null
      const age = birthDate
        ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000))
        : undefined

      content = await generateDocument({
        type: body.type || 'prescription',
        patientName: patient.name,
        patientAge: age,
        doctorName: user.name,
        doctorCRM: user.crm || undefined,
        clinicName: user.clinic.name,
        details: body.details,
      })
    }

    const document = await prisma.document.create({
      data: {
        patientId: body.patientId,
        createdById: session.id,
        type: body.type?.toUpperCase() || 'PRESCRIPTION',
        title: body.title || 'Documento',
        content,
        htmlContent: body.htmlContent || null,
      },
      include: {
        patient: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ document }, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar documento:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao criar documento' },
      { status: 500 }
    )
  }
}

