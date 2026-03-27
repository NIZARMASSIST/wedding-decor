import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // الأقسام الافتراضية
  const departments = [
    { name: 'design', nameAr: 'التصميم', color: '#8B5CF6', icon: 'PenTool' },
    { name: 'cnc', nameAr: 'القطع الرقمي', color: '#3B82F6', icon: 'Scissors' },
    { name: 'carpentry', nameAr: 'النجارة', color: '#F59E0B', icon: 'Hammer' },
    { name: 'blacksmith', nameAr: 'الحدادة', color: '#6B7280', icon: 'Factory' },
    { name: 'sewing', nameAr: 'الخياطة', color: '#EC4899', icon: 'Scissors' },
    { name: 'painting', nameAr: 'الصبغ', color: '#10B981', icon: 'Paintbrush' },
    { name: 'foam', nameAr: 'الفوم', color: '#F97316', icon: 'Box' },
    { name: 'assembly', nameAr: 'التجميع', color: '#06B6D4', icon: 'Puzzle' },
    { name: 'digital_print', nameAr: 'الطباعة الرقمية', color: '#6366F1', icon: 'Printer' },
    { name: 'other', nameAr: 'صناعات أخرى', color: '#84CC16', icon: 'Settings2' },
  ]

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { name: dept.name },
      update: dept,
      create: dept
    })
    console.log(`✓ Added department: ${dept.nameAr}`)
  }

  console.log('\n✅ All departments seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
