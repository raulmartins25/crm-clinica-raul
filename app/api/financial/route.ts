import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

const PAGE_SIZE = 20

export async function GET(req: NextRequest) {
  const session = await requireSession()
  const { searchParams } = new URL(req.url)

  const status = searchParams.get('status')
  const method = searchParams.get('method')
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const search = searchParams.get('search')
  const appointmentId = searchParams.get('appointmentId')
  const page = Math.max(1, Number(searchParams.get('page') || '1'))

  const where: Record<string, unknown> = { clinicId: session.clinicId }

  if (status) where.status = status
  if (method) where.method = method
  if (appointmentId) where.appointmentId = appointmentId
  if (start || end) {
    where.createdAt = {
      ...(start ? { gte: new Date(start) } : {}),
      ...(end ? { lte: new Date(new Date(end).setHours(23, 59, 59, 999)) } : {}),
    }
  }
  if (search) {
    where.patient = { name: { contains: search, mode: 'insensitive' } }
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true } },
        appointment: { select: { id: true, title: true, startTime: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.payment.count({ where }),
  ])

  return NextResponse.json({ payments, total, page, pageSize: PAGE_SIZE })
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  const body = await req.json()

  const { patientId, appointmentId, amount, method, dueDate, notes } = body

  if (!patientId || !amount) {
    return NextResponse.json({ error: 'patientId e amount são obrigatórios' }, { status: 400 })
  }

  // Validate patient belongs to this clinic
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, clinicId: session.clinicId },
  })
  if (!patient) {
    return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
  }

  // If appointmentId, validate it belongs to this clinic and has no payment yet
  if (appointmentId) {
    const apt = await prisma.appointment.findFirst({
      where: { id: appointmentId, clinicId: session.clinicId },
      include: { payment: true },
    })
    if (!apt) return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
    if (apt.payment) return NextResponse.json({ error: 'Esta consulta já possui um pagamento' }, { status: 409 })
  }

  const payment = await prisma.payment.create({
    data: {
      clinicId: session.clinicId,
      patientId,
      appointmentId: appointmentId || null,
      amount: Number(amount),
      method: method || 'PIX',
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: notes || null,
      createdById: session.id,
    },
    include: {
      patient: { select: { id: true, name: true } },
      appointment: { select: { id: true, title: true, startTime: true } },
    },
  })

  return NextResponse.json({ payment }, { status: 201 })
}
