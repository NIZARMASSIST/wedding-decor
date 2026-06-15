import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log('📦 Starting materials import...\n');

  // Load the updated seed file
  const materials = JSON.parse(fs.readFileSync('./seed-materials.json', 'utf-8'));
  
  console.log(`Total materials in seed file: ${materials.length}`);
  
  // Count by type
  const rawCount = materials.filter(m => m.type === 'raw').length;
  const opCount = materials.filter(m => m.type === 'operational').length;
  console.log(`  Raw materials: ${rawCount}`);
  console.log(`  Operational materials: ${opCount}\n`);

  // Get existing materials from DB
  const existing = await prisma.material.findMany();
  console.log(`Existing materials in DB: ${existing.length}`);
  
  const existingByName = new Map(existing.map(m => [m.name.toLowerCase().trim(), m]));

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const mat of materials) {
    const key = mat.name.toLowerCase().trim();
    const existingMat = existingByName.get(key);

    if (existingMat) {
      // Update if price or category changed
      if (existingMat.unitPrice !== mat.unitPrice || existingMat.category !== mat.category || existingMat.type !== mat.type || existingMat.unit !== mat.unit) {
        await prisma.material.update({
          where: { id: existingMat.id },
          data: {
            unitPrice: mat.unitPrice,
            category: mat.category,
            type: mat.type,
            unit: mat.unit,
          }
        });
        updated++;
      } else {
        skipped++;
      }
    } else {
      // Create new material
      await prisma.material.create({
        data: {
          name: mat.name,
          nameAr: mat.nameAr || null,
          unit: mat.unit,
          unitAr: mat.unitAr || null,
          category: mat.category,
          categoryAr: mat.categoryAr || null,
          unitPrice: mat.unitPrice,
          stockQuantity: mat.stockQuantity || 0,
          type: mat.type || 'raw',
          status: 'active',
        }
      });
      created++;
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (unchanged): ${skipped}`);
  console.log(`  Total in DB now: ${existing.length + created}`);

  // Verify final count
  const finalCount = await prisma.material.findMany();
  const finalRaw = finalCount.filter(m => m.type === 'raw').length;
  const finalOp = finalCount.filter(m => m.type === 'operational').length;
  console.log(`\n📊 DB Stats:`);
  console.log(`  Raw materials: ${finalRaw}`);
  console.log(`  Operational materials: ${finalOp}`);
  console.log(`  Total: ${finalCount.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
