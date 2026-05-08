import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await requireSession()

  const professionals = await prisma.user.findMany({
    where: {
      clinicId: session.clinicId,
      role: { in: ['DOCTOR', 'NURSE', 'ASSISTANT'] },
      active: true,
    },
    select: {
      id: true,
      name: true,
      role: true,
      crm: true,
      specialty: true,
      color: true,
      roomDefault: true,
      schedule: {
        select: { id: true, dayOfWeek: true, startTime: true, endTime: true, active: true },
        orderBy: { dayOfWeek: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ professionals })
}
