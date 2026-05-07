import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { getDashboardData, CLINIC_TYPE_LABELS } from '../../dashboard/_data'
import { DashboardView } from '../../dashboard/_view'

interface Props {
  searchParams: Promise<{ type?: string }>
}

export default async function AdminPreviewPage({ searchParams }: Props) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') redirect('/dashboard')

  const { type } = await searchParams
  const previewType = type ?? 'MEDICA'
  const clinicLabel = CLINIC_TYPE_LABELS[previewType] ?? previewType

  const data = await getDashboardData(session.clinicId, previewType)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Preview banner — sticky, z-index alto */}
      <div className="sticky top-0 z-50 flex-shrink-0 bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <Eye className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-900">
            Modo Preview —{' '}
            <span className="text-amber-700 font-bold">{clinicLabel}</span>
          </span>
          <span className="text-xs text-amber-500 ml-1">(dados reais da sua clínica, interface do nicho)</span>
        </div>
        <Link
          href="/admin"
          className="flex items-center gap-1.5 text-sm text-amber-700 hover:text-amber-900 font-medium transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao painel admin
        </Link>
      </div>

      {/* Dashboard content */}
      <div className="flex-1 overflow-y-auto">
        <DashboardView data={data} sessionName={session.name} />
      </div>
    </div>
  )
}
