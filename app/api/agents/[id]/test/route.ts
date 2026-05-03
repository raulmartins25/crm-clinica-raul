import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { runAgent } from '@/lib/ai'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  const { id } = await params
  const { message, history = [] } = await req.json()

  const agent = await prisma.aIAgent.findFirst({
    where: { id, clinicId: session.clinicId },
    include: {
      clinic: true,
      knowledgeItems: { where: { active: true } },
    },
  })

  if (!agent) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })

  const knowledgeContext = agent.knowledgeItems
    .map((k) => `### ${k.title}\n${k.content}`)
    .join('\n\n')

  const masterPrompt = knowledgeContext
    ? `${agent.masterPrompt}\n\n## Base de Conhecimento\n${knowledgeContext}`
    : agent.masterPrompt

  const response = await runAgent({
    masterPrompt,
    clinicName: agent.clinic.name,
    clinicSpecialty: agent.clinic.specialty || undefined,
    conversationHistory: history,
    userMessage: message,
  })

  return NextResponse.json({ response })
}
