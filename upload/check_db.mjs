import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const stages = await prisma.stage.findMany({
    take: 5,
    include: { department: true, item: true }
  })
  console.log(JSON.stringify(stages, null, 2))
}

main().then(() => prisma.$disconnect())
