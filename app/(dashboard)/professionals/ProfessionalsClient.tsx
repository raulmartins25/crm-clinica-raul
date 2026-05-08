'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Users, Calendar, Edit2, X, Loader2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ScheduleDay {
  dayOfWeek: number
  startTime: string
  endTime: string
  active: boolean
}

interface Professional {
  id: string
  name: string
  role: string
  crm: string | null
  specialty: string | null
  color: string | null
  roomDefault: string | null
  schedule: ScheduleDay[]
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  { hex: '#3b82f6', label: 'Azul' },
  { hex: '#22c55e', label: 'Verde' },
  { hex: '#8b5cf6', label: 'Roxo' },
  { hex: '#ec4899', label: 'Rosa' },
  { hex: '#f97316', label: 'Laranja' },
  { hex: '#06b6d4', label: 'Ciano' },
  { hex: '#ef4444', label: 'Vermelho' },
  { hex: '#eab308', label: 'Amarelo' },
]

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DAY_NAMES_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const WEEK_COLS = [1, 2, 3, 4, 5, 6, 0] // Mon-Sun order for the grid

const ROLE_LABELS: Record<string, string> = {
  DOCTOR: 'Médico',
  NURSE: 'Enfermeiro(a)',
  ASSISTANT: 'Assistente',
}

export function getColorForProfessional(id: string, color?: string | null): string {
  if (color) return color
  const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return PRESET_COLORS[sum % PRESET_COLORS.length].hex
}

