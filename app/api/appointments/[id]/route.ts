import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  const { id } = await params
  const body = await req.json()

  const appointment = await prisma.appointment.updateMany({
    where: { id, clinicId: session.clinicId },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.title && { title: body.title }),
      ...(body.startTime && { startTime: new Date(body.startTime) }),
      ...(body.endTime && { endTime: new Date(body.endTime) }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  })

  return NextResponse.json({ updated: appointment.count > 0 })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  const { id } = await params

  await prisma.appointment.updateMany({
    where: { id, clinicId: session.clinicId },
    data: { status: 'CANCELLED' },
  })

  return NextResponse.json({ ok: true })
}
