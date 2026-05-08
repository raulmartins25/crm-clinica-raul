import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await requireSession()
  const month = new URL(req.url).searchParams.get('month')

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Formato de mês inválido (esperado: YYYY-MM)' }, { status: 400 })
  }

  const [year, monthNum] = month.split('-').map(Number)
  const start = new Date(year, monthNum - 1, 1)
  const end = new Date(year, monthNum, 1)

  const [appointments, newPatients, clinic] = await Promise.all([
    prisma.appointment.findMany({
      where: { clinicId: session.clinicId, startTime: { gte: start, lt: end } },
      select: {
        status: true,
        price: true,
        title: true,
        doctor: { select: { name: true } },
      },
    }),
    prisma.patient.count({
      where: { clinicId: session.clinicId, createdAt: { gte: start, lt: end } },
    }),
    prisma.clinic.findUnique({
      where: { id: session.clinicId },
      select: { name: true },
    }),
  ])

  const byStatus: Record<string, number> = {}
  const byDoctorMap: Record<string, { count: number; revenue: number }> = {}
  let revenue = 0

  for (const apt of appointments) {
    byStatus[apt.status] = (byStatus[apt.status] || 0) + 1
    const doctorName = apt.doctor.name
    if (!byDoctorMap[doctorName]) byDoctorMap[doctorName] = { count: 0, revenue: 0 }
    byDoctorMap[doctorName].count++
    if (apt.price) {
      byDoctorMap[doctorName].revenue += apt.price
      revenue += apt.price
    }
  }

  const byDoctor = Object.entries(byDoctorMap)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({
    month,
    clinicName: clinic?.name || '',
    total: appointments.length,
    byStatus,
    byDoctor,
    revenue,
    newPatients,
  })
}
