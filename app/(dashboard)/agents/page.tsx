import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AgentsClient } from './AgentsClient'

export default async function AgentsPage() {
  const session = await getSession()

  const clinic = await prisma.clinic.findUnique({
    where: { id: session!.clinicId },
    select: { name: true, specialty: true, phone: true, address: true },
  })

  const doctors = await prisma.user.findMany({
    where: { clinicId: session!.clinicId, active: true, role: 'DOCTOR' },
    select: { name: true },
  })

  return (
    <AgentsClient
      clinic={clinic!}
      doctorNames={doctors.map(d => d.name)}
    />
  )
}
