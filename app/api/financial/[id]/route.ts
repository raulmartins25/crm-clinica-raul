import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { PaymentStatus } from '@prisma/client'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession()
  const body = await req.json()
  const { id } = await params

  const existing = await prisma.payment.findFirst({
    where: { id, clinicId: session.clinicId },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
  }

  // Cancel shortcut
  if (body.status === 'CANCELLED') {
    const payment = await prisma.payment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })
    return NextResponse.json({ payment })
  }

  // Register payment: compute new totals
  const additionalAmount = body.amountPaid != null ? Number(body.amountPaid) : 0
  const newAmountPaid = existing.amountPaid + additionalAmount
  const newDiscount = body.discount != null ? Number(body.discount) : existing.discount
  const effectiveAmount = existing.amount - newDiscount

  let newStatus: PaymentStatus
  if (newAmountPaid >= effectiveAmount) {
    newStatus = 'PAID'
  } else if (newAmountPaid > 0) {
    newStatus = 'PARTIAL'
  } else {
    newStatus = existing.status
  }

  const payment = await prisma.payment.update({
    where: { id },
    data: {
      amountPaid: newAmountPaid,
      discount: newDiscount,
      method: body.method || existing.method,
      status: newStatus,
      paidAt: newStatus === 'PAID' ? new Date() : existing.paidAt,
      notes: body.notes ?? existing.notes,
    },
    include: {
      patient: { select: { id: true, name: true } },
      appointment: { select: { id: true, title: true, startTime: true } },
    },
  })

  return NextResponse.json({ payment })
}
