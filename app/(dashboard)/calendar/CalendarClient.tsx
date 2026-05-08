'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import ptBRLocale from '@fullcalendar/core/locales/pt-br'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { X, Plus, Loader2, Calendar, Clock, User, Stethoscope, RotateCcw, DollarSign, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCalendarConfig } from '@/lib/calendarConfig'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ScheduleDay {
  dayOfWeek: number
  startTime: string
  endTime: string
  active: boolean
}

interface Doctor {
  id: string
  name: string
  role: string
  color: string | null
  roomDefault: string | null
  schedule: ScheduleDay[]
}

interface Patient { id: string; name: string; phone: string }
interface Appointment {
  id: string; title: string; startTime: string; endTime: string; status: string
  description: string | null; notes: string | null; room: string | null; price: number | null
  isReturn: boolean; parentId: string | null; recurrence: string | null
  patient: { id: string; name: string; phone: string }
  doctor: { id: string; name: string }
}
interface SessionUser { id: string; clinicId: string; name: string; role: string }

// ── Constants ──────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#3b82f6', '#22c55e', '#8b5cf6', '#ec4899',
  '#f97316', '#06b6d4', '#ef4444', '#eab308',
]

function getDoctorColor(doctor: Doctor): string {
  if (doctor.color) return doctor.color
  const sum = doctor.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return PRESET_COLORS[sum % PRESET_COLORS.length]
}

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Agendado', CONFIRMED: 'Confirmado', IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluído', CANCELLED: 'Cancelado', NO_SHOW: 'Faltou',
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CalendarClient({
  doctors, patients, session, clinicType,
}: {
  doctors: Doctor[]
  patients: Patient[]
  session: SessionUser
  clinicType?: string | null
}) {
  const config = getCalendarConfig(clinicType)
  const router = useRouter()
  const calendarRef = useRef<FullCalendar>(null)

  // ── Professional filter state ─────────────────────────────────────────────
  const initialFilter = session.role === 'DOCTOR' ? session.id : 'ALL'
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(initialFilter)

  const [showModal, setShowModal] = useState(false)
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null)
  const [saving, setSaving] = useState(false)
  const [isReturnMode, setIsReturnMode] = useState(false)
  const [aptPayment, setAptPayment] = useState<{ id: string } | null | undefined>(undefined)
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)
  const [form, setForm] = useState({
    patientId: '', doctorId: session.id, title: '', type: '',
    startTime: '', endTime: '', room: '', price: '', notes: '', description: '',
    recurrence: 'NONE', recurrenceEnd: '',
    isReturn: false as boolean, parentId: '',
  })

  // ── Conflict check ────────────────────────────────────────────────────────

  const checkConflict = useCallback(async (doctorId: string, start: string, end: string, excludeId?: string) => {
    if (!doctorId || !start || !end) return
    try {
      const url = `/api/appointments/conflicts?doctorId=${doctorId}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}${excludeId ? `&excludeId=${excludeId}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.hasConflict && data.conflictingAppointment) {
        const c = data.conflictingAppointment
        const startFmt = format(new Date(c.startTime), 'HH:mm')
        const endFmt = format(new Date(c.endTime), 'HH:mm')
        setConflictWarning(`Atenção: este profissional já possui um agendamento neste horário (${c.title} — ${startFmt} às ${endFmt}).`)
      } else {
        setConflictWarning(null)
      }
    } catch { /* silent */ }
  }, [])

  // ── Business hours for selected professional ───────────────────────────────

  const getBusinessHours = useCallback(() => {
    if (selectedDoctorId === 'ALL') return config.businessHours

    const doctor = doctors.find(d => d.id === selectedDoctorId)
    if (!doctor || doctor.schedule.length === 0) return config.businessHours

    const activeDays = doctor.schedule.filter(s => s.active)
    if (activeDays.length === 0) return config.businessHours

    return activeDays.map(s => ({
      daysOfWeek: [s.dayOfWeek],
      startTime: s.startTime,
      endTime: s.endTime,
    }))
  }, [selectedDoctorId, doctors, config.businessHours])

  // ── Helpers ──────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    const defaultDoctorId = selectedDoctorId !== 'ALL' ? selectedDoctorId : session.id
    setForm({
      patientId: '', doctorId: defaultDoctorId, title: '', type: '',
      startTime: '', endTime: '', room: '', price: '', notes: '', description: '',
      recurrence: 'NONE', recurrenceEnd: '', isReturn: false, parentId: '',
    })
    setIsReturnMode(false)
    setConflictWarning(null)
  }, [session.id, selectedDoctorId])

  const closeModal = useCallback(() => {
    setShowModal(false)
    setSelectedApt(null)
    resetForm()
  }, [resetForm])

  // ── Type selection ────────────────────────────────────────────────────────

  const handleTypeSelect = useCallback((typeLabel: string) => {
    const typeInfo = config.appointmentTypes.find(t => t.label === typeLabel)
    if (!typeInfo) {
      setForm(p => ({ ...p, type: typeLabel, title: typeLabel }))
      return
    }
    setForm(p => {
      const priceStr = typeInfo.price != null ? String(typeInfo.price) : p.price
      if (!p.startTime) {
        return { ...p, type: typeLabel, title: typeLabel, price: priceStr }
      }
      const start = new Date(p.startTime)
      const end = new Date(start.getTime() + typeInfo.duration * 60_000)
      return {
        ...p, type: typeLabel, title: typeLabel,
        endTime: format(end, "yyyy-MM-dd'T'HH:mm"),
        price: priceStr,
      }
    })
  }, [config.appointmentTypes])

  // ── Calendar event handlers ───────────────────────────────────────────────

  const fetchEvents = useCallback(async (info: { startStr: string; endStr: string }) => {
    const doctorParam = selectedDoctorId !== 'ALL' ? `&doctorId=${selectedDoctorId}` : ''
    const res = await fetch(`/api/appointments?start=${info.startStr}&end=${info.endStr}${doctorParam}`)
    const data = await res.json()
    return (data.appointments as Appointment[]).map(a => {
      const doctor = doctors.find(d => d.id === a.doctor.id)
      const baseColor = doctor ? getDoctorColor(doctor) : '#3b82f6'
      const isCancelled = a.status === 'CANCELLED'
      const isNoShow = a.status === 'NO_SHOW'
      const isCompleted = a.status === 'COMPLETED'

      return {
        id: a.id,
        title: a.patient.name,
        start: a.startTime,
        end: a.endTime,
        backgroundColor: isCancelled || isNoShow ? '#9ca3af' : baseColor,
        borderColor: isCancelled || isNoShow ? '#6b7280' : baseColor,
        classNames: [
          isCancelled ? 'apt-cancelled' : '',
          isCompleted ? 'apt-completed' : '',
        ].filter(Boolean),
        extendedProps: { appointment: a, doctorColor: baseColor },
      }
    })
  }, [selectedDoctorId, doctors])

  const handleFilterChange = (doctorId: string) => {
    setSelectedDoctorId(doctorId)
    setTimeout(() => calendarRef.current?.getApi().refetchEvents(), 50)
  }

  const handleDateSelect = (info: { startStr: string; endStr: string }) => {
    const hasTime = info.startStr.includes('T')
    const start = hasTime ? info.startStr.slice(0, 16) : `${info.startStr}T09:00`
    let end: string
    if (hasTime) {
      const dragMs = new Date(info.endStr).getTime() - new Date(info.startStr).getTime()
      const minMs = config.defaultDuration * 60_000
      const effectiveMs = Math.max(dragMs, minMs)
      end = format(new Date(new Date(start).getTime() + effectiveMs), "yyyy-MM-dd'T'HH:mm")
    } else {
      end = format(
        new Date(new Date(start).getTime() + config.defaultDuration * 60_000),
        "yyyy-MM-dd'T'HH:mm",
      )
    }
    resetForm()
    const defaultDoctorId = selectedDoctorId !== 'ALL' ? selectedDoctorId : session.id
    setForm(p => ({ ...p, startTime: start, endTime: end, doctorId: defaultDoctorId }))
    setSelectedApt(null)
    setShowModal(true)
    checkConflict(defaultDoctorId, start, end)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEventClick = (info: any) => {
    const apt = info.event.extendedProps.appointment
    setSelectedApt(apt)
    setIsReturnMode(false)
    setAptPayment(undefined)
    setConflictWarning(null)
    setForm({
      patientId: apt.patient.id, doctorId: apt.doctor.id,
      title: apt.title, type: apt.title,
      startTime: apt.startTime.slice(0, 16), endTime: apt.endTime.slice(0, 16),
      room: apt.room || '', price: apt.price?.toString() || '',
      notes: apt.notes || '', description: apt.description || '',
      recurrence: apt.recurrence || 'NONE', recurrenceEnd: '',
      isReturn: apt.isReturn, parentId: apt.parentId || '',
    })
    setShowModal(true)
    if (apt.status === 'COMPLETED' && apt.price != null) {
      fetch(`/api/financial?appointmentId=${apt.id}&page=1`)
        .then(r => r.json())
        .then(d => setAptPayment(d.payments?.[0] ?? null))
        .catch(() => setAptPayment(null))
    }
  }

  const handleCreatePaymentFromCalendar = async () => {
    if (!selectedApt) return
    setSaving(true)
    try {
      const res = await fetch('/api/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedApt.patient.id,
          appointmentId: selectedApt.id,
          amount: selectedApt.price,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Pagamento criado! Redirecionando...')
      closeModal()
      router.push('/financial')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar pagamento')
    } finally { setSaving(false) }
  }

  // ── Return appointment ────────────────────────────────────────────────────

  const handleScheduleReturn = (apt: Appointment) => {
    const returnType =
      config.appointmentTypes.find(t => t.label.includes('Retorno')) ??
      config.appointmentTypes[0]
    setSelectedApt(null)
    setIsReturnMode(true)
    setConflictWarning(null)
    setForm({
      patientId: apt.patient.id, doctorId: apt.doctor.id,
      title: returnType.label, type: returnType.label,
      startTime: '', endTime: '',
      room: '', price: returnType.price?.toString() ?? '',
      notes: '', description: '',
      recurrence: 'NONE', recurrenceEnd: '',
      isReturn: true, parentId: apt.id,
    })
    setShowModal(true)
  }

  const applyReturnInterval = (days: number) => {
    const typeInfo =
      config.appointmentTypes.find(t => t.label === form.type) ??
      config.appointmentTypes.find(t => t.label.includes('Retorno')) ??
      config.appointmentTypes[0]
    const start = new Date()
    start.setDate(start.getDate() + days)
    start.setHours(9, 0, 0, 0)
    const end = new Date(start.getTime() + typeInfo.duration * 60_000)
    const startStr = format(start, "yyyy-MM-dd'T'HH:mm")
    const endStr = format(end, "yyyy-MM-dd'T'HH:mm")
    setForm(p => ({ ...p, startTime: startStr, endTime: endStr }))
    checkConflict(form.doctorId, startStr, endStr)
  }

  // ── Save / status ─────────────────────────────────────────────────────────

  const saveAppointment = async () => {
    if (!form.patientId) return toast.error('Selecione um paciente')
    if (!form.startTime || !form.endTime) return toast.error('Informe o horário')
    setSaving(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          title: form.title || form.type || 'Consulta',
          price: form.price || undefined,
          recurrenceEnd: form.recurrenceEnd || undefined,
          parentId: form.parentId || undefined,
        }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      toast.success(isReturnMode ? 'Retorno agendado!' : 'Consulta agendada!')
      closeModal()
      calendarRef.current?.getApi().refetchEvents()
    } catch {
      toast.error('Erro ao agendar')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    toast.success('Status atualizado')
    closeModal()
    calendarRef.current?.getApi().refetchEvents()
  }

  // ── Selected type color ───────────────────────────────────────────────────

  const selectedTypeColor = config.appointmentTypes.find(t => t.label === form.type)?.color
  const businessHours = getBusinessHours()

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie consultas e agendamentos</p>
        </div>
        <button
          onClick={() => { resetForm(); setSelectedApt(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </button>
      </div>

      {/* Professional filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => handleFilterChange('ALL')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium border transition',
            selectedDoctorId === 'ALL'
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400',
          )}
        >
          Todos
        </button>
        {doctors.filter(d => ['DOCTOR', 'NURSE', 'ASSISTANT'].includes(d.role)).map(d => {
          const color = getDoctorColor(d)
          const isSelected = selectedDoctorId === d.id
          return (
            <button
              key={d.id}
              onClick={() => handleFilterChange(d.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition',
                isSelected ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
              )}
              style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              {d.name.split(' ')[0]}
            </button>
          )
        })}
      </div>

      {/* Calendar */}
      <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden p-4">
        <style>{`
          .fc { height: 100%; }
          .fc-toolbar-title { font-size: 1.1rem; font-weight: 600; color: #111827; }
          .fc-button { border-radius: 8px !important; font-size: 0.8rem !important; padding: 4px 12px !important; }
          .fc-button-primary { background: #0ea5e9 !important; border-color: #0ea5e9 !important; }
          .fc-button-primary:hover { background: #0284c7 !important; }
          .fc-event { border-radius: 6px !important; padding: 1px 3px !important; }
          .fc-daygrid-event-dot { display: none; }
          .fc-timegrid-slot { height: 2.5rem !important; }
          .fc-col-header-cell { background: #f8fafc; font-weight: 600; font-size: 0.8rem; }
          .fc-day-today .fc-daygrid-day-number { background: #0ea5e9; color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; }
          .fc-non-business { background: rgba(0,0,0,0.025) !important; }
          .apt-cancelled { opacity: 0.65; border-style: dashed !important; }
          .apt-completed { opacity: 0.8; }
        `}</style>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={ptBRLocale}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          selectable
          selectMirror
          dayMaxEvents
          weekends
          events={fetchEvents}
          select={handleDateSelect}
          eventClick={handleEventClick}
          slotDuration={config.slotDuration}
          slotMinTime={config.businessHours.startTime + ':00'}
          slotMaxTime={config.businessHours.endTime + ':00'}
          businessHours={businessHours}
          allDaySlot={false}
          height="100%"
          eventContent={(arg) => {
            const apt = arg.event.extendedProps.appointment as Appointment | undefined
            const isCompleted = apt?.status === 'COMPLETED'
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '1px 3px', overflow: 'hidden', height: '100%' }}>
                {apt?.isReturn && (
                  <RotateCcw size={9} style={{ flexShrink: 0, opacity: 0.85 }} />
                )}
                {isCompleted && (
                  <span style={{ fontSize: '0.6rem', opacity: 0.9 }}>✓</span>
                )}
                <span style={{ fontSize: '0.73rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {arg.event.title}
                </span>
              </div>
            )
          }}
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                {isReturnMode && <RotateCcw className="w-4 h-4 text-green-500" />}
                {isReturnMode
                  ? 'Agendar Retorno'
                  : selectedApt
                  ? 'Detalhes da Consulta'
                  : 'Novo Agendamento'}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Conflict warning */}
              {conflictWarning && (
                <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2.5 text-sm text-yellow-800">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-500" />
                  {conflictWarning}
                </div>
              )}

              {/* ── View mode ── */}
              {selectedApt && !isReturnMode && (
                <>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {Object.entries(STATUS_LABELS).map(([s, label]) => {
                      const doctor = doctors.find(d => d.id === selectedApt.doctor.id)
                      const color = doctor ? getDoctorColor(doctor) : '#3b82f6'
                      return (
                        <button
                          key={s}
                          onClick={() => updateStatus(selectedApt.id, s)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium transition border',
                            selectedApt.status === s
                              ? 'text-white border-transparent'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400',
                          )}
                          style={selectedApt.status === s ? { backgroundColor: color } : {}}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="space-y-3 text-sm text-gray-700">
                    {selectedApt.isReturn && (
                      <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium bg-green-50 rounded-lg px-3 py-1.5">
                        <RotateCcw className="w-3.5 h-3.5" />
                        Consulta de retorno
                      </div>
                    )}
                    <p><strong>Paciente:</strong> {selectedApt.patient.name}</p>
                    <p><strong>{config.professionalLabel}:</strong> {selectedApt.doctor.name}</p>
                    <p><strong>Tipo:</strong> {selectedApt.title}</p>
                    <p><strong>Início:</strong> {format(new Date(selectedApt.startTime), "dd/MM/yyyy 'às' HH:mm")}</p>
                    <p><strong>Fim:</strong> {format(new Date(selectedApt.endTime), "dd/MM/yyyy 'às' HH:mm")}</p>
                    {selectedApt.room && <p><strong>Sala:</strong> {selectedApt.room}</p>}
                    {selectedApt.price != null && <p><strong>Valor:</strong> R$ {selectedApt.price.toFixed(2)}</p>}
                    {selectedApt.notes && <p><strong>Obs:</strong> {selectedApt.notes}</p>}
                  </div>

                  {selectedApt.status === 'COMPLETED' && (
                    <div className="border-t border-gray-100 pt-4 space-y-2">
                      <button
                        onClick={() => handleScheduleReturn(selectedApt)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition border border-green-200"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Agendar Retorno
                      </button>
                      {selectedApt.price != null && aptPayment === null && (
                        <button
                          onClick={handleCreatePaymentFromCalendar}
                          disabled={saving}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition border border-emerald-200 disabled:opacity-60"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                          💰 Registrar Pagamento
                        </button>
                      )}
                      {selectedApt.price != null && aptPayment === undefined && (
                        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 py-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Verificando pagamento...
                        </div>
                      )}
                      {aptPayment && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                          <DollarSign className="w-3.5 h-3.5" />
                          Pagamento já registrado
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ── Create / Return mode ── */}
              {!selectedApt && (
                <>
                  {/* Patient */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      <User className="w-4 h-4 inline mr-1" />
                      Paciente <span className="text-red-500">*</span>
                    </label>
                    {isReturnMode && form.patientId ? (
                      <div className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                        {patients.find(p => p.id === form.patientId)?.name ?? form.patientId}
                      </div>
                    ) : (
                      <select
                        value={form.patientId}
                        onChange={e => setForm(p => ({ ...p, patientId: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="">Selecione o paciente</option>
                        {patients.map(pt => (
                          <option key={pt.id} value={pt.id}>{pt.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Professional */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      <Stethoscope className="w-4 h-4 inline mr-1" />
                      {config.professionalLabel}
                    </label>
                    <select
                      value={form.doctorId}
                      onChange={e => {
                        const newDoctorId = e.target.value
                        setForm(p => ({ ...p, doctorId: newDoctorId }))
                        if (form.startTime && form.endTime) {
                          checkConflict(newDoctorId, form.startTime, form.endTime)
                        }
                      }}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Appointment type */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Tipo de consulta
                    </label>
                    <div className="flex items-center gap-2">
                      {selectedTypeColor && (
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedTypeColor }} />
                      )}
                      <select
                        value={form.type}
                        onChange={e => handleTypeSelect(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="">— selecione —</option>
                        {config.appointmentTypes.map(t => (
                          <option key={t.label} value={t.label}>
                            {t.label} ({t.duration} min)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Return interval presets */}
                  {isReturnMode && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                        <Clock className="w-4 h-4 inline mr-1 text-green-500" />
                        Agendar em
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {config.returnIntervals.map(ri => (
                          <button
                            key={ri.days}
                            type="button"
                            onClick={() => applyReturnInterval(ri.days)}
                            className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 hover:border-sky-400 hover:text-sky-600 transition-colors"
                          >
                            {ri.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Clique para calcular a data automaticamente</p>
                    </div>
                  )}

                  {/* Times */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                        <Clock className="w-3.5 h-3.5 inline mr-1" />Início
                      </label>
                      <input
                        type="datetime-local"
                        value={form.startTime}
                        onChange={e => {
                          const start = e.target.value
                          setForm(p => {
                            if (!p.type) return { ...p, startTime: start }
                            const typeInfo = config.appointmentTypes.find(t => t.label === p.type)
                            if (!typeInfo || !start) return { ...p, startTime: start }
                            const end = format(
                              new Date(new Date(start).getTime() + typeInfo.duration * 60_000),
                              "yyyy-MM-dd'T'HH:mm",
                            )
                            checkConflict(p.doctorId, start, end)
                            return { ...p, startTime: start, endTime: end }
                          })
                        }}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Fim</label>
                      <input
                        type="datetime-local"
                        value={form.endTime}
                        onChange={e => {
                          const end = e.target.value
                          setForm(p => ({ ...p, endTime: end }))
                          checkConflict(form.doctorId, form.startTime, end)
                        }}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* Room / Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Sala</label>
                      <input
                        value={form.room}
                        onChange={e => setForm(p => ({ ...p, room: e.target.value }))}
                        placeholder={doctors.find(d => d.id === form.doctorId)?.roomDefault || 'ex: Sala 1'}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Valor (R$)</label>
                      <input
                        value={form.price}
                        onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                        placeholder="0,00"
                        type="number"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Observações</label>
                    <textarea
                      value={form.notes}
                      onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                      rows={2}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {!selectedApt && (
              <div className="flex gap-3 justify-end px-6 pb-6">
                <button
                  onClick={closeModal}
                  className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveAppointment}
                  disabled={saving}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-60',
                    isReturnMode
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-sky-500 hover:bg-sky-600 text-white',
                  )}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isReturnMode ? <RotateCcw className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                  {isReturnMode ? 'Agendar Retorno' : 'Agendar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
