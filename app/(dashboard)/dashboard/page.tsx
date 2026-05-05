import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Users, Calendar, MessageSquare, FileText, TrendingUp,
  Clock, CheckCircle2, AlertCircle, Stethoscope, Activity,
  Heart, ClipboardList, Target,
} from 'lucide-react'
import Link from 'next/link'

// ─── Tipos ─────────────────────────────────────────────────────────────────

type LucideIcon = React.ComponentType<{ className?: string }>

interface StatCard {
  title: string
  value: string
  icon: LucideIcon
  color: string
  change: string
}

interface BaseCounts {
  totalPatients: number
  todayAppointments: number
  monthAppointments: number
  unreadMessages: number
}

interface Dates {
  now: Date
  monthStart: Date
  monthEnd: Date
}

// ─── Mapeamentos ────────────────────────────────────────────────────────────

const CLINIC_TYPE_LABELS: Record<string, string> = {
  MEDICA: 'Clínica Médica',
  ODONTOLOGIA: 'Odontologia',
  GINECOLOGIA: 'Ginecologia',
  PEDIATRIA: 'Pediatria',
  DERMATOLOGIA: 'Dermatologia',
  PSICOLOGIA: 'Psicologia',
  FISIOTERAPIA: 'Fisioterapia',
  ENDOCRINOLOGIA: 'Endocrinologia',
  NUTRICAO: 'Nutrição',
}

// ─── Ações rápidas por nicho ─────────────────────────────────────────────────

function getQuickActions(clinicType: string | null | undefined) {
  const actions = [
    { href: '/patients/new', icon: Users, label: 'Novo Paciente', color: 'hover:bg-blue-50 hover:border-blue-200' },
    { href: '/calendar', icon: Calendar, label: 'Agendar Consulta', color: 'hover:bg-sky-50 hover:border-sky-200' },
    { href: '/inbox', icon: MessageSquare, label: 'Abrir Inbox', color: 'hover:bg-green-50 hover:border-green-200' },
    { href: '/documents', icon: FileText, label: 'Novo Documento', color: 'hover:bg-purple-50 hover:border-purple-200' },
  ]

  switch (clinicType) {
    case 'ODONTOLOGIA':
      actions[1] = { ...actions[1], label: 'Agendar Procedimento' }
      break
    case 'PSICOLOGIA':
    case 'FISIOTERAPIA':
      actions[1] = { ...actions[1], label: 'Agendar Sessão' }
      actions[3] = { ...actions[3], label: 'Novo Relatório' }
      break
    case 'NUTRICAO':
      actions[1] = { ...actions[1], label: 'Agendar Retorno' }
      actions[3] = { ...actions[3], label: 'Novo Plano Alimentar' }
      break
  }

  return actions
}

// ─── KPIs por nicho ─────────────────────────────────────────────────────────

