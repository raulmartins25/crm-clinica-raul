import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { StockClient } from './StockClient'

export default async function StockPage() {
  const session = await requireSession()

  const [items, clinic] = await Promise.all([
    prisma.stockItem.findMany({
      where: { clinicId: session.clinicId, active: true },
      orderBy: { name: 'asc' },
    }),
    prisma.clinic.findUnique({
      where: { id: session.clinicId },
      select: { clinicType: true },
    }),
  ])

  const now = new Date()
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const alertCount = items.filter(
    i => i.quantity <= i.minQuantity || (i.expirationDate != null && i.expirationDate <= thirtyDays),
  ).length

  return (
    <StockClient
      initialItems={items.map(i => ({
        ...i,
        expirationDate: i.expirationDate?.toISOString() ?? null,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      }))}
      clinicType={clinic?.clinicType ?? null}
      sessionId={session.id}
      alertCount={alertCount}
    />
  )
}
