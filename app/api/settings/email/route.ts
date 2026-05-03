import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  const body = await req.json()

  await prisma.emailConfig.upsert({
    where: { clinicId: session.clinicId },
    update: {
      host: body.host,
      port: Number(body.port),
      secure: body.secure || false,
      user: body.user,
      password: body.password,
      fromName: body.fromName,
      fromEmail: body.fromEmail,
    },
    create: {
      clinicId: session.clinicId,
      host: body.host,
      port: Number(body.port),
      secure: body.secure || false,
      user: body.user,
      password: body.password,
      fromName: body.fromName,
      fromEmail: body.fromEmail,
    },
  })

  return NextResponse.json({ ok: true })
}
