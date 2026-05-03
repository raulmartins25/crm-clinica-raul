import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession()
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor')
  const limit = 50

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { timestamp: 'desc' },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { sentBy: { select: { id: true, name: true, avatarUrl: true } } },
  })

  await prisma.conversation.update({
    where: { id },
    data: { unreadCount: 0 },
  })

  return NextResponse.json({ messages: messages.reverse() })
}
