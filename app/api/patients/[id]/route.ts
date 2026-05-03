import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  const { id } = await params

  const patient = await prisma.patient.findFirst({
    where: { id, clinicId: session.clinicId },
    include: {
      appointments: {
        include: { doctor: { select: { name: true } } },
        orderBy: { startTime: 'desc' },
        take: 10,
      },
      medicalRecords: {
        include: { doctor: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      documents: {
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      conversations: {
        orderBy: { lastMessageAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!patient) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
  return NextResponse.json({ patient })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  const { id } = await params
  const body = await req.json()

  const patient = await prisma.patient.updateMany({
    where: { id, clinicId: session.clinicId },
    data: {
      name: body.name,
      cpf: body.cpf || null,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      gender: body.gender || null,
      phone: body.phone,
      phone2: body.phone2 || null,
      email: body.email || null,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      zipCode: body.zipCode || null,
      bloodType: body.bloodType || null,
      allergies: body.allergies || null,
      observations: body.observations || null,
    },
  })

  return NextResponse.json({ updated: patient.count > 0 })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  const { id } = await params

  await prisma.patient.updateMany({
    where: { id, clinicId: session.clinicId },
    data: { active: false },
  })

  return NextResponse.json({ ok: true })
}
