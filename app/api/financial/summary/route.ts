import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await requireSession()
  const { searchParams } = new URL(req.url)

  const now = new Date()
  const month = Number(searchParams.get('month') || now.getMonth() + 1)
  const year = Number(searchParams.get('year') || now.getFullYear())

  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)

  const [paidPayments, pendingPayments, monthCount, availableAppointments] = await Promise.all([
    prisma.payment.findMany({
      where: {
        clinicId: session.clinicId,
        status: 'PAID',
        paidAt: { gte: start, lt: end },
      },
      select: { amountPaid: true, amount: true },
    }),
    prisma.payment.findMany({
      where: {
        clinicId: session.clinicId,
        status: { in: ['PENDING', 'PARTIAL'] },
      },
      select: { amount: true, amountPaid: true, discount: true },
    }),
    prisma.payment.count({
      where: {
        clinicId: session.clinicId,
        createdAt: { gte: start, lt: end },
      },
    }),
    prisma.appointment.findMany({
      where: {
        clinicId: session.clinicId,
        status: 'COMPLETED',
        payment: { is: null },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        price: true,
        patient: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'desc' },
      take: 100,
    }),
  ])

  const received = paidPayments.reduce((s, p) => s + p.amountPaid, 0)
  const pending = pendingPayments.reduce((s, p) => s + Math.max(0, p.amount - p.amountPaid - p.discount), 0)
  const avgTicket =
    paidPayments.length > 0
      ? paidPayments.reduce((s, p) => s + p.amount, 0) / paidPayments.length
      : 0

  return NextResponse.json({
    received,
    pending,
    count: monthCount,
    avgTicket,
    availableAppointments,
  })
}
