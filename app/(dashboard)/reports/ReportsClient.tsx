'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { BarChart2, FileText, Download, Loader2, Calendar, Database } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'monthly' | 'patient' | 'export'

export function ReportsClient() {
  const [tab, setTab] = useState<Tab>('monthly')
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([])

  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const [patientId, setPatientId] = useState('')

  const [exportType, setExportType] = useState<'appointments' | 'patients'>('appointments')
  const [exportFrom, setExportFrom] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [exportTo, setExportTo] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    fetch('/api/patients?limit=500')
      .then(r => r.json())
      .then(d => setPatients(d.patients || []))
  }, [])

  const handleMonthlyReport = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/monthly?month=${month}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const { generateMonthlyReport } = await import('@/lib/pdfGenerator')
      await generateMonthlyReport(data)
      toast.success('PDF gerado com sucesso!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar relatório')
    } finally { setLoading(false) }
  }

  const handlePatientRecord = async () => {
    if (!patientId) return toast.error('Selecione um paciente')
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/patient-record?patientId=${patientId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const { generatePatientRecord } = await import('@/lib/pdfGenerator')
      await generatePatientRecord(data)
      toast.success('PDF gerado com sucesso!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar prontuário')
    } finally { setLoading(false) }
  }

  const handleExport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: exportType, from: exportFrom, to: exportTo })
      const res = await fetch(`/api/reports/export?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const { generateDataExport } = await import('@/lib/pdfGenerator')
      await generateDataExport(data)
      toast.success('PDF gerado com sucesso!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao exportar dados')
    } finally { setLoading(false) }
  }

  const tabs = [
    { id: 'monthly' as Tab, label: 'Relatório Mensal', icon: Calendar },
    { id: 'patient' as Tab, label: 'Prontuário do Paciente', icon: FileText },
    { id: 'export' as Tab, label: 'Exportar Dados', icon: Database },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
          <BarChart2 className="w-5 h-5 text-sky-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500">Gere e exporte relatórios em PDF</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center justify-center gap-2 flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition',
              tab === id ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {tab === 'monthly' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Relatório Mensal</h2>
              <p className="text-sm text-gray-500">
                Resumo de consultas por status, receita e novos pacientes do mês selecionado.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Mês de referência</label>
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <button
              onClick={handleMonthlyReport}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 disabled:opacity-60 transition"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Gerar PDF
            </button>
          </div>
        )}

        {tab === 'patient' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Prontuário do Paciente</h2>
              <p className="text-sm text-gray-500">
                Histórico completo de consultas e evoluções clínicas do paciente selecionado.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Paciente</label>
              <select
                value={patientId}
                onChange={e => setPatientId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Selecione o paciente</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handlePatientRecord}
              disabled={loading || !patientId}
              className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 disabled:opacity-60 transition"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Gerar PDF
            </button>
          </div>
        )}

        {tab === 'export' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Exportar Dados</h2>
              <p className="text-sm text-gray-500">
                Exporte dados de consultas ou pacientes em formato PDF por período.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo de dados</label>
              <div className="flex gap-3">
                {(['appointments', 'patients'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setExportType(t)}
                    className={cn(
                      'flex-1 py-2.5 rounded-lg border text-sm font-medium transition',
                      exportType === t
                        ? 'bg-sky-50 border-sky-300 text-sky-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {t === 'appointments' ? 'Consultas' : 'Pacientes'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">De</label>
                <input
                  type="date"
                  value={exportFrom}
                  onChange={e => setExportFrom(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Até</label>
                <input
                  type="date"
                  value={exportTo}
                  onChange={e => setExportTo(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 disabled:opacity-60 transition"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Exportar PDF
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
