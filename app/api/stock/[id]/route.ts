import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession()
  const { id } = await params
  const body = await req.json()

  const existing = await prisma.stockItem.findFirst({
    where: { id, clinicId: session.clinicId },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
  }

  const item = await prisma.stockItem.update({
    where: { id },
    data: {
      name: body.name?.trim() || existing.name,
      description: body.description ?? existing.description,
      category: body.category ?? existing.category,
      unit: body.unit || existing.unit,
      minQuantity: body.minQuantity != null ? Number(body.minQuantity) : existing.minQuantity,
      maxQuantity: body.maxQuantity != null ? Number(body.maxQuantity) : existing.maxQuantity,
      costPrice: body.costPrice != null ? Number(body.costPrice) : existing.costPrice,
      supplier: body.supplier ?? existing.supplier,
      expirationDate: body.expirationDate ? new Date(body.expirationDate) : existing.expirationDate,
      location: body.location ?? existing.location,
    },
  })

  return NextResponse.json({ item })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession()
  const { id } = await params

  const existing = await prisma.stockItem.findFirst({
    where: { id, clinicId: session.clinicId },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
  }

  await prisma.stockItem.update({
    where: { id },
    data: { active: false },
  })

  return NextResponse.json({ success: true })
}
