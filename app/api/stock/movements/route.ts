import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { StockMovementType } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await requireSession()
  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('itemId') ?? ''
  const type = searchParams.get('type') ?? ''
  const start = searchParams.get('start') ?? ''
  const end = searchParams.get('end') ?? ''

  const endDate = end ? new Date(end) : undefined
  if (endDate) endDate.setHours(23, 59, 59, 999)

  const movements = await prisma.stockMovement.findMany({
    where: {
      clinicId: session.clinicId,
      ...(itemId ? { itemId } : {}),
      ...(type ? { type: type as StockMovementType } : {}),
      ...(start || end
        ? {
            createdAt: {
              ...(start ? { gte: new Date(start) } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    },
    include: {
      item: { select: { id: true, name: true, unit: true } },
      performer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({ movements })
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  const body = await req.json()

  const { itemId, type, quantity, unitCost, reason } = body as {
    itemId: string
    type: StockMovementType
    quantity: number
    unitCost?: number
    reason?: string
  }

  if (!itemId || !type || !quantity || quantity <= 0) {
    return NextResponse.json({ error: 'itemId, type e quantity (>0) são obrigatórios' }, { status: 400 })
  }

  const item = await prisma.stockItem.findFirst({
    where: { id: itemId, clinicId: session.clinicId, active: true },
  })
  if (!item) {
    return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
  }

  const isOut = type === 'OUT' || type === 'EXPIRED'
  if (isOut && item.quantity < quantity) {
    return NextResponse.json(
      { error: `Quantidade insuficiente. Disponível: ${item.quantity} ${item.unit}` },
      { status: 400 },
    )
  }

  const totalCost = unitCost != null ? unitCost * quantity : null

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        clinicId: session.clinicId,
        itemId,
        type,
        quantity,
        unitCost: unitCost ?? null,
        totalCost,
        reason: reason || null,
        performedBy: session.id,
      },
    }),
    prisma.stockItem.update({
      where: { id: itemId },
      data: {
        quantity: isOut ? { decrement: quantity } : { increment: quantity },
      },
    }),
  ])

  return NextResponse.json({ movement }, { status: 201 })
}
