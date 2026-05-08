import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { EvolutionAPI } from '@/lib/evolution'
import { getNotificationTemplates } from '@/lib/whatsappTemplates'
import { getCalendarConfig } from '@/lib/calendarConfig'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export async function GET(req: NextRequest) {
  try {
    const secret = new URL(req.url).searchParams.get('secret')
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const results = { sent: 0, errors: 0 }

    // Fetch all eligible appointments (up to 1 year back to cover all return intervals)
    const oneYearAgo = new Date(now.getTime() - 366 * 24 * 60 * 60 * 1000)
    const appointments = await prisma.appointment.findMany({
      where: {
        returnSuggestionSent: false,
        isReturn: false,
        status: 'COMPLETED',
        startTime: { gte: oneYearAgo },
      },
      include: {
        patient: true,
        doctor: true,
        clinic: { include: { whatsappInstance: true } },
      },
    })

    for (const apt of appointments) {
      const phone = apt.patient.phone
      if (!phone) continue
      if (!apt.clinic.whatsappInstance?.connected) {
        console.log(`[return-suggestion] WhatsApp not connected for clinic ${apt.clinic.id}`)
        continue
      }

      // Determine the return interval for this clinic type
      const calConfig = getCalendarConfig(apt.clinic.clinicType)
      const intervalDays = calConfig.returnIntervals[0].days

      // Check if today is within ±12h of the expected return date
      const expectedReturn = new Date(apt.startTime.getTime() + intervalDays * 24 * 60 * 60 * 1000)
      const diffHours = Math.abs(now.getTime() - expectedReturn.getTime()) / (60 * 60 * 1000)
      if (diffHours > 12) continue

      try {
        const suggestedDate = format(
          new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000),
          "dd/MM/yyyy",
          { locale: ptBR },
        )

        const templates = getNotificationTemplates(apt.clinic.clinicType)
        const text = templates.returnSuggestion({
          patientName: apt.patient.name,
          clinicName: apt.clinic.name,
          suggestedDate,
        })

        const evo = new EvolutionAPI({
          baseUrl: apt.clinic.whatsappInstance.baseUrl,
          apiKey: apt.clinic.whatsappInstance.apiKey,
          instanceName: apt.clinic.whatsappInstance.instanceName,
        })

        const number = phone.replace(/\D/g, '')
        await evo.sendText({ number, text })
        await prisma.appointment.update({
          where: { id: apt.id },
          data: { returnSuggestionSent: true },
        })
        results.sent++
      } catch (err) {
        console.error(`[return-suggestion] Failed for apt ${apt.id}:`, err)
        results.errors++
      }
    }

    return NextResponse.json({ ok: true, ...results })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
