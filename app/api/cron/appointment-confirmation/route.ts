import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { EvolutionAPI } from '@/lib/evolution'
import { format, addHours } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const results = { sent: 0, errors: 0 }

    const agents = await prisma.aIAgent.findMany({
      where: { status: 'ACTIVE', appointmentConfirmEnabled: true },
      include: { clinic: { include: { whatsappInstance: true } } },
    })

    for (const agent of agents) {
      if (!agent.clinic.whatsappInstance?.connected) continue

      const hoursAhead = agent.appointmentConfirmHours
      const windowStart = addHours(now, hoursAhead - 0.5)
      const windowEnd = addHours(now, hoursAhead + 0.5)

      const appointments = await prisma.appointment.findMany({
        where: {
          clinicId: agent.clinicId,
          status: 'SCHEDULED',
          reminderSent: false,
          startTime: { gte: windowStart, lte: windowEnd },
        },
        include: { patient: true, doctor: true },
      })

      const evo = new EvolutionAPI({
        baseUrl: agent.clinic.whatsappInstance.baseUrl,
        apiKey: agent.clinic.whatsappInstance.apiKey,
        instanceName: agent.clinic.whatsappInstance.instanceName,
      })

      for (const apt of appointments) {
        const phone = apt.patient.phone
        if (!phone) continue

        const dateStr = format(new Date(apt.startTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
        const text = agent.appointmentConfirmMessage ||
          `Olá, ${apt.patient.name}! 👋\n\nGostaríamos de confirmar sua consulta com *${apt.doctor.name}* no dia *${dateStr}*.\n\nPor favor, responda:\n✅ *SIM* — para confirmar\n❌ *NÃO* — para cancelar\n\nAté breve! 🏥`

        try {
          const number = phone.replace(/\D/g, '')
          await evo.sendText({ number, text })
          await prisma.appointment.update({
            where: { id: apt.id },
            data: { reminderSent: true },
          })
          results.sent++
        } catch (err) {
          console.error(`[appointment-confirmation] Failed for apt ${apt.id}:`, err)
          results.errors++
        }
      }
    }

    return NextResponse.json({ ok: true, ...results })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
