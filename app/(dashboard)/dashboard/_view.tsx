import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, Clock, CheckCircle2, AlertCircle, Package } from 'lucide-react'
import Link from 'next/link'
import type { DashboardData } from './_data'

interface DashboardViewProps {
  data: DashboardData
  sessionName: string
  sessionRole: string
}

const STATUS_CONFIG = {
  SCHEDULED:   { label: 'Agendado',     color: 'bg-blue-100 text-blue-700',   Icon: Clock },
  CONFIRMED:   { label: 'Confirmado',   color: 'bg-green-100 text-green-700', Icon: CheckCircle2 },
  IN_PROGRESS: { label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-700', Icon: Clock },
  COMPLETED:   { label: 'Concluído',    color: 'bg-gray-100 text-gray-700',   Icon: CheckCircle2 },
  CANCELLED:   { label: 'Cancelado',    color: 'bg-red-100 text-red-700',     Icon: AlertCircle },
  NO_SHOW:     { label: 'Faltou',       color: 'bg-orange-100 text-orange-700', Icon: AlertCircle },
}

export function DashboardView({ data, sessionName, sessionRole }: DashboardViewProps) {
  const { now, stats, quickActions, clinicLabel, todayAppointmentsList, stockAlerts } = data

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bom dia, {sessionName.split(' ')[0]}!
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {format(now, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        <p className="text-gray-400 text-xs mt-0.5">
          {clinicLabel} · {format(now, 'MMMM yyyy', { locale: ptBR })}
        </p>
      </div>

      {/* Stock alert banner — ADMIN only */}
      {sessionRole === 'ADMIN' && stockAlerts > 0 && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <Package className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          <p className="text-sm text-yellow-800 flex-1">
            <strong>{stockAlerts}</strong> item(ns) do estoque precisam de atenção.
          </p>
          <Link href="/stock" className="text-xs font-medium text-yellow-700 hover:text-yellow-900 underline flex-shrink-0">
            Ver estoque →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.title}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Today's appointments */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Agenda de Hoje</h2>
          <Link href="/calendar" className="text-sky-500 text-sm hover:underline">
            Ver agenda completa
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {todayAppointmentsList.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhuma consulta agendada para hoje</p>
            </div>
          ) : (
            todayAppointmentsList.map((apt) => {
              const cfg = STATUS_CONFIG[apt.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.SCHEDULED
              return (
                <div key={apt.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition">
                  <div className="text-center w-16 flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{format(apt.startTime, 'HH:mm')}</p>
                    <p className="text-xs text-gray-400">{format(apt.endTime, 'HH:mm')}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{apt.patient.name}</p>
                    <p className="text-xs text-gray-500">{apt.title} · Dr(a). {apt.doctor.name}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                    <cfg.Icon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={`bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center gap-2 text-center transition shadow-sm ${action.color}`}
          >
            <action.icon className="w-6 h-6 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
