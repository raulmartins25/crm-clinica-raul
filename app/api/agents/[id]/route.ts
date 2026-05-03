import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  const { id } = await params

  const agent = await prisma.aIAgent.findFirst({
    where: { id, clinicId: session.clinicId },
    include: {
      knowledgeItems: { orderBy: { createdAt: 'asc' } },
      _count: { select: { conversations: true } },
    },
  })

  if (!agent) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })
  return NextResponse.json({ agent })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  const { id } = await params
  const body = await req.json()

  const agent = await prisma.aIAgent.updateMany({
    where: { id, clinicId: session.clinicId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.masterPrompt !== undefined && { masterPrompt: body.masterPrompt }),
      ...(body.temperature !== undefined && { temperature: body.temperature }),
      ...(body.maxTokens !== undefined && { maxTokens: body.maxTokens }),
      ...(body.voiceTone !== undefined && { voiceTone: body.voiceTone }),
      ...(body.empathyLevel !== undefined && { empathyLevel: body.empathyLevel }),
      ...(body.workingHoursStart !== undefined && { workingHoursStart: body.workingHoursStart }),
      ...(body.workingHoursEnd !== undefined && { workingHoursEnd: body.workingHoursEnd }),
      ...(body.awayMessage !== undefined && { awayMessage: body.awayMessage }),
      ...(body.transferKeywords !== undefined && { transferKeywords: body.transferKeywords }),
      ...(body.status !== undefined && { status: body.status }),
    },
  })

  return NextResponse.json({ updated: agent.count > 0 })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  const { id } = await params

  await prisma.aIAgent.deleteMany({ where: { id, clinicId: session.clinicId } })
  return NextResponse.json({ ok: true })
}
