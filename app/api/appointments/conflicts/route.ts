import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await requireSession()
  const { searchParams } = new URL(req.url)
  const doctorId = searchParams.get('doctorId')
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const excludeId = searchParams.get('excludeId')

  if (!doctorId || !start || !end) {
    return NextResponse.json({ error: 'doctorId, start e end são obrigatórios' }, { status: 400 })
  }

  const startTime = new Date(start)
  const endTime = new Date(end)

  const conflict = await prisma.appointment.findFirst({
    where: {
      clinicId: session.clinicId,
      doctorId,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [
        { startTime: { gte: startTime, lt: endTime } },
        { endTime: { gt: startTime, lte: endTime } },
        { startTime: { lte: startTime }, endTime: { gte: endTime } },
      ],
    },
    select: { id: true, title: true, startTime: true, endTime: true },
  })

  if (!conflict) {
    return NextResponse.json({ hasConflict: false })
  }

  return NextResponse.json({
    hasConflict: true,
    conflictingAppointment: {
      title: conflict.title,
      startTime: conflict.startTime,
      endTime: conflict.endTime,
    },
  })
}
