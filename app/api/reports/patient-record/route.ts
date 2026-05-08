import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await requireSession()
  const patientId = new URL(req.url).searchParams.get('patientId')

  if (!patientId) {
    return NextResponse.json({ error: 'patientId obrigatório' }, { status: 400 })
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, clinicId: session.clinicId },
  })

  if (!patient) {
    return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
  }

  const [appointments, medicalRecords, clinic] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId, clinicId: session.clinicId },
      orderBy: { startTime: 'desc' },
      select: {
        startTime: true,
        title: true,
        status: true,
        doctor: { select: { name: true } },
      },
    }),
    prisma.medicalRecord.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        chiefComplaint: true,
        diagnosis: true,
        treatment: true,
        doctor: { select: { name: true } },
      },
    }),
    prisma.clinic.findUnique({
      where: { id: session.clinicId },
      select: { name: true },
    }),
  ])

  return NextResponse.json({
    clinicName: clinic?.name || '',
    patient: {
      name: patient.name,
      cpf: patient.cpf,
      birthDate: patient.birthDate?.toISOString() ?? null,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      address: patient.address,
      bloodType: patient.bloodType,
      allergies: patient.allergies,
    },
    appointments: appointments.map(apt => ({
      startTime: apt.startTime.toISOString(),
      title: apt.title,
      status: apt.status,
      doctorName: apt.doctor.name,
    })),
    medicalRecords: medicalRecords.map(rec => ({
      createdAt: rec.createdAt.toISOString(),
      doctorName: rec.doctor.name,
      chiefComplaint: rec.chiefComplaint,
      diagnosis: rec.diagnosis,
      treatment: rec.treatment,
    })),
  })
}
