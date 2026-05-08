import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const body = await request.json()
  const { signerName, signerCpf, signatureBase64 } = body

  // Validate inputs
  if (!signerName || typeof signerName !== 'string' || !signerName.trim()) {
    return NextResponse.json({ error: 'Nome do signatário é obrigatório' }, { status: 400 })
  }
  if (!signerCpf || String(signerCpf).replace(/\D/g, '').length !== 11) {
    return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
  }
  if (!signatureBase64) {
    return NextResponse.json({ error: 'Assinatura é obrigatória' }, { status: 400 })
  }

  // Find document by token
  const document = await prisma.document.findUnique({
    where: { signatureToken: token },
  })

  if (!document) {
    return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 404 })
  }

  if (document.signatureStatus !== 'PENDING') {
    return NextResponse.json({ error: 'Documento já foi assinado ou não está disponível para assinatura' }, { status: 409 })
  }

  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const now = new Date()

  await prisma.document.update({
    where: { signatureToken: token },
    data: {
      signatureStatus: 'SIGNED',
      signedAt: now,
      signerName: signerName.trim(),
      signerCpf: String(signerCpf).replace(/\D/g, ''),
      signatureImageUrl: signatureBase64,
      ipAddress,
    },
  })

  return NextResponse.json({ success: true, signedAt: now })
}
