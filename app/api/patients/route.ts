import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await requireSession()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const page = Number(searchParams.get('page') || 1)
  const limit = 20

  const where = {
    clinicId: session.clinicId,
    active: true,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { cpf: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        _count: { select: { appointments: true, medicalRecords: true, documents: true } },
      },
    }),
    prisma.patient.count({ where }),
  ])

  return NextResponse.json({ patients, total, page, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  const body = await req.json()

  const patient = await prisma.patient.create({
    data: {
      clinicId: session.clinicId,
      name: body.name,
      cpf: body.cpf || null,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      gender: body.gender || null,
      phone: body.phone,
      phone2: body.phone2 || null,
      email: body.email || null,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      zipCode: body.zipCode || null,
      bloodType: body.bloodType || null,
      allergies: body.allergies || null,
      observations: body.observations || null,
    },
  })

  return NextResponse.json({ patient }, { status: 201 })
}
