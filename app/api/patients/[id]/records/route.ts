import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession()
  const { id } = await params

  const records = await prisma.medicalRecord.findMany({
    where: { patientId: id },
    include: { doctor: { select: { name: true, crm: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ records })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  const { id } = await params
  const body = await req.json()

  const record = await prisma.medicalRecord.create({
    data: {
      patientId: id,
      doctorId: body.doctorId || session.id,
      appointmentId: body.appointmentId || null,
      chiefComplaint: body.chiefComplaint || null,
      anamnesis: body.anamnesis || null,
      physicalExam: body.physicalExam || null,
      diagnosis: body.diagnosis || null,
      icdCode: body.icdCode || null,
      treatment: body.treatment || null,
      observations: body.observations || null,
      bloodPressure: body.bloodPressure || null,
      heartRate: body.heartRate ? Number(body.heartRate) : null,
      temperature: body.temperature ? Number(body.temperature) : null,
      weight: body.weight ? Number(body.weight) : null,
      height: body.height ? Number(body.height) : null,
      oxygenSat: body.oxygenSat ? Number(body.oxygenSat) : null,
    },
    include: { doctor: { select: { name: true, crm: true } } },
  })

  return NextResponse.json({ record }, { status: 201 })
}
