'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  DollarSign, Plus, Search, Loader2, X, ChevronLeft, ChevronRight,
  Receipt, Ban, CreditCard, TrendingUp, Clock, CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Payment {
  id: string
  amount: number
  amountPaid: number
  discount: number
  method: string
  status: string
  dueDate: string | null
  paidAt: string | null
  notes: string | null
  receiptSent: boolean
  createdAt: string
  patient: { id: string; name: string }
  appointment: { id: string; title: string; startTime: string } | null
  createdBy: { id: string; name: string }
}

interface Summary {
  received: number
  pending: number
  count: number
  avgTicket: number
  availableAppointments: {
    id: string; title: string; startTime: string; price: number | null
    patient: { id: string; name: string }
  }[]
}

interface Patient { id: string; name: string }

// ── Constants ─────────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  PIX: 'PIX',
  BANK_TRANSFER: 'Transferência',
  HEALTH_INSURANCE: 'Convênio',
  OTHER: 'Outro',
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PAID:      { label: 'Pago',      cls: 'bg-green-100 text-green-700' },
  PENDING:   { label: 'Pendente',  cls: 'bg-yellow-100 text-yellow-700' },
  PARTIAL:   { label: 'Parcial',   cls: 'bg-blue-100 text-blue-700' },
  CANCELLED: { label: 'Cancelado', cls: 'bg-red-100 text-red-700' },
  REFUNDED:  { label: 'Estornado', cls: 'bg-gray-100 text-gray-600' },
}

