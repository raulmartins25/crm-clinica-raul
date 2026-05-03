import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession()
  const { id } = await params
  const body = await req.json()

  const item = await prisma.knowledgeItem.create({
    data: {
      agentId: id,
      title: body.title,
      content: body.content,
      category: body.category || null,
      active: true,
    },
  })

  return NextResponse.json({ item }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession()
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('itemId')

  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })

  await prisma.knowledgeItem.delete({ where: { id: itemId, agentId: id } })
  return NextResponse.json({ ok: true })
}
