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
  const { color, roomDefault, crm, specialty, name, phone } = body

  const user = await prisma.user.updateMany({
    where: { id, clinicId: session.clinicId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone: phone || null } : {}),
      ...(crm !== undefined ? { crm: crm || null } : {}),
      ...(specialty !== undefined ? { specialty: specialty || null } : {}),
      ...(color !== undefined ? { color: color || null } : {}),
      ...(roomDefault !== undefined ? { roomDefault: roomDefault || null } : {}),
    },
  })

  return NextResponse.json({ user })
}
