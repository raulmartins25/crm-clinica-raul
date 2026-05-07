import type { ComponentType } from 'react'
import { prisma } from '@/lib/db'
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Users, Calendar, MessageSquare, FileText, TrendingUp,
  AlertCircle, Stethoscope, Activity, Heart, ClipboardList, Target,
} from 'lucide-react'

// ─── Tipos exportados ────────────────────────────────────────────────────────

export type LucideIcon = ComponentType<{ className?: string }>

export interface StatCard {
  title: string
  value: string
  icon: LucideIcon
  color: string
  change: string
}

export interface QuickAction {
  href: string
  icon: LucideIcon
  label: string
  color: string
}

export interface AppointmentItem {
  id: string
  title: string
  startTime: Date
  endTime: Date
  status: string
  patient: { name: string }
  doctor: { name: string }
}

export interface DashboardData {
  now: Date
  stats: StatCard[]
  quickActions: QuickAction[]
  clinicLabel: string
  todayAppointmentsList: AppointmentItem[]
}

// ─── Mapeamentos ─────────────────────────────────────────────────────────────

export const CLINIC_TYPE_LABELS: Record<string, string> = {
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

export function getQuickActions(clinicType: string | null | undefined): QuickAction[] {
  const actions: QuickAction[] = [
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

// ─── KPIs por nicho ──────────────────────────────────────────────────────────

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

export async function getClinicStats(
  clinicId: string,
  clinicType: string | null | undefined,
  base: BaseCounts,
  dates: Dates,
): Promise<StatCard[]> {
  const { totalPatients, todayAppointments, monthAppointments, unreadMessages } = base
  const { now, monthStart, monthEnd } = dates
  const formattedMonth = format(now, 'MMMM yyyy', { locale: ptBR })
  const unread = unreadMessages.toString()

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

  function uniquePatients(
    rows: Array<{ patientId: string; extraData: Record<string, unknown> }>,
    predicate: (d: Record<string, unknown>) => boolean,
  ): number {
    const seen = new Set<string>()
    rows.forEach(r => { if (predicate(r.extraData)) seen.add(r.patientId) })
    return seen.size
  }

  switch (clinicType) {
    case 'ODONTOLOGIA': {
      const orcamentosNoMes = await prisma.document.count({
        where: { patient: { clinicId }, createdAt: { gte: monthStart, lte: monthEnd } },
      })
      return [
        { title: 'Pacientes Ativos', value: totalPatients.toLocaleString('pt-BR'), icon: Users, color: 'bg-blue-50 text-blue-600', change: 'na clínica' },
        { title: 'Procedimentos no Mês', value: monthAppointments.toString(), icon: Stethoscope, color: 'bg-sky-50 text-sky-600', change: formattedMonth },
        { title: 'Orçamentos no Mês', value: orcamentosNoMes.toString(), icon: FileText, color: 'bg-amber-50 text-amber-600', change: formattedMonth },
        { title: 'Consultas Hoje', value: todayAppointments.toString(), icon: Calendar, color: 'bg-purple-50 text-purple-600', change: 'agendadas para hoje' },
      ]
    }
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
    case 'PSICOLOGIA':
      return [
        { title: 'Pacientes em Acompanhamento', value: totalPatients.toLocaleString('pt-BR'), icon: Users, color: 'bg-blue-50 text-blue-600', change: 'na clínica' },
        { title: 'Sessões Hoje', value: todayAppointments.toString(), icon: Calendar, color: 'bg-sky-50 text-sky-600', change: 'agendadas para hoje' },
        { title: 'Sessões no Mês', value: monthAppointments.toString(), icon: TrendingUp, color: 'bg-purple-50 text-purple-600', change: formattedMonth },
        { title: 'Mensagens Não Lidas', value: unread, icon: MessageSquare, color: 'bg-green-50 text-green-600', change: 'via WhatsApp' },
      ]
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
    default:
      return [
        { title: 'Pacientes Ativos', value: totalPatients.toLocaleString('pt-BR'), icon: Users, color: 'bg-blue-50 text-blue-600', change: '+12 este mês' },
        { title: 'Consultas Hoje', value: todayAppointments.toString(), icon: Calendar, color: 'bg-sky-50 text-sky-600', change: `${monthAppointments} este mês` },
        { title: 'Mensagens Não Lidas', value: unreadMessages.toString(), icon: MessageSquare, color: 'bg-green-50 text-green-600', change: 'Via WhatsApp' },
        { title: 'Consultas no Mês', value: monthAppointments.toString(), icon: TrendingUp, color: 'bg-purple-50 text-purple-600', change: formattedMonth },
      ]
  }
}

// ─── Orquestrador principal ───────────────────────────────────────────────────

export async function getDashboardData(
  clinicId: string,
  clinicType: string | null,
): Promise<DashboardData> {
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
    prisma.patient.count({ where: { clinicId, active: true } }),
    prisma.appointment.count({
      where: {
        clinicId,
        startTime: { gte: todayStart, lte: todayEnd },
        status: { notIn: ['CANCELLED'] },
      },
    }),
    prisma.appointment.count({
      where: {
        clinicId,
        startTime: { gte: monthStart, lte: monthEnd },
        status: { notIn: ['CANCELLED'] },
      },
    }),
    prisma.conversation.aggregate({
      where: { patient: { clinicId } },
      _sum: { unreadCount: true },
    }),
    prisma.appointment.findMany({
      where: {
        clinicId,
        startTime: { gte: todayStart, lte: todayEnd },
        status: { notIn: ['CANCELLED'] },
      },
      include: { patient: true, doctor: true },
      orderBy: { startTime: 'asc' },
      take: 8,
    }),
  ])

  const stats = await getClinicStats(
    clinicId,
    clinicType,
    {
      totalPatients,
      todayAppointments,
      monthAppointments,
      unreadMessages: unreadMessages._sum.unreadCount ?? 0,
    },
    { now, monthStart, monthEnd },
  )

  return {
    now,
    stats,
    quickActions: getQuickActions(clinicType),
    clinicLabel: clinicType ? (CLINIC_TYPE_LABELS[clinicType] ?? clinicType) : 'Clínica Médica',
    todayAppointmentsList,
  }
}
