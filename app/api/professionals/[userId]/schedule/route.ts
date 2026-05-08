import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await requireSession()
  const { userId } = await params

  const professional = await prisma.user.findFirst({
    where: { id: userId, clinicId: session.clinicId },
    select: { id: true },
  })
  if (!professional) {
    return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
  }

  const schedule = await prisma.professionalSchedule.findMany({
    where: { userId, clinicId: session.clinicId },
    orderBy: { dayOfWeek: 'asc' },
  })

  return NextResponse.json({ schedule })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await requireSession()
  const { userId } = await params
  const body = await req.json()

  const professional = await prisma.user.findFirst({
    where: { id: userId, clinicId: session.clinicId },
    select: { id: true },
  })
  if (!professional) {
    return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
  }

  const { scheduleData, color, roomDefault } = body as {
    scheduleData: { dayOfWeek: number; startTime: string; endTime: string; active: boolean }[]
    color?: string | null
    roomDefault?: string | null
  }

  await Promise.all([
    // Upsert each day's schedule
    ...scheduleData.map(day =>
      prisma.professionalSchedule.upsert({
        where: { userId_dayOfWeek: { userId, dayOfWeek: day.dayOfWeek } },
        update: { startTime: day.startTime, endTime: day.endTime, active: day.active },
        create: { userId, clinicId: session.clinicId, ...day },
      }),
    ),
    // Update user color and roomDefault if provided
    (color !== undefined || roomDefault !== undefined)
      ? prisma.user.update({
          where: { id: userId },
          data: {
            ...(color !== undefined ? { color: color || null } : {}),
            ...(roomDefault !== undefined ? { roomDefault: roomDefault || null } : {}),
          },
        })
      : Promise.resolve(),
  ])

  return NextResponse.json({ success: true })
}