function initScheduleDays(schedule: ScheduleDay[]): ScheduleDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const existing = schedule.find(s => s.dayOfWeek === i)
    return existing ?? { dayOfWeek: i, startTime: '08:00', endTime: '18:00', active: false }
  })
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ProfessionalsClient({
  professionals: initialProfessionals,
}: {
  professionals: Professional[]
}) {
  const [professionals, setProfessionals] = useState(initialProfessionals)
  const [activeTab, setActiveTab] = useState<'cards' | 'weekly'>('cards')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Edit modal state
  const [editColor, setEditColor] = useState('')
  const [editRoom, setEditRoom] = useState('')
  const [editSchedule, setEditSchedule] = useState<ScheduleDay[]>([])

  const openEdit = (p: Professional) => {
    setEditingId(p.id)
    setEditColor(p.color ?? '')
    setEditRoom(p.roomDefault ?? '')
    setEditSchedule(initScheduleDays(p.schedule))
  }

  const closeEdit = () => {
    setEditingId(null)
  }

  const toggleDay = (dayOfWeek: number) => {
    setEditSchedule(prev =>
      prev.map(d => d.dayOfWeek === dayOfWeek ? { ...d, active: !d.active } : d),
    )
  }

  const setDayTime = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    setEditSchedule(prev =>
      prev.map(d => d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d),
    )
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/professionals/${editingId}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleData: editSchedule,
          color: editColor || null,
          roomDefault: editRoom || null,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Profissional atualizado!')
      setProfessionals(prev =>
        prev.map(p =>
          p.id === editingId
            ? {
                ...p,
                color: editColor || null,
                roomDefault: editRoom || null,
                schedule: editSchedule.filter(d => d.active),
              }
            : p,
        ),
      )
      closeEdit()
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const editingProfessional = professionals.find(p => p.id === editingId) ?? null

  const todayDow = new Date().getDay()

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profissionais</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie os profissionais e seus horários</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('cards')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition',
              activeTab === 'cards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <Users className="w-4 h-4" />
            Profissionais
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition',
              activeTab === 'weekly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <Calendar className="w-4 h-4" />
            Visão Semanal
          </button>
        </div>
      </div>

      {/* Tab: Cards */}
      {activeTab === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {professionals.map(p => {
            const color = getColorForProfessional(p.id, p.color)
            const initials = p.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
            const hasScheduleToday = p.schedule.some(s => s.dayOfWeek === todayDow && s.active)
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
                        <p className="text-xs text-gray-500">{ROLE_LABELS[p.role] ?? p.role}</p>
                        {p.specialty && (
                          <p className="text-xs text-gray-400 mt-0.5">{p.specialty}</p>
                        )}
                        {p.crm && (
                          <p className="text-xs text-gray-400">{p.crm}</p>
                        )}
                      </div>
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 text-gray-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition flex-shrink-0"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Status badge */}
                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                          hasScheduleToday
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500',
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            hasScheduleToday ? 'bg-green-500' : 'bg-gray-400',
                          )}
                        />
                        {hasScheduleToday ? 'Ativo hoje' : 'Sem agenda hoje'}
                      </span>
                      {p.roomDefault && (
                        <span className="text-xs text-gray-400">{p.roomDefault}</span>
                      )}
                    </div>

                    {/* Schedule preview */}
                    {p.schedule.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {DAY_NAMES.map((label, dow) => {
                          const day = p.schedule.find(s => s.dayOfWeek === dow && s.active)
                          return (
                            <span
                              key={dow}
                              className={cn(
                                'text-xs px-1.5 py-0.5 rounded',
                                day ? 'text-white' : 'bg-gray-100 text-gray-300',
                              )}
                              style={day ? { backgroundColor: color } : {}}
                              title={day ? `${DAY_NAMES_FULL[dow]}: ${day.startTime}–${day.endTime}` : DAY_NAMES_FULL[dow]}
                            >
                              {label}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {professionals.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum profissional cadastrado.</p>
              <p className="text-xs mt-1">Crie usuários com papel Médico, Enfermeiro ou Assistente em Configurações.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Weekly view */}
      {activeTab === 'weekly' && (
        <WeeklyView professionals={professionals} />
      )}

      {/* Edit modal */}
      {editingId && editingProfessional && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Editar — {editingProfessional.name}</h2>
              <button onClick={closeEdit} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Color picker */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Cor na agenda</label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setEditColor(c.hex)}
                      title={c.label}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition',
                        editColor === c.hex ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105',
                      )}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                  {/* Clear */}
                  {editColor && (
                    <button
                      type="button"
                      onClick={() => setEditColor('')}
                      className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xs"
                      title="Cor automática"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {editColor && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full" style={{ backgroundColor: editColor }} />
                    <span className="text-xs text-gray-500">Cor selecionada: {editColor}</span>
                  </div>
                )}
              </div>

              {/* Room */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Sala padrão</label>
                <input
                  value={editRoom}
                  onChange={e => setEditRoom(e.target.value)}
                  placeholder="ex: Consultório 1"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Schedule */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Horários de Atendimento
                </label>
                <div className="space-y-2">
                  {editSchedule.map(day => (
                    <div key={day.dayOfWeek} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleDay(day.dayOfWeek)}
                        className={cn(
                          'w-16 text-center text-xs font-medium py-1.5 rounded-lg border transition',
                          day.active
                            ? 'bg-sky-500 text-white border-sky-500'
                            : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300',
                        )}
                      >
                        {DAY_NAMES_FULL[day.dayOfWeek].slice(0, 3)}
                      </button>
                      <input
                        type="time"
                        value={day.startTime}
                        disabled={!day.active}
                        onChange={e => setDayTime(day.dayOfWeek, 'startTime', e.target.value)}
                        className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-40 disabled:bg-gray-50"
                      />
                      <span className="text-gray-400 text-sm">às</span>
                      <input
                        type="time"
                        value={day.endTime}
                        disabled={!day.active}
                        onChange={e => setDayTime(day.dayOfWeek, 'endTime', e.target.value)}
                        className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-40 disabled:bg-gray-50"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end px-6 pb-6">
              <button
                onClick={closeEdit}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition disabled:opacity-60"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Weekly View ────────────────────────────────────────────────────────────────

function WeeklyView({ professionals }: { professionals: Professional[] }) {
  if (professionals.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhum profissional para exibir.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-40">Profissional</th>
            {WEEK_COLS.map(dow => (
              <th key={dow} className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                {DAY_NAMES[dow]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {professionals.map(p => {
            const color = getColorForProfessional(p.id, p.color)
            return (
              <tr key={p.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {p.name[0]}
                    </div>
                    <span className="text-sm font-medium text-gray-800 truncate max-w-[100px]">{p.name}</span>
                  </div>
                </td>
                {WEEK_COLS.map(dow => {
                  const day = p.schedule.find(s => s.dayOfWeek === dow && s.active)
                  return (
                    <td key={dow} className="px-2 py-2 text-center">
                      {day ? (
                        <div
                          className="relative group rounded-lg px-1.5 py-2 text-white text-xs font-medium cursor-default"
                          style={{ backgroundColor: color }}
                          title={`${p.name} — ${day.startTime} às ${day.endTime}`}
                        >
                          <div>{day.startTime}</div>
                          <div className="opacity-80">{day.endTime}</div>
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex whitespace-nowrap bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 z-10 pointer-events-none shadow-lg">
                            {p.name} — {day.startTime} às {day.endTime}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-gray-50 border border-dashed border-gray-200 h-12" />
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
