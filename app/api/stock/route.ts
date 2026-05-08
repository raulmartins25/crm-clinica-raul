import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await requireSession()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const category = searchParams.get('category') ?? ''
  const status = searchParams.get('status') ?? ''
  const showInactive = searchParams.get('showInactive') === 'true'

  const items = await prisma.stockItem.findMany({
    where: {
      clinicId: session.clinicId,
      ...(showInactive ? {} : { active: true }),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: { name: 'asc' },
  })

  // Filter by stock status in JS (requires column comparison)
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const filtered = status
    ? items.filter(item => {
        if (status === 'ok') return item.quantity > item.minQuantity
        if (status === 'low') return item.quantity > 0 && item.quantity <= item.minQuantity
        if (status === 'empty') return item.quantity === 0
        if (status === 'expiring')
          return item.expirationDate != null && item.expirationDate <= thirtyDaysFromNow
        return true
      })
    : items

  return NextResponse.json({ items: filtered })
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  const body = await req.json()

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }

  const initialQty = Number(body.quantity ?? 0)

  const item = await prisma.$transaction(async tx => {
    const created = await tx.stockItem.create({
      data: {
        clinicId: session.clinicId,
        name: body.name.trim(),
        description: body.description || null,
        category: body.category || null,
        unit: body.unit || 'unidade',
        quantity: initialQty,
        minQuantity: Number(body.minQuantity ?? 0),
        maxQuantity: body.maxQuantity ? Number(body.maxQuantity) : null,
        costPrice: body.costPrice ? Number(body.costPrice) : null,
        supplier: body.supplier || null,
        expirationDate: body.expirationDate ? new Date(body.expirationDate) : null,
        location: body.location || null,
      },
    })

    // Record initial stock movement if quantity > 0
    if (initialQty > 0) {
      await tx.stockMovement.create({
        data: {
          clinicId: session.clinicId,
          itemId: created.id,
          type: 'IN',
          quantity: initialQty,
          unitCost: body.costPrice ? Number(body.costPrice) : null,
          totalCost: body.costPrice ? Number(body.costPrice) * initialQty : null,
          reason: 'Estoque inicial',
          performedBy: session.id,
        },
      })
    }

    return created
  })

  return NextResponse.json({ item }, { status: 201 })
}
