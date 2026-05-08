import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProfessionalsClient } from './ProfessionalsClient'

export default async function ProfessionalsPage() {
  const session = await requireSession()

  if (session.role !== 'ADMIN') {
    redirect('/dashboard')
  }

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
        select: { dayOfWeek: true, startTime: true, endTime: true, active: true },
        orderBy: { dayOfWeek: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  return <ProfessionalsClient professionals={professionals} />
}
