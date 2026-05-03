import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await requireSession()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''

  const conversations = await prisma.conversation.findMany({
    where: {
      patient: { clinicId: session.clinicId },
      ...(search
        ? {
            OR: [
              { remoteName: { contains: search, mode: 'insensitive' } },
              { remotePhone: { contains: search } },
              { patient: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: {
      patient: { select: { id: true, name: true, avatarUrl: true } },
      agent: { select: { id: true, name: true } },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 100,
  })

  // Also get conversations not linked to a patient but belonging to clinic instances
  const allConvs = await prisma.conversation.findMany({
    where: {
      patientId: null,
      ...(search
        ? {
            OR: [
              { remoteName: { contains: search, mode: 'insensitive' } },
              { remotePhone: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      patient: { select: { id: true, name: true, avatarUrl: true } },
      agent: { select: { id: true, name: true } },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 50,
  })

  const merged = [...conversations, ...allConvs.filter((c) => !conversations.find((cc) => cc.id === c.id))]
  merged.sort((a, b) => (b.lastMessageAt?.getTime() || 0) - (a.lastMessageAt?.getTime() || 0))

  return NextResponse.json({ conversations: merged })
}
