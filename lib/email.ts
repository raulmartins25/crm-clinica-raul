import nodemailer from 'nodemailer'
import { prisma } from './db'

export async function getEmailTransporter(clinicId: string) {
  const config = await prisma.emailConfig.findUnique({ where: { clinicId } })
  if (!config) throw new Error('Email não configurado para esta clínica')

  return {
    transporter: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.password },
    }),
    from: `"${config.fromName}" <${config.fromEmail}>`,
  }
}

export async function sendEmail(
  clinicId: string,
  to: string,
  subject: string,
  html: string,
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>
) {
  const { transporter, from } = await getEmailTransporter(clinicId)
  return transporter.sendMail({ from, to, subject, html, attachments })
}

export function buildAppointmentReminderEmail(data: {
  patientName: string
  doctorName: string
  clinicName: string
  date: string
  time: string
  address?: string
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0ea5e9; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Lembrete de Consulta</h2>
        <p style="margin: 4px 0 0;">${data.clinicName}</p>
      </div>
      <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>Olá, <strong>${data.patientName}</strong>!</p>
        <p>Este é um lembrete da sua consulta:</p>
        <div style="background: white; border-left: 4px solid #0ea5e9; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0;"><strong>Médico:</strong> ${data.doctorName}</p>
          <p style="margin: 8px 0 0;"><strong>Data:</strong> ${data.date}</p>
          <p style="margin: 8px 0 0;"><strong>Horário:</strong> ${data.time}</p>
          ${data.address ? `<p style="margin: 8px 0 0;"><strong>Local:</strong> ${data.address}</p>` : ''}
        </div>
        <p style="color: #64748b; font-size: 14px;">
          Para cancelar ou reagendar, entre em contato conosco com antecedência.
        </p>
      </div>
    </div>
  `
}
