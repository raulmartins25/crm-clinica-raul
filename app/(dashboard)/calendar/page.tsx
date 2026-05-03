import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CalendarClient } from './CalendarClient'

export default async function CalendarPage() {
  const session = await getSession()

  const doctors = await prisma.user.findMany({
    where: { clinicId: session!.clinicId, active: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  })

  const patients = await prisma.patient.findMany({
    where: { clinicId: session!.clinicId, active: true },
    select: { id: true, name: true, phone: true },
    orderBy: { name: 'asc' },
    take: 200,
  })

  return <CalendarClient doctors={doctors} patients={patients} session={session!} />
}