function fmtMoney(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

function fmtDate(s: string | null) {
  if (!s) return '-'
  return format(new Date(s), 'dd/MM/yyyy', { locale: ptBR })
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FinancialClient({
  clinicName,
  clinicType,
}: {
  clinicName: string
  clinicType?: string | null
}) {
  const consultLabel = clinicType === 'PSICOLOGIA' ? 'Sessão' : 'Consulta'

  // ── List state
  const [payments, setPayments] = useState<Payment[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // ── Filters
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMethod, setFilterMethod] = useState('')
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  // ── Pay modal
  const [payModal, setPayModal] = useState<Payment | null>(null)
  const [payForm, setPayForm] = useState({ amountPaid: '', method: 'PIX', discount: '', notes: '' })
  const [saving, setSaving] = useState(false)

  // ── New payment modal
  const [showNewModal, setShowNewModal] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [newForm, setNewForm] = useState({
    patientId: '', appointmentId: '', amount: '', method: 'PIX', dueDate: '',
  })

  // ── Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 500)
    return () => clearTimeout(t)
  }, [searchInput])

  // ── Fetch summary
  const fetchSummary = useCallback(async () => {
    const now = new Date()
    const res = await fetch(
      `/api/financial/summary?month=${now.getMonth() + 1}&year=${now.getFullYear()}`,
    )
    const data = await res.json()
    setSummary(data)
  }, [])

  // ── Fetch payments
  const fetchPayments = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (filterMethod) params.set('method', filterMethod)
    if (filterStart) params.set('start', filterStart)
    if (filterEnd) params.set('end', filterEnd)
    if (search) params.set('search', search)
    params.set('page', String(page))
    const res = await fetch(`/api/financial?${params}`)
    const data = await res.json()
    setPayments(data.payments || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [filterStatus, filterMethod, filterStart, filterEnd, search, page])

  useEffect(() => { fetchSummary(); fetchPayments() }, [fetchSummary, fetchPayments])

  // Load patients for new payment modal
  useEffect(() => {
    fetch('/api/patients?limit=500').then(r => r.json()).then(d => setPatients(d.patients || []))
  }, [])

  // ── Register payment
  const handleRegisterPayment = async () => {
    if (!payModal) return
    const addedAmount = parseFloat(payForm.amountPaid)
    if (isNaN(addedAmount) || addedAmount <= 0) return toast.error('Informe o valor pago')
    setSaving(true)
    try {
      const res = await fetch(`/api/financial/${payModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPaid: addedAmount,
          method: payForm.method,
          discount: payForm.discount ? parseFloat(payForm.discount) : 0,
          notes: payForm.notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Pagamento registrado!')
      setPayModal(null)
      fetchPayments()
      fetchSummary()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar pagamento')
    } finally { setSaving(false) }
  }

  // ── Cancel payment
  const handleCancel = async (id: string) => {
    const res = await fetch(`/api/financial/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    })
    if (res.ok) { toast.success('Pagamento cancelado'); fetchPayments(); fetchSummary() }
    else toast.error('Erro ao cancelar')
  }

  // ── View receipt
  const handleViewReceipt = async (p: Payment) => {
    try {
      const { generatePaymentReceipt } = await import('@/lib/pdfGenerator')
      await generatePaymentReceipt({
        id: p.id,
        clinicName,
        patient: { name: p.patient.name },
        appointment: p.appointment,
        amount: p.amount,
        amountPaid: p.amountPaid,
        discount: p.discount,
        method: p.method,
        paidAt: p.paidAt,
      })
    } catch { toast.error('Erro ao gerar recibo') }
  }

  // ── Create new payment
  const handleCreatePayment = async () => {
    const patientId = newForm.appointmentId
      ? summary?.availableAppointments.find(a => a.id === newForm.appointmentId)?.patient.id || newForm.patientId
      : newForm.patientId
    if (!patientId) return toast.error('Selecione um paciente')
    if (!newForm.amount || isNaN(parseFloat(newForm.amount))) return toast.error('Informe o valor')
    setSaving(true)
    try {
      const res = await fetch('/api/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          appointmentId: newForm.appointmentId || undefined,
          amount: parseFloat(newForm.amount),
          method: newForm.method,
          dueDate: newForm.dueDate || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Pagamento criado!')
      setShowNewModal(false)
      setNewForm({ patientId: '', appointmentId: '', amount: '', method: 'PIX', dueDate: '' })
      fetchPayments()
      fetchSummary()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar pagamento')
    } finally { setSaving(false) }
  }

  const openPayModal = (p: Payment) => {
    setPayModal(p)
    const remaining = p.amount - p.amountPaid
    setPayForm({
      amountPaid: remaining > 0 ? remaining.toFixed(2) : '',
      method: p.method,
      discount: p.discount > 0 ? p.discount.toFixed(2) : '',
      notes: p.notes || '',
    })
  }

  const totalPages = Math.ceil(total / 20)

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Financeiro</h1>
            <p className="text-sm text-gray-500">Gestão de pagamentos e recibos</p>
          </div>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Novo Pagamento
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
          label="Recebido no Mês"
          value={fmtMoney(summary?.received ?? 0)}
          bg="bg-emerald-50"
        />
        <KpiCard
          icon={<Clock className="w-5 h-5 text-yellow-500" />}
          label="Pendente"
          value={fmtMoney(summary?.pending ?? 0)}
          bg="bg-yellow-50"
        />
        <KpiCard
          icon={<CreditCard className="w-5 h-5 text-sky-500" />}
          label={`${consultLabel}s Faturadas`}
          value={String(summary?.count ?? 0)}
          bg="bg-sky-50"
        />
        <KpiCard
          icon={<TrendingUp className="w-5 h-5 text-purple-500" />}
          label="Ticket Médio"
          value={fmtMoney(summary?.avgTicket ?? 0)}
          bg="bg-purple-50"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Buscar por paciente..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={filterMethod}
          onChange={e => { setFilterMethod(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="">Todas as formas</option>
          {Object.entries(METHOD_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          type="date"
          value={filterStart}
          onChange={e => { setFilterStart(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <input
          type="date"
          value={filterEnd}
          onChange={e => { setFilterEnd(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {(filterStatus || filterMethod || filterStart || filterEnd || searchInput) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterMethod(''); setFilterStart(''); setFilterEnd(''); setSearchInput(''); setPage(1) }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" />Limpar
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Paciente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{consultLabel}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Valor</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Desconto</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Pago</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Forma</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-500 mx-auto" />
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Nenhum pagamento encontrado</p>
                  </td>
                </tr>
              ) : payments.map(p => {
                const sc = STATUS_CONFIG[p.status] ?? { label: p.status, cls: 'bg-gray-100 text-gray-600' }
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.patient.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.appointment ? p.appointment.title : <span className="text-gray-400 italic">Avulso</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 whitespace-nowrap">{fmtMoney(p.amount)}</td>
                    <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
                      {p.discount > 0 ? fmtMoney(p.discount) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                      {fmtMoney(p.amountPaid)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {METHOD_LABELS[p.method] || p.method}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', sc.cls)}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {(p.status === 'PENDING' || p.status === 'PARTIAL') && (
                          <button
                            onClick={() => openPayModal(p)}
                            className="px-2.5 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition whitespace-nowrap"
                          >
                            Registrar
                          </button>
                        )}
                        {p.status === 'PAID' && (
                          <button
                            onClick={() => handleViewReceipt(p)}
                            className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                            title="Ver Recibo"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                        )}
                        {p.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              if (confirm('Cancelar este pagamento?')) handleCancel(p.id)
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Cancelar"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {total} registro{total !== 1 ? 's' : ''} · Página {page} de {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Register Payment Modal ────────────────────────────────────────────── */}
      {payModal && (
        <Modal title="Registrar Pagamento" onClose={() => setPayModal(null)}>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
              <p><span className="text-gray-500">Paciente:</span> <strong>{payModal.patient.name}</strong></p>
              {payModal.appointment && (
                <p>
                  <span className="text-gray-500">{consultLabel}:</span>{' '}
                  {payModal.appointment.title} · {fmtDate(payModal.appointment.startTime)}
                </p>
              )}
              <p>
                <span className="text-gray-500">Valor total:</span>{' '}
                <strong>{fmtMoney(payModal.amount)}</strong>
                {payModal.amountPaid > 0 && (
                  <span className="text-gray-400 ml-2">
                    (já pago: {fmtMoney(payModal.amountPaid)})
                  </span>
                )}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Valor Pago Agora (R$) *</label>
              <input
                type="number"
                step="0.01"
                value={payForm.amountPaid}
                onChange={e => setPayForm(p => ({ ...p, amountPaid: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Forma de Pagamento</label>
              <select
                value={payForm.method}
                onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {Object.entries(METHOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Desconto (R$)</label>
              <input
                type="number"
                step="0.01"
                value={payForm.discount}
                onChange={e => setPayForm(p => ({ ...p, discount: e.target.value }))}
                placeholder="0,00"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Observações</label>
              <textarea
                value={payForm.notes}
                onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setPayModal(null)}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterPayment}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── New Payment Modal ─────────────────────────────────────────────────── */}
      {showNewModal && (
        <Modal title="Novo Pagamento" onClose={() => setShowNewModal(false)}>
          <div className="space-y-4">
            {/* Appointment select (available COMPLETED without payment) */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                {consultLabel} (opcional)
              </label>
              <select
                value={newForm.appointmentId}
                onChange={e => {
                  const aptId = e.target.value
                  const apt = summary?.availableAppointments.find(a => a.id === aptId)
                  setNewForm(p => ({
                    ...p,
                    appointmentId: aptId,
                    patientId: apt ? apt.patient.id : p.patientId,
                    amount: apt?.price != null ? String(apt.price) : p.amount,
                  }))
                }}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">— Pagamento avulso (sem consulta) —</option>
                {(summary?.availableAppointments ?? []).map(apt => (
                  <option key={apt.id} value={apt.id}>
                    {apt.patient.name} · {apt.title} · {fmtDate(apt.startTime)}
                    {apt.price != null ? ` · R$ ${apt.price.toFixed(2)}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Patient select — shown only when no appointment selected */}
            {!newForm.appointmentId && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Paciente *</label>
                <select
                  value={newForm.patientId}
                  onChange={e => setNewForm(p => ({ ...p, patientId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Selecione o paciente</option>
                  {patients.map(pt => (
                    <option key={pt.id} value={pt.id}>{pt.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Auto-filled patient display */}
            {newForm.appointmentId && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Paciente</label>
                <div className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                  {summary?.availableAppointments.find(a => a.id === newForm.appointmentId)?.patient.name ?? '-'}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newForm.amount}
                  onChange={e => setNewForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="0,00"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Vencimento</label>
                <input
                  type="date"
                  value={newForm.dueDate}
                  onChange={e => setNewForm(p => ({ ...p, dueDate: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Forma de Pagamento</label>
              <select
                value={newForm.method}
                onChange={e => setNewForm(p => ({ ...p, method: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {Object.entries(METHOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreatePayment}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Criar Pagamento
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, bg,
}: {
  icon: React.ReactNode; label: string; value: string; bg: string
}) {
  return (
    <div className={cn('rounded-xl p-4 border border-gray-100 bg-white')}>
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', bg)}>
        {icon}
      </div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function Modal({
  title, children, onClose,
}: {
  title: string; children: React.ReactNode; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
