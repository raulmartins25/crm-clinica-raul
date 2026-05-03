import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { EvolutionAPI } from '@/lib/evolution'
import { addHours, isAfter, isBefore } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    // Verify internal cron secret
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const results = { followUps: 0, errors: 0 }

    // Find all active agents with follow-up enabled
    const agents = await prisma.aIAgent.findMany({
      where: { status: 'ACTIVE', followUpEnabled: true },
      include: { clinic: { include: { whatsappInstance: true } } },
    })

    for (const agent of agents) {
      if (!agent.clinic.whatsappInstance?.connected) continue

      const cutoff = new Date(now.getTime() - agent.followUpMinutes * 60 * 1000)

      // Find conversations handled by this agent that have been inactive
      const conversations = await prisma.conversation.findMany({
        where: {
          agentId: agent.id,
          aiEnabled: true,
          lastMessageAt: { lt: cutoff, gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, // not older than 24h
        },
      })

      const evo = new EvolutionAPI({
        baseUrl: agent.clinic.whatsappInstance.baseUrl,
        apiKey: agent.clinic.whatsappInstance.apiKey,
        instanceName: agent.clinic.whatsappInstance.instanceName,
      })

      const followUpMsg = agent.followUpMessage || 
        `Olá! Passamos para verificar se você ainda precisa de ajuda. 😊\nEstamos à disposição!`

      for (const conv of conversations) {
        try {
          await (evo as any).sendMessage(conv.remoteJid, followUpMsg)
          await prisma.conversation.update({
            where: { id: conv.id },
            data: { lastMessageAt: now },
          })
          results.followUps++
        } catch {
          results.errors++
        }
      }
    }

    return NextResponse.json({ ok: true, ...results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
