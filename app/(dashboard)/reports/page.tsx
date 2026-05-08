import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ReportsClient } from './ReportsClient'

export default async function ReportsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!['ADMIN', 'DOCTOR'].includes(session.role)) redirect('/dashboard')

  return (
    <div className="flex-1 overflow-y-auto">
      <ReportsClient />
    </div>
  )
}
