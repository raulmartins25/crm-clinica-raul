'use client'

import { useState, useCallback, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import ptBRLocale from '@fullcalendar/core/locales/pt-br'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { X, Plus, Loader2, Calendar, Clock, User, Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Doctor { id: string; name: string; role: string }
interface Patient { id: string; name: string; phone: string }
interface Appointment {
  id: string; title: string; startTime: string; endTime: string; status: string
  description: string | null; notes: string | null; room: string | null; price: number | null
  patient: { id: string; name: string; phone: string }
  doctor: { id: string; name: string }
}
interface SessionUser { id: string; clinicId: string; name: string; role: string }

const statusColors: Record<string, string> = {
  SCHEDULED: '#3b82f6',
  CONFIRMED: '#22c55e',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#6b7280',
  CANCELLED: '#ef4444',
  NO_SHOW: '#f97316',
}

export function CalendarClient({ doctors, patients, session }: {
  doctors: Doctor[]; patients: Patient[]; session: SessionUser
}) {
  const calendarRef = useRef<FullCalendar>(null)
  const [events, setEvents] = useState<Appointment[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    patientId: '', doctorId: session.id, title: 'Consulta',
    startTime: '', endTime: '', type: '', room: '', price: '', notes: '', description: '',
  })

  const fetchEvents = useCallback(async (info: { startStr: string; endStr: string }) => {
    const res = await fetch(`/api/appointments?start=${info.startStr}&end=${info.endStr}`)
    const data = await res.json()
    setEvents(data.appointments)
    return data.appointments.map((a: Appointment) => ({
      id: a.id,
      title: `${a.patient.name}`,
      start: a.startTime,
      end: a.endTime,
      backgroundColor: statusColors[a.status] || '#3b82f6',
      borderColor: statusColors[a.status] || '#3b82f6',
      extendedProps: { appointment: a },
    }))
  }, [])

  const handleDateSelect = (info: { startStr: string; endStr: string }) => {
    const start = info.startStr.includes('T')
      ? info.startStr.slice(0, 16)
      : `${info.startStr}T09:00`
    const end = info.startStr.includes('T')
      ? info.endStr.slice(0, 16)
      : `${info.startStr}T10:00`
    setForm(p => ({ ...p, startTime: start, endTime: end }))
    setSelectedApt(null)
    setShowModal(true)
  }

  const handleEventClick = (info: any) => {
    const apt = info.event.extendedProps.appointment as Appointment
    setSelectedApt(apt)
    setForm({
      patientId: apt.patient.id,
      doctorId: apt.doctor.id,
      title: apt.title,
      startTime: apt.startTime.slice(0, 16),
      endTime: apt.endTime.slice(0, 16),
      type: '',
      room: apt.room || '',
      price: apt.price?.toString() || '',
      notes: apt.notes || '',
      description: apt.description || '',
    })
    setShowModal(true)
  }

  const saveAppointment = async () => {
    if (!form.patientId) return toast.error('Selecione um paciente')
    if (!form.startTime || !form.endTime) return toast.error('Informe o horário')
    setSaving(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      toast.success('Consulta agendada!')
      setShowModal(false)
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
    setShowModal(false)
    calendarRef.current?.getApi().refetchEvents()
  }

  const statusLabels: Record<string, string> = {
    SCHEDULED: 'Agendado', CONFIRMED: 'Confirmado', IN_PROGRESS: 'Em Andamento',
    COMPLETED: 'Concluído', CANCELLED: 'Cancelado', NO_SHOW: 'Faltou',
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie consultas e agendamentos</p>
        </div>
        <button
          onClick={() => { setSelectedApt(null); setForm(p => ({ ...p, startTime: '', endTime: '' })); setShowModal(true) }}
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            {statusLabels[status]}
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden p-4">
        <style>{`
          .fc { height: 100%; }
          .fc-toolbar-title { font-size: 1.1rem; font-weight: 600; color: #111827; }
          .fc-button { border-radius: 8px !important; font-size: 0.8rem !important; padding: 4px 12px !important; }
          .fc-button-primary { background: #0ea5e9 !important; border-color: #0ea5e9 !important; }
          .fc-button-primary:hover { background: #0284c7 !important; }
          .fc-event { border-radius: 6px !important; font-size: 0.75rem !important; padding: 2px 4px !important; }
          .fc-daygrid-event-dot { display: none; }
          .fc-event-title { font-weight: 500; }
          .fc-timegrid-slot { height: 2.5rem !important; }
          .fc-col-header-cell { background: #f8fafc; font-weight: 600; font-size: 0.8rem; }
          .fc-day-today .fc-daygrid-day-number { background: #0ea5e9; color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; }
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
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          height="100%"
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {selectedApt ? 'Detalhes da Consulta' : 'Novo Agendamento'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {selectedApt && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {Object.entries(statusLabels).map(([s, label]) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(selectedApt.id, s)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition border',
                        selectedApt.status === s
                          ? 'text-white border-transparent'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                      )}
                      style={selectedApt.status === s ? { backgroundColor: statusColors[s] } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {!selectedApt && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      <User className="w-4 h-4 inline mr-1" />Paciente <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.patientId}
                      onChange={e => setForm(p => ({ ...p, patientId: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">Selecione o paciente</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      <Stethoscope className="w-4 h-4 inline mr-1" />Médico
                    </label>
                    <select
                      value={form.doctorId}
                      onChange={e => setForm(p => ({ ...p, doctorId: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Tipo de consulta</label>
                    <input
                      value={form.title}
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="ex: Consulta, Retorno, Exame..."
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                        <Clock className="w-3.5 h-3.5 inline mr-1" />Início
                      </label>
                      <input
                        type="datetime-local"
                        value={form.startTime}
                        onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Fim</label>
                      <input
                        type="datetime-local"
                        value={form.endTime}
                        onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Sala</label>
                      <input
                        value={form.room}
                        onChange={e => setForm(p => ({ ...p, room: e.target.value }))}
                        placeholder="ex: Sala 1"
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

              {selectedApt && (
                <div className="space-y-3 text-sm text-gray-700">
                  <p><strong>Paciente:</strong> {selectedApt.patient.name}</p>
                  <p><strong>Médico:</strong> {selectedApt.doctor.name}</p>
                  <p><strong>Início:</strong> {format(new Date(selectedApt.startTime), "dd/MM/yyyy 'às' HH:mm")}</p>
                  <p><strong>Fim:</strong> {format(new Date(selectedApt.endTime), "dd/MM/yyyy 'às' HH:mm")}</p>
                  {selectedApt.room && <p><strong>Sala:</strong> {selectedApt.room}</p>}
                  {selectedApt.price && <p><strong>Valor:</strong> R$ {selectedApt.price.toFixed(2)}</p>}
                  {selectedApt.notes && <p><strong>Obs:</strong> {selectedApt.notes}</p>}
                </div>
              )}
            </div>

            {!selectedApt && (
              <div className="flex gap-3 justify-end px-6 pb-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveAppointment}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white rounded-lg text-sm hover:bg-sky-600 transition disabled:opacity-60"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Calendar className="w-4 h-4" />
                  Agendar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
