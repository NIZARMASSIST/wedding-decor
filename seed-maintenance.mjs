import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Creating maintenance account...\n')

  const email = 'maintenance@alwankhaleej.com'
  const password = 'maintenance123'
  const name = 'صيانة - Maintenance'

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'maintenance',
      status: 'active',
      password: passwordHash,
      name,
    },
    create: {
      name,
      email,
      password: passwordHash,
      phone: null,
      role: 'maintenance',
      status: 'active',
    },
  })

  console.log('✅ Maintenance account created/updated successfully!\n')
  console.log('═══════════════════════════════════════════════')
  console.log('  Login credentials:')
  console.log('═══════════════════════════════════════════════')
  console.log(`  Email:    ${user.email}`)
  console.log(`  Password: ${password}`)
  console.log(`  Role:     ${user.role}`)
  console.log(`  Status:   ${user.status}`)
  console.log('═══════════════════════════════════════════════')
  console.log('\n🔐 This account has FULL admin permissions:')
  console.log('  - Manage all users (view, edit, delete, change roles)')
  console.log('  - Manage all projects (create, edit, delete)')
  console.log('  - Manage all materials (raw, operational, used)')
  console.log('  - View changelog and notifications')
  console.log('  - Manage chat messages')
  console.log('  - Cannot be deleted (protected)')
}

main()
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
