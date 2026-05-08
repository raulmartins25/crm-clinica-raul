import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await requireSession()
  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const doctorId = searchParams.get('doctorId')

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId: session.clinicId,
      ...(start && end
        ? { startTime: { gte: new Date(start), lte: new Date(end) } }
        : {}),
      ...(doctorId ? { doctorId } : {}),
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

  const startTime = new Date(body.startTime)
  const endTime = new Date(body.endTime)
  const durationMs = endTime.getTime() - startTime.getTime()

  const appointment = await prisma.appointment.create({
    data: {
      clinicId: session.clinicId,
      patientId: body.patientId,
      doctorId: body.doctorId || session.id,
      title: body.title || 'Consulta',
      description: body.description || null,
      startTime,
      endTime,
      status: 'SCHEDULED',
      type: body.type || null,
      room: body.room || null,
      price: body.price ? Number(body.price) : null,
      notes: body.notes || null,
      recurrence: body.recurrence || 'NONE',
      recurrenceEnd: body.recurrenceEnd ? new Date(body.recurrenceEnd) : null,
      parentId: body.parentId || null,
      isReturn: body.isReturn === true,
    },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      doctor: { select: { id: true, name: true } },
    },
  })

  // Generate recurring copies if requested
  const recurrence = body.recurrence as string | undefined
  if (recurrence && recurrence !== 'NONE' && body.recurrenceEnd) {
    const recurrenceEnd = new Date(body.recurrenceEnd)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const copies: any[] = []
    let current = new Date(startTime)
    let count = 0

    while (count < 52) {
      if (recurrence === 'WEEKLY') {
        current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000)
      } else if (recurrence === 'BIWEEKLY') {
        current = new Date(current.getTime() + 14 * 24 * 60 * 60 * 1000)
      } else {
        // MONTHLY — advance by one calendar month
        const next = new Date(current)
        next.setMonth(next.getMonth() + 1)
        current = next
      }

      if (current > recurrenceEnd) break

      const copyEnd = new Date(current.getTime() + durationMs)
      copies.push({
        clinicId: session.clinicId,
        patientId: body.patientId,
        doctorId: body.doctorId || session.id,
        title: body.title || 'Consulta',
        description: body.description || null,
        startTime: new Date(current),
        endTime: copyEnd,
        status: 'SCHEDULED',
        type: body.type || null,
        room: body.room || null,
        price: body.price ? Number(body.price) : null,
        notes: body.notes || null,
        recurrence: recurrence,
        recurrenceEnd,
        parentId: appointment.id,
        isReturn: false,
      })
      count++
    }

    if (copies.length > 0) {
      await prisma.appointment.createMany({ data: copies })
    }
  }

  return NextResponse.json({ appointment }, { status: 201 })
}
