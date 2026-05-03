import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Users,
  Calendar,
  MessageSquare,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) return null

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const [
    totalPatients,
    todayAppointments,
    monthAppointments,
    unreadMessages,
    todayAppointmentsList,
  ] = await Promise.all([
    prisma.patient.count({ where: { clinicId: session.clinicId, active: true } }),
    prisma.appointment.count({
      where: {
        clinicId: session.clinicId,
        startTime: { gte: todayStart, lte: todayEnd },
        status: { notIn: ['CANCELLED'] },
      },
    }),
    prisma.appointment.count({
      where: {
        clinicId: session.clinicId,
        startTime: { gte: monthStart, lte: monthEnd },
        status: { notIn: ['CANCELLED'] },
      },
    }),
    prisma.conversation.aggregate({
      where: { patient: { clinicId: session.clinicId } },
      _sum: { unreadCount: true },
    }),
    prisma.appointment.findMany({
      where: {
        clinicId: session.clinicId,
        startTime: { gte: todayStart, lte: todayEnd },
        status: { notIn: ['CANCELLED'] },
      },
      include: { patient: true, doctor: true },
      orderBy: { startTime: 'asc' },
      take: 8,
    }),
  ])

  const stats = [
    {
      title: 'Pacientes Ativos',
      value: totalPatients.toLocaleString('pt-BR'),
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      change: '+12 este mês',
    },
    {
      title: 'Consultas Hoje',
      value: todayAppointments.toString(),
      icon: Calendar,
      color: 'bg-sky-50 text-sky-600',
      change: `${monthAppointments} este mês`,
    },
    {
      title: 'Mensagens Não Lidas',
      value: (unreadMessages._sum.unreadCount || 0).toString(),
      icon: MessageSquare,
      color: 'bg-green-50 text-green-600',
      change: 'Via WhatsApp',
    },
    {
      title: 'Consultas no Mês',
      value: monthAppointments.toString(),
      icon: TrendingUp,
      color: 'bg-purple-50 text-purple-600',
      change: format(now, 'MMMM yyyy', { locale: ptBR }),
    },
  ]

  const statusConfig = {
    SCHEDULED: { label: 'Agendado', color: 'bg-blue-100 text-blue-700', icon: Clock },
    CONFIRMED: { label: 'Confirmado', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    IN_PROGRESS: { label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    COMPLETED: { label: 'Concluído', color: 'bg-gray-100 text-gray-700', icon: CheckCircle2 },
    CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: AlertCircle },
    NO_SHOW: { label: 'Faltou', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bom dia, {session.name.split(' ')[0]}!
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {format(now, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

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
          <h2 className="font-semibold text-gray-900">Consultas de Hoje</h2>
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
              const StatusConfig = statusConfig[apt.status]
              const StatusIcon = StatusConfig.icon
              return (
                <div key={apt.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition">
                  <div className="text-center w-16 flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {format(apt.startTime, 'HH:mm')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(apt.endTime, 'HH:mm')}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{apt.patient.name}</p>
                    <p className="text-xs text-gray-500">{apt.title} · Dr(a). {apt.doctor.name}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${StatusConfig.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {StatusConfig.label}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/patients/new', icon: Users, label: 'Novo Paciente', color: 'hover:bg-blue-50 hover:border-blue-200' },
          { href: '/calendar', icon: Calendar, label: 'Agendar Consulta', color: 'hover:bg-sky-50 hover:border-sky-200' },
          { href: '/inbox', icon: MessageSquare, label: 'Abrir Inbox', color: 'hover:bg-green-50 hover:border-green-200' },
          { href: '/documents/new', icon: FileText, label: 'Novo Documento', color: 'hover:bg-purple-50 hover:border-purple-200' },
        ].map((action) => (
          <Link
            key={action.href}
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
