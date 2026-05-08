import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'

const STATUS_PT: Record<string, string> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluido',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Nao Compareceu',
}

export async function GET(req: NextRequest) {
  const session = await requireSession()
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'appointments'
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const toDate = to ? new Date(to) : new Date()
  toDate.setHours(23, 59, 59, 999)

  const clinic = await prisma.clinic.findUnique({
    where: { id: session.clinicId },
    select: { name: true },
  })

  if (type === 'patients') {
    const patients = await prisma.patient.findMany({
      where: { clinicId: session.clinicId, createdAt: { gte: fromDate, lte: toDate } },
      orderBy: { name: 'asc' },
      select: {
        name: true, cpf: true, phone: true, email: true,
        birthDate: true, gender: true, city: true, createdAt: true,
      },
    })

    return NextResponse.json({
      clinicName: clinic?.name || '',
      type: 'Pacientes',
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      columns: ['Nome', 'CPF', 'Telefone', 'Email', 'Nascimento', 'Genero', 'Cidade', 'Cadastro'],
      rows: patients.map(p => [
        p.name,
        p.cpf || '-',
        p.phone,
        p.email || '-',
        p.birthDate ? format(p.birthDate, 'dd/MM/yyyy') : '-',
        p.gender || '-',
        p.city || '-',
        format(p.createdAt, 'dd/MM/yyyy'),
      ]),
    })
  }

  // appointments (default)
  const appointments = await prisma.appointment.findMany({
    where: { clinicId: session.clinicId, startTime: { gte: fromDate, lte: toDate } },
    orderBy: { startTime: 'asc' },
    include: {
      patient: { select: { name: true } },
      doctor: { select: { name: true } },
    },
  })

  return NextResponse.json({
    clinicName: clinic?.name || '',
    type: 'Consultas',
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    columns: ['Data', 'Hora', 'Paciente', 'Profissional', 'Tipo', 'Status', 'Valor'],
    rows: appointments.map(apt => [
      format(apt.startTime, 'dd/MM/yyyy'),
      format(apt.startTime, 'HH:mm'),
      apt.patient.name,
      apt.doctor.name,
      apt.title,
      STATUS_PT[apt.status] || apt.status,
      apt.price ? `R$ ${apt.price.toFixed(2)}` : '-',
    ]),
  })
}
