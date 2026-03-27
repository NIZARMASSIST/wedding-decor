import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const items = await prisma.productionItem.findMany({
    include: { stages: true }
  })
  console.log('Items count:', items.length)
  console.log(JSON.stringify(items, null, 2))
}

main().then(() => prisma.$disconnect())
