import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await requireSession()
  const users = await prisma.user.findMany({
    where: { clinicId: session.clinicId },
    select: { id: true, name: true, email: true, role: true, crm: true, specialty: true, phone: true, active: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  const body = await req.json()
  const hashed = await bcrypt.hash(body.password, 10)
  const user = await prisma.user.create({
    data: {
      clinicId: session.clinicId,
      name: body.name,
      email: body.email,
      password: hashed,
      role: body.role || 'RECEPTIONIST',
      crm: body.crm || null,
      specialty: body.specialty || null,
      phone: body.phone || null,
      color: body.color || null,
      roomDefault: body.roomDefault || null,
    },
  })
  return NextResponse.json({ user }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession()
  const body = await req.json()
  const { id, crm, specialty, name, phone, active, color, roomDefault } = body
  const user = await prisma.user.updateMany({
    where: { id, clinicId: session.clinicId },
    data: {
      crm, specialty, name, phone, active,
      ...(color !== undefined ? { color: color || null } : {}),
      ...(roomDefault !== undefined ? { roomDefault: roomDefault || null } : {}),
    },
  })
  return NextResponse.json({ user })
}
