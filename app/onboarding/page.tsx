import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { OnboardingClient } from './OnboardingClient'

export default async function OnboardingPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const clinic = await prisma.clinic.findUnique({ where: { id: session.clinicId } })
  if (!clinic) redirect('/login')
  if (clinic.onboardingCompleted) redirect('/dashboard')

  return <OnboardingClient clinic={{
    name: clinic.name,
    cnpj: clinic.cnpj ?? undefined,
    phone: clinic.phone ?? undefined,
    email: clinic.email ?? undefined,
    city: clinic.city ?? undefined,
    state: clinic.state ?? undefined,
    logoUrl: clinic.logoUrl ?? undefined,
    responsavelTecnico: clinic.responsavelTecnico ?? undefined,
    numeroConselho: clinic.numeroConselho ?? undefined,
  }} />
}
