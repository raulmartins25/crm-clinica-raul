import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PatientProfile } from './PatientProfile'

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  const { id } = await params

  const patient = await prisma.patient.findFirst({
    where: { id, clinicId: session!.clinicId },
    include: {
      appointments: {
        include: { doctor: { select: { name: true, crm: true } } },
        orderBy: { startTime: 'desc' },
        take: 10,
      },
      medicalRecords: {
        include: { doctor: { select: { name: true, crm: true } } },
        orderBy: { createdAt: 'desc' },
      },
      documents: {
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!patient) notFound()

  const [doctors, clinic] = await Promise.all([
    prisma.user.findMany({
      where: { clinicId: session!.clinicId, active: true, role: { in: ['DOCTOR', 'ADMIN'] } },
      select: { id: true, name: true, crm: true },
    }),
    prisma.clinic.findUnique({
      where: { id: session!.clinicId },
      select: { clinicType: true },
    }),
  ])

  return (
    <PatientProfile
      patient={JSON.parse(JSON.stringify(patient))}
      doctors={doctors}
      session={session!}
      clinicType={clinic?.clinicType ?? null}
    />
  )
}
