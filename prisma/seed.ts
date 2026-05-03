import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create clinic
  const clinic = await prisma.clinic.upsert({
    where: { id: 'clinic-1' },
    update: {},
    create: {
      id: 'clinic-1',
      name: 'Clínica Médica Exemplo',
      email: 'contato@clinica.com',
      phone: '(11) 3000-0000',
      address: 'Rua das Flores, 123 - Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
      specialty: 'Clínica Geral',
    },
  })

  console.log('✅ Clinic created:', clinic.name)

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@clinica.com' },
    update: {},
    create: {
      clinicId: clinic.id,
      name: 'Administrador',
      email: 'admin@clinica.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  // Create doctor
  const doctorPassword = await bcrypt.hash('doctor123', 12)
  const doctor = await prisma.user.upsert({
    where: { email: 'dra.silva@clinica.com' },
    update: {},
    create: {
      clinicId: clinic.id,
      name: 'Dra. Ana Silva',
      email: 'dra.silva@clinica.com',
      password: doctorPassword,
      role: 'DOCTOR',
      crm: '12345/SP',
      specialty: 'Clínica Geral',
    },
  })

  // Create receptionist
  const recepPassword = await bcrypt.hash('recep123', 12)
  await prisma.user.upsert({
    where: { email: 'recepcao@clinica.com' },
    update: {},
    create: {
      clinicId: clinic.id,
      name: 'Maria Recepcionista',
      email: 'recepcao@clinica.com',
      password: recepPassword,
      role: 'RECEPTIONIST',
    },
  })

  console.log('✅ Users created')

  // Create sample patients
  const patients = [
    { name: 'João da Silva', phone: '11999887766', email: 'joao@email.com', cpf: '123.456.789-00', city: 'São Paulo', state: 'SP' },
    { name: 'Maria Santos', phone: '11988776655', email: 'maria@email.com', city: 'São Paulo', state: 'SP' },
    { name: 'Pedro Oliveira', phone: '11977665544', city: 'Santo André', state: 'SP' },
    { name: 'Ana Costa', phone: '11966554433', email: 'ana@email.com', city: 'São Bernardo', state: 'SP' },
    { name: 'Carlos Pereira', phone: '11955443322', city: 'Guarulhos', state: 'SP' },
  ]

  for (const p of patients) {
    await prisma.patient.upsert({
      where: { id: `patient-${p.phone}` },
      update: {},
      create: {
        id: `patient-${p.phone}`,
        clinicId: clinic.id,
        ...p,
        birthDate: new Date('1985-06-15'),
        gender: 'M',
      },
    })
  }

  console.log('✅ Patients created')

  // Create default AI agent
  await prisma.aIAgent.upsert({
    where: { id: 'agent-default' },
    update: {},
    create: {
      id: 'agent-default',
      clinicId: clinic.id,
      name: 'Assistente da Clínica',
      description: 'Agente principal para atendimento via WhatsApp',
      status: 'ACTIVE',
      voiceTone: 'friendly',
      empathyLevel: 'medium',
      workingHoursStart: '08:00',
      workingHoursEnd: '18:00',
      awayMessage: 'Olá! Nosso horário de atendimento é de segunda a sexta, das 8h às 18h. Retornaremos em breve! 😊',
      transferKeywords: ['urgente', 'emergência', 'humano', 'atendente'],
      masterPrompt: `Você é o assistente virtual da Clínica Médica Exemplo, especializada em Clínica Geral.

## Seu Papel
Você atende pacientes via WhatsApp, auxiliando com informações, agendamentos e dúvidas gerais.

## Tom de Comunicação
Utilize um tom amigável e acolhedor. Demonstre cuidado e atenção com o paciente.

## Médicos Disponíveis
- Dra. Ana Silva - CRM 12345/SP (Clínica Geral)

## Serviços Oferecidos
- Consulta médica
- Retorno
- Solicitação de exames
- Emissão de atestados
- Receituário

## Horário de Funcionamento
Segunda a Sexta: 8h às 18h
Sábado: 8h às 12h

## Endereço
Rua das Flores, 123 - Centro, São Paulo - SP

## Telefone de Contato
(11) 3000-0000

## Instruções Gerais
- Responda SEMPRE em português brasileiro
- Seja empático, profissional e acolhedor
- Nunca forneça diagnósticos médicos
- Para urgências, oriente o paciente a ligar 192 (SAMU) ou 193 (Bombeiros)
- Encaminhe para agendamento quando pertinente
- Respostas concisas e claras para WhatsApp`,
    },
  })

  console.log('✅ AI Agent created')

  // Create sample appointments
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)

  const patientJoao = await prisma.patient.findFirst({ where: { clinicId: clinic.id, name: 'João da Silva' } })

  if (patientJoao) {
    for (let i = 0; i < 5; i++) {
      const start = new Date(tomorrow)
      start.setHours(9 + i, 0, 0, 0)
      const end = new Date(start)
      end.setHours(start.getHours(), 50, 0, 0)

      await prisma.appointment.create({
        data: {
          clinicId: clinic.id,
          patientId: patientJoao.id,
          doctorId: doctor.id,
          title: 'Consulta',
          startTime: start,
          endTime: end,
          status: i === 0 ? 'CONFIRMED' : 'SCHEDULED',
        },
      })
    }
    console.log('✅ Appointments created')
  }

  console.log('')
  console.log('🎉 Seed completed successfully!')
  console.log('')
  console.log('📋 Login credentials:')
  console.log('  Admin:        admin@clinica.com / admin123')
  console.log('  Doctor:       dra.silva@clinica.com / doctor123')
  console.log('  Receptionist: recepcao@clinica.com / recep123')
  console.log('')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1) })
