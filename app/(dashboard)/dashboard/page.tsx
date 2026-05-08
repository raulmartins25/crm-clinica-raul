import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getDashboardData } from './_data'
import { DashboardView } from './_view'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) return null

  const clinic = await prisma.clinic.findUnique({
    where: { id: session.clinicId },
    select: { clinicType: true },
  })

  const data = await getDashboardData(session.clinicId, clinic?.clinicType ?? null)

  return <DashboardView data={data} sessionName={session.name} sessionRole={session.role} />
}
