import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await requireSession()

  const agents = await prisma.aIAgent.findMany({
    where: { clinicId: session.clinicId },
    include: {
      _count: { select: { knowledgeItems: true, conversations: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ agents })
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  const body = await req.json()

  const agent = await prisma.aIAgent.create({
    data: {
      clinicId: session.clinicId,
      name: body.name,
      description: body.description || null,
      masterPrompt: body.masterPrompt,
      temperature: body.temperature ?? 0.7,
      model: body.model || 'claude-sonnet-4-6',
      maxTokens: body.maxTokens ?? 1024,
      voiceTone: body.voiceTone || null,
      empathyLevel: body.empathyLevel || null,
      workingHoursStart: body.workingHoursStart || null,
      workingHoursEnd: body.workingHoursEnd || null,
      workingDays: body.workingDays || null,
      awayMessage: body.awayMessage || null,
      transferKeywords: body.transferKeywords || [],
      status: 'ACTIVE',
    },
  })

  return NextResponse.json({ agent }, { status: 201 })
}
