import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { FinancialClient } from './FinancialClient'

export default async function FinancialPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'ADMIN') redirect('/dashboard')

  const clinic = await prisma.clinic.findUnique({
    where: { id: session.clinicId },
    select: { name: true, clinicType: true },
  })

  return (
    <div className="flex-1 overflow-y-auto">
      <FinancialClient
        clinicName={clinic?.name ?? ''}
        clinicType={clinic?.clinicType ?? null}
      />
    </div>
  )
}
