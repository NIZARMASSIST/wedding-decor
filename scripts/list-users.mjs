import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.production' })
const prisma = new PrismaClient()
try {
  const users = await prisma.user.findMany({ select: { name: true, email: true, role: true, status: true } })
  console.log(JSON.stringify(users, null, 2))
} catch (e) {
  console.error('Error:', e.message)
}
await prisma.$disconnect()
