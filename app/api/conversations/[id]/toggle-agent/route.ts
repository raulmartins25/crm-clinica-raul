import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession()
  const { id } = await params
  const { aiEnabled, agentId } = await req.json()

  const conversation = await prisma.conversation.update({
    where: { id },
    data: { aiEnabled, agentId: agentId || null },
  })

  return NextResponse.json({ conversation })
}
