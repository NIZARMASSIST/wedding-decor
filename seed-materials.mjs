// سكربت استيراد المواد الأولية من ملف JSON إلى قاعدة البيانات
import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function main() {
  const materialsData = JSON.parse(fs.readFileSync('seed-materials.json', 'utf-8'))
  
  console.log(`Importing ${materialsData.length} materials...`)
  
  let created = 0
  let updated = 0
  let errors = 0
  
  for (const mat of materialsData) {
    try {
      const existing = await prisma.material.findFirst({
        where: { name: mat.name }
      })
      
      if (existing) {
        await prisma.material.update({
          where: { id: existing.id },
          data: {
            nameAr: mat.nameAr !== '-' ? mat.nameAr : existing.nameAr,
            unit: mat.unit || existing.unit,
            unitAr: mat.unitAr !== '-' ? mat.unitAr : existing.unitAr,
            category: mat.category || existing.category,
            categoryAr: mat.categoryAr !== '-' ? mat.categoryAr : existing.categoryAr,
            unitPrice: mat.unitPrice || existing.unitPrice,
            stockQuantity: mat.stockQuantity || existing.stockQuantity,
            type: mat.type || existing.type,
          }
        })
        updated++
      } else {
        await prisma.material.create({
          data: {
            name: mat.name,
            nameAr: mat.nameAr || '-',
            unit: mat.unit || 'PCS',
            unitAr: mat.unitAr || '-',
            category: mat.category || 'GENERAL WORK',
            categoryAr: mat.categoryAr || '-',
            unitPrice: mat.unitPrice || 0,
            stockQuantity: mat.stockQuantity || 0,
            status: 'active',
            type: mat.type || 'raw',
            description: '',
          }
        })
        created++
      }
    } catch (err) {
      console.error(`Error importing: ${mat.name}`, err.message)
      errors++
    }
  }
  
  console.log(`\nImport complete!`)
  console.log(`Created: ${created}`)
  console.log(`Updated: ${updated}`)
  console.log(`Errors: ${errors}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
