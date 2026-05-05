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

  return <OnboardingClient clinic={clinic} />
}
