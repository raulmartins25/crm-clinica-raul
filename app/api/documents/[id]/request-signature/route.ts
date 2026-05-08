import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession()
  const { id } = await params

  // Validate document belongs to this clinic
  const document = await prisma.document.findFirst({
    where: { id, patient: { clinicId: session.clinicId } },
  })
  if (!document) {
    return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
  }

  if (document.signatureStatus === 'SIGNED') {
    return NextResponse.json({ error: 'Documento já foi assinado' }, { status: 409 })
  }

  const signatureToken = randomBytes(32).toString('hex')

  await prisma.document.update({
    where: { id },
    data: {
      signatureToken,
      signatureStatus: 'PENDING',
    },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const link = `${appUrl}/sign/${signatureToken}`

  return NextResponse.json({ link, token: signatureToken })
}
