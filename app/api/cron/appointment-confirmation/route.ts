import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
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

    // Find clinics with agents that have appointment confirmation enabled
    const agents = await prisma.aIAgent.findMany({
      where: { status: 'ACTIVE', appointmentConfirmEnabled: true },
      include: { clinic: { include: { whatsappInstance: true } } },
    })

    for (const agent of agents) {
      if (!agent.clinic.whatsappInstance?.connected) continue

      const hoursAhead = agent.appointmentConfirmHours
      const windowStart = addHours(now, hoursAhead - 0.5)
      const windowEnd = addHours(now, hoursAhead + 0.5)

      // Find appointments in the confirmation window that haven't been confirmed yet
      const appointments = await prisma.appointment.findMany({
        where: {
          clinicId: agent.clinicId,
          status: 'SCHEDULED',
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
        const msg = agent.appointmentConfirmMessage ||
          `Olá, ${apt.patient.name}! 👋\n\nGostaríamos de confirmar sua consulta com *${apt.doctor.name}* no dia *${dateStr}*.\n\nPor favor, responda:\n✅ *SIM* — para confirmar\n❌ *NÃO* — para cancelar\n\nAté breve! 🏥`

        try {
          const remoteJid = phone.replace(/\D/g, '') + '@s.whatsapp.net'
          await (evo as any).sendMessage(remoteJid, msg)
          results.sent++
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
