import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://neondb_owner:npg_y4YOfMoX3aKp@ep-jolly-cell-a18luntm-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } } })
const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true } })
console.log(JSON.stringify(users, null, 2))
await prisma.$disconnect()
