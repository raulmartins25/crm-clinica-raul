import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await requireSession()

  const allActive = await prisma.stockItem.findMany({
    where: { clinicId: session.clinicId, active: true },
    select: {
      id: true, name: true, unit: true,
      quantity: true, minQuantity: true,
      expirationDate: true, category: true,
    },
  })

  const now = new Date()
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const lowStock = allActive.filter(i => i.quantity <= i.minQuantity)
  const expiringSoon = allActive.filter(
    i => i.expirationDate != null && i.expirationDate <= thirtyDays && i.expirationDate > now,
  )

  return NextResponse.json({ lowStock, expiringSoon, totalAlerts: lowStock.length + expiringSoon.length })
}