async function getClinicStats(
  clinicId: string,
  clinicType: string | null | undefined,
  base: BaseCounts,
  dates: Dates,
): Promise<StatCard[]> {
  const { totalPatients, todayAppointments, monthAppointments, unreadMessages } = base
  const { now, monthStart, monthEnd } = dates
  const formattedMonth = format(now, 'MMMM yyyy', { locale: ptBR })
  const unread = unreadMessages.toString()

  // Helper: busca todos os prontuários com extraData e filtra em JS
  async function recordsWithExtra() {
    const rows = await prisma.medicalRecord.findMany({
      where: { patient: { clinicId } },
      select: { patientId: true, extraData: true },
      take: 1000,
    })
    return rows.filter(r => r.extraData !== null && typeof r.extraData === 'object') as Array<{
      patientId: string
      extraData: Record<string, unknown>
    }>
  }

  // Helper: conta pacientes únicos cujo último extraData satisfaz o predicado
  function uniquePatients(
    rows: Array<{ patientId: string; extraData: Record<string, unknown> }>,
    predicate: (d: Record<string, unknown>) => boolean,
  ): number {
    const seen = new Set<string>()
    rows.forEach(r => {
      if (predicate(r.extraData)) seen.add(r.patientId)
    })
    return seen.size
  }

  switch (clinicType) {
    // ── ODONTOLOGIA ──────────────────────────────────────────────────────
    case 'ODONTOLOGIA': {
      const orcamentosNoMes = await prisma.document.count({
        where: {
          patient: { clinicId },
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      })
      return [
        { title: 'Pacientes Ativos', value: totalPatients.toLocaleString('pt-BR'), icon: Users, color: 'bg-blue-50 text-blue-600', change: 'na clínica' },
        { title: 'Procedimentos no Mês', value: monthAppointments.toString(), icon: Stethoscope, color: 'bg-sky-50 text-sky-600', change: formattedMonth },
        { title: 'Orçamentos no Mês', value: orcamentosNoMes.toString(), icon: FileText, color: 'bg-amber-50 text-amber-600', change: formattedMonth },
        { title: 'Consultas Hoje', value: todayAppointments.toString(), icon: Calendar, color: 'bg-purple-50 text-purple-600', change: 'agendadas para hoje' },
      ]
    }

    // ── GINECOLOGIA ──────────────────────────────────────────────────────
    case 'GINECOLOGIA': {
      const nineMonthsAgo = new Date(now.getTime() - 9 * 30 * 24 * 60 * 60 * 1000)
      let gestantes = 0
      try {
        const rows = await prisma.medicalRecord.findMany({
          where: { patient: { clinicId }, createdAt: { gte: nineMonthsAgo } },
          select: { patientId: true, extraData: true },
          take: 1000,
        })
        gestantes = uniquePatients(
          rows.filter(r => r.extraData !== null && typeof r.extraData === 'object') as any,
          d => !!(d.dpp && d.dpp !== ''),
        )
      } catch {}
      return [
        { title: 'Pacientes Ativas', value: totalPatients.toLocaleString('pt-BR'), icon: Users, color: 'bg-blue-50 text-blue-600', change: 'na clínica' },
        { title: 'Gestantes Ativas', value: gestantes.toString(), icon: Heart, color: 'bg-pink-50 text-pink-600', change: 'com DPP preenchida' },
        { title: 'Consultas Hoje', value: todayAppointments.toString(), icon: Calendar, color: 'bg-sky-50 text-sky-600', change: 'agendadas para hoje' },
        { title: 'Consultas no Mês', value: monthAppointments.toString(), icon: TrendingUp, color: 'bg-purple-50 text-purple-600', change: formattedMonth },
      ]
    }

    // ── PEDIATRIA ────────────────────────────────────────────────────────
    case 'PEDIATRIA': {
      let vacinasAtraso = 0
      try {
        const rows = await recordsWithExtra()
        vacinasAtraso = uniquePatients(rows, d => d.vacinasEmDia === 'Não')
      } catch {}
      return [
        { title: 'Pacientes Ativos', value: totalPatients.toLocaleString('pt-BR'), icon: Users, color: 'bg-blue-50 text-blue-600', change: 'na clínica' },
        { title: 'Consultas Hoje', value: todayAppointments.toString(), icon: Calendar, color: 'bg-sky-50 text-sky-600', change: 'agendadas para hoje' },
        { title: 'Vacinas em Atraso', value: vacinasAtraso.toString(), icon: AlertCircle, color: 'bg-orange-50 text-orange-600', change: 'pacientes únicos' },
        { title: 'Consultas no Mês', value: monthAppointments.toString(), icon: TrendingUp, color: 'bg-purple-50 text-purple-600', change: formattedMonth },
      ]
    }

    // ── DERMATOLOGIA ─────────────────────────────────────────────────────
    case 'DERMATOLOGIA': {
      let protocolos = 0
      try {
        const rows = await recordsWithExtra()
        protocolos = uniquePatients(rows, d => !!(d.procedimentoEstetico && d.procedimentoEstetico !== ''))
      } catch {}
      return [
        { title: 'Pacientes Ativos', value: totalPatients.toLocaleString('pt-BR'), icon: Users, color: 'bg-blue-50 text-blue-600', change: 'na clínica' },
        { title: 'Procedimentos no Mês', value: monthAppointments.toString(), icon: Stethoscope, color: 'bg-sky-50 text-sky-600', change: formattedMonth },
        { title: 'Protocolos Ativos', value: protocolos.toString(), icon: ClipboardList, color: 'bg-amber-50 text-amber-600', change: 'pacientes únicos' },
        { title: 'Mensagens Não Lidas', value: unread, icon: MessageSquare, color: 'bg-green-50 text-green-600', change: 'via WhatsApp' },
      ]
    }

    // ── PSICOLOGIA ───────────────────────────────────────────────────────
    case 'PSICOLOGIA':
      return [
        { title: 'Pacientes em Acompanhamento', value: totalPatients.toLocaleString('pt-BR'), icon: Users, color: 'bg-blue-50 text-blue-600', change: 'na clínica' },
        { title: 'Sessões Hoje', value: todayAppointments.toString(), icon: Calendar, color: 'bg-sky-50 text-sky-600', change: 'agendadas para hoje' },
        { title: 'Sessões no Mês', value: monthAppointments.toString(), icon: TrendingUp, color: 'bg-purple-50 text-purple-600', change: formattedMonth },
        { title: 'Mensagens Não Lidas', value: unread, icon: MessageSquare, color: 'bg-green-50 text-green-600', change: 'via WhatsApp' },
      ]

    // ── FISIOTERAPIA ─────────────────────────────────────────────────────
    case 'FISIOTERAPIA': {
      let emProtocolo = 0
      try {
        const rows = await recordsWithExtra()
        emProtocolo = uniquePatients(rows, d => {
          if (!d.altaPrevista || d.altaPrevista === '') return false
          const alta = new Date(d.altaPrevista as string)
          return !isNaN(alta.getTime()) && alta > now
        })
      } catch {}
      return [
        { title: 'Pacientes Ativos', value: totalPatients.toLocaleString('pt-BR'), icon: Users, color: 'bg-blue-50 text-blue-600', change: 'na clínica' },
        { title: 'Sessões Hoje', value: todayAppointments.toString(), icon: Calendar, color: 'bg-sky-50 text-sky-600', change: 'agendadas para hoje' },
        { title: 'Em Protocolo Ativo', value: emProtocolo.toString(), icon: Activity, color: 'bg-amber-50 text-amber-600', change: 'alta prevista futura' },
        { title: 'Sessões no Mês', value: monthAppointments.toString(), icon: TrendingUp, color: 'bg-purple-50 text-purple-600', change: formattedMonth },
      ]
    }

    // ── ENDOCRINOLOGIA ───────────────────────────────────────────────────
    case 'ENDOCRINOLOGIA': {
      let foraMeta = 0
      try {
        const rows = await recordsWithExtra()
        foraMeta = uniquePatients(rows, d => d.adesaoTratamento === 'Ruim')
      } catch {}
      return [
        { title: 'Pacientes Ativos', value: totalPatients.toLocaleString('pt-BR'), icon: Users, color: 'bg-blue-50 text-blue-600', change: 'na clínica' },
        { title: 'Consultas Hoje', value: todayAppointments.toString(), icon: Calendar, color: 'bg-sky-50 text-sky-600', change: 'agendadas para hoje' },
        { title: 'Fora da Meta', value: foraMeta.toString(), icon: Target, color: 'bg-orange-50 text-orange-600', change: 'adesão ruim' },
        { title: 'Consultas no Mês', value: monthAppointments.toString(), icon: TrendingUp, color: 'bg-purple-50 text-purple-600', change: formattedMonth },
      ]
    }

    // ── NUTRICAO ─────────────────────────────────────────────────────────
    case 'NUTRICAO': {
      let planosAtivos = 0
      try {
        const rows = await recordsWithExtra()
        planosAtivos = uniquePatients(rows, d => !!(d.planoAlimentar && d.planoAlimentar !== ''))
      } catch {}
      return [
        { title: 'Pacientes Ativos', value: totalPatients.toLocaleString('pt-BR'), icon: Users, color: 'bg-blue-50 text-blue-600', change: 'na clínica' },
        { title: 'Consultas Hoje', value: todayAppointments.toString(), icon: Calendar, color: 'bg-sky-50 text-sky-600', change: 'agendadas para hoje' },
        { title: 'Retornos no Mês', value: monthAppointments.toString(), icon: TrendingUp, color: 'bg-purple-50 text-purple-600', change: formattedMonth },
        { title: 'Planos Ativos', value: planosAtivos.toString(), icon: ClipboardList, color: 'bg-green-50 text-green-600', change: 'pacientes únicos' },
      ]
    }

    // ── MEDICA e padrão: mantém os 4 originais ───────────────────────────
    default:
      return [
        { title: 'Pacientes Ativos', value: totalPatients.toLocaleString('pt-BR'), icon: Users, color: 'bg-blue-50 text-blue-600', change: '+12 este mês' },
        { title: 'Consultas Hoje', value: todayAppointments.toString(), icon: Calendar, color: 'bg-sky-50 text-sky-600', change: `${monthAppointments} este mês` },
        { title: 'Mensagens Não Lidas', value: unreadMessages.toString(), icon: MessageSquare, color: 'bg-green-50 text-green-600', change: 'Via WhatsApp' },
        { title: 'Consultas no Mês', value: monthAppointments.toString(), icon: TrendingUp, color: 'bg-purple-50 text-purple-600', change: formattedMonth },
      ]
  }
}

// ─── Page ───────────────────────────────────────────────────────────────────

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
    clinic,
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
    prisma.clinic.findUnique({
      where: { id: session.clinicId },
      select: { clinicType: true },
    }),
  ])

  const clinicType = clinic?.clinicType ?? null
  const clinicLabel = clinicType
    ? (CLINIC_TYPE_LABELS[clinicType] ?? clinicType)
    : 'Clínica Médica'

  const stats = await getClinicStats(
    session.clinicId,
    clinicType,
    {
      totalPatients,
      todayAppointments,
      monthAppointments,
      unreadMessages: unreadMessages._sum.unreadCount ?? 0,
    },
    { now, monthStart, monthEnd },
  )

  const quickActions = getQuickActions(clinicType)

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
        <p className="text-gray-400 text-xs mt-0.5">
          {clinicLabel} · {format(now, 'MMMM yyyy', { locale: ptBR })}
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
              const cfg = statusConfig[apt.status as keyof typeof statusConfig] ?? statusConfig.SCHEDULED
              const StatusIcon = cfg.icon
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
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                    <StatusIcon className="w-3 h-3" />
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
