import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CalendarClient } from './CalendarClient'

export default async function CalendarPage() {
  const session = await getSession()

  const [doctors, patients, clinic] = await Promise.all([
    prisma.user.findMany({
      where: { clinicId: session!.clinicId, active: true },
      select: {
        id: true,
        name: true,
        role: true,
        color: true,
        roomDefault: true,
        schedule: {
          select: { dayOfWeek: true, startTime: true, endTime: true, active: true },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.patient.findMany({
      where: { clinicId: session!.clinicId, active: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: 'asc' },
      take: 200,
    }),
    prisma.clinic.findUnique({
      where: { id: session!.clinicId },
      select: { clinicType: true },
    }),
  ])

  return (
    <CalendarClient
      doctors={doctors}
      patients={patients}
      session={session!}
      clinicType={clinic?.clinicType ?? null}
    />
  )
}
