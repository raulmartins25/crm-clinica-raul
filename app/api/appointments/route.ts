import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await requireSession()
  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId: session.clinicId,
      ...(start && end
        ? { startTime: { gte: new Date(start), lte: new Date(end) } }
        : {}),
    },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      doctor: { select: { id: true, name: true } },
    },
    orderBy: { startTime: 'asc' },
  })

  return NextResponse.json({ appointments })
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  const body = await req.json()

  const appointment = await prisma.appointment.create({
    data: {
      clinicId: session.clinicId,
      patientId: body.patientId,
      doctorId: body.doctorId || session.id,
      title: body.title,
      description: body.description || null,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      status: 'SCHEDULED',
      type: body.type || null,
      room: body.room || null,
      price: body.price ? Number(body.price) : null,
      notes: body.notes || null,
    },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      doctor: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ appointment }, { status: 201 })
}
