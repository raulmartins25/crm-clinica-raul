import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await requireSession()
  const clinic = await prisma.clinic.findUnique({
    where: { id: session.clinicId },
  })
  return NextResponse.json({ clinic })
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession()
  const body = await req.json()
  const clinic = await prisma.clinic.update({
    where: { id: session.clinicId },
    data: {
      name: body.name,
      cnpj: body.cnpj,
      phone: body.phone,
      email: body.email,
      address: body.address,
      city: body.city,
      state: body.state,
      zipCode: body.zipCode,
      website: body.website,
      specialty: body.specialty,
      logoUrl: body.logoUrl,
    },
  })
  return NextResponse.json({ clinic })
}
