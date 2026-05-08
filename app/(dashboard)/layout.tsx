import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const clinic = await prisma.clinic.findUnique({ where: { id: session.clinicId } })
  if (!clinic) redirect('/login')
  if (!clinic.onboardingCompleted) redirect('/onboarding')

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        user={{
          name: session.name,
          email: session.email,
          role: session.role,
          avatarUrl: session.avatarUrl,
        }}
        clinicName={clinic.name}
        clinicType={clinic.clinicType ?? null}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
