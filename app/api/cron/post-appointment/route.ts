import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { EvolutionAPI } from '@/lib/evolution'
import { getNotificationTemplates } from '@/lib/whatsappTemplates'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export async function GET(req: NextRequest) {
  try {
    const secret = new URL(req.url).searchParams.get('secret')
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const results = { sent: 0, errors: 0 }

    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'COMPLETED',
        postAppointmentSent: false,
        endTime: { gte: twoHoursAgo, lte: now },
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
        console.log(`[post-appointment] WhatsApp not connected for clinic ${apt.clinic.id}`)
        continue
      }

      try {
        const templates = getNotificationTemplates(apt.clinic.clinicType)
        const text = templates.postAppointment({
          patientName: apt.patient.name,
          doctorName: apt.doctor.name,
          clinicName: apt.clinic.name,
          appointmentType: apt.title,
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
          data: { postAppointmentSent: true },
        })
        results.sent++
      } catch (err) {
        console.error(`[post-appointment] Failed for apt ${apt.id}:`, err)
        results.errors++
      }
    }

    return NextResponse.json({ ok: true, ...results })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
