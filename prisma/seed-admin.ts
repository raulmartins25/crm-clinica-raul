import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Ensuring admin@admin.com exists...')

  // Use clinic-1 as the target clinic (already exists from seed)
  const clinic = await prisma.clinic.findUnique({ where: { id: 'clinic-1' } })
  if (!clinic) {
    throw new Error('Clínica clinic-1 não encontrada. Rode o seed principal primeiro.')
  }
  console.log(`✅ Clinic found: ${clinic.name}`)

  // Upsert admin@admin.com
  const passwordHash = await bcrypt.hash('admin123', 12)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@admin.com' },
    update: { role: 'ADMIN' },
    create: {
      clinicId: clinic.id,
      name: 'Admin',
      email: 'admin@admin.com',
      password: passwordHash,
      role: 'ADMIN',
    },
  })
  console.log(`✅ User admin@admin.com — role: ${adminUser.role}`)

  // Ensure clinic has clinicType + onboardingCompleted
  await prisma.clinic.update({
    where: { id: clinic.id },
    data: {
      clinicType: clinic.clinicType ?? 'MEDICA',
      onboardingCompleted: true,
    },
  })
  console.log(`✅ Clinic updated: onboardingCompleted=true, clinicType=${clinic.clinicType ?? 'MEDICA'}`)

  console.log('\n🎉 Admin seed completed!')
  console.log('   Login: admin@admin.com / admin123')
  console.log('   Dashboard: /dashboard')
  console.log('   Admin panel: /admin')
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error('❌ Seed failed:', e.message)
    prisma.$disconnect()
    process.exit(1)
  })
