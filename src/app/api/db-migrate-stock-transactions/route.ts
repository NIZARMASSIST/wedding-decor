import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST - إضافة حقول المخزون الجديدة وإنشاء جدول StockTransaction
 *
 * التغييرات:
 * 1) Material: إضافة itemCode (TEXT UNIQUE), department (TEXT), minStockLevel (FLOAT)
 * 2) Material: تغيير stockQuantity من INT إلى FLOAT (لدعم الكسور مثل 1.5 متر)
 * 3) UsedMaterial: إضافة price (FLOAT), department (TEXT), transactionId (TEXT)
 * 4) UsedMaterial: تغيير quantity من INT إلى FLOAT
 * 5) إنشاء جدول StockTransaction كامل
 *
 * المصرّح: فقط من لديه MIGRATION_SECRET
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.MIGRATION_SECRET || 'migrate-2024'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results: string[] = []

    // 1) إضافة حقول جديدة لجدول Material
    const materialColumns: Array<{ name: string; type: string; unique?: boolean }> = [
      { name: 'itemCode', type: 'TEXT', unique: true },
      { name: 'department', type: 'TEXT' },
      { name: 'minStockLevel', type: 'FLOAT8' }
    ]

    for (const col of materialColumns) {
      try {
        const colExists = await db.$queryRaw`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'Material'
          AND column_name = ${col.name}
        ` as any[]

        if (colExists.length === 0) {
          const uniqueClause = col.unique ? ' UNIQUE' : ''
          await db.$executeRawUnsafe(`ALTER TABLE "Material" ADD COLUMN "${col.name}" ${col.type}${uniqueClause}`)
          results.push(`Added column "${col.name}" to "Material"`)
        } else {
          results.push(`Column "${col.name}" already exists on "Material"`)
        }
      } catch (err: any) {
        results.push(`Error adding Material.${col.name}: ${err.message}`)
      }
    }

    // 2) تغيير نوع stockQuantity من INT إلى FLOAT (لدعم الكسور)
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "Material" ALTER COLUMN "stockQuantity" TYPE DOUBLE PRECISION USING "stockQuantity"::DOUBLE PRECISION`)
      results.push('Changed Material.stockQuantity type to DOUBLE PRECISION')
    } catch (err: any) {
      results.push(`Error changing Material.stockQuantity type: ${err.message}`)
    }

    // 3) إضافة حقول جديدة لجدول UsedMaterial
    const usedMaterialColumns: Array<{ name: string; type: string }> = [
      { name: 'price', type: 'FLOAT8' },
      { name: 'department', type: 'TEXT' },
      { name: 'transactionId', type: 'TEXT' }
    ]

    for (const col of usedMaterialColumns) {
      try {
        const colExists = await db.$queryRaw`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'UsedMaterial'
          AND column_name = ${col.name}
        ` as any[]

        if (colExists.length === 0) {
          await db.$executeRawUnsafe(`ALTER TABLE "UsedMaterial" ADD COLUMN "${col.name}" ${col.type}`)
          results.push(`Added column "${col.name}" to "UsedMaterial"`)
        } else {
          results.push(`Column "${col.name}" already exists on "UsedMaterial"`)
        }
      } catch (err: any) {
        results.push(`Error adding UsedMaterial.${col.name}: ${err.message}`)
      }
    }

    // 4) تغيير نوع quantity في UsedMaterial من INT إلى FLOAT
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "UsedMaterial" ALTER COLUMN "quantity" TYPE DOUBLE PRECISION USING "quantity"::DOUBLE PRECISION`)
      results.push('Changed UsedMaterial.quantity type to DOUBLE PRECISION')
    } catch (err: any) {
      results.push(`Error changing UsedMaterial.quantity type: ${err.message}`)
    }

    // 5) إنشاء جدول StockTransaction
    try {
      const tableExists = await db.$queryRaw`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'StockTransaction'
      ` as any[]

      if (tableExists.length === 0) {
        await db.$executeRawUnsafe(`
          CREATE TABLE "StockTransaction" (
            "id" TEXT NOT NULL,
            "materialId" TEXT,
            "projectId" TEXT,
            "itemCode" TEXT,
            "description" TEXT,
            "uom" TEXT,
            "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "deliveryQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "department" TEXT,
            "balanceAfter" DOUBLE PRECISION,
            "type" TEXT NOT NULL DEFAULT 'delivery',
            "notes" TEXT,
            "reference" TEXT,
            "createdById" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id")
          )
        `)
        results.push('Created table "StockTransaction"')

        // إنشاء الفهارس
        const indexes = [
          { name: 'StockTransaction_materialId_idx', col: 'materialId' },
          { name: 'StockTransaction_projectId_idx', col: 'projectId' },
          { name: 'StockTransaction_date_idx', col: 'date' },
          { name: 'StockTransaction_department_idx', col: 'department' },
          { name: 'StockTransaction_type_idx', col: 'type' },
          { name: 'StockTransaction_itemCode_idx', col: 'itemCode' }
        ]

        for (const idx of indexes) {
          try {
            await db.$executeRawUnsafe(`CREATE INDEX "${idx.name}" ON "StockTransaction"("${idx.col}")`)
            results.push(`Created index "${idx.name}"`)
          } catch (err: any) {
            results.push(`Index "${idx.name}" already exists or error: ${err.message}`)
          }
        }

        // إنشاء المفاتيح الأجنبية
        try {
          await db.$executeRawUnsafe(`
            ALTER TABLE "StockTransaction"
            ADD CONSTRAINT "StockTransaction_materialId_fkey"
            FOREIGN KEY ("materialId") REFERENCES "Material"("id")
            ON DELETE SET NULL
          `)
          results.push('Created FK StockTransaction.materialId -> Material.id')
        } catch (err: any) {
          results.push(`FK materialId error: ${err.message}`)
        }

        try {
          await db.$executeRawUnsafe(`
            ALTER TABLE "StockTransaction"
            ADD CONSTRAINT "StockTransaction_projectId_fkey"
            FOREIGN KEY ("projectId") REFERENCES "Project"("id")
            ON DELETE SET NULL
          `)
          results.push('Created FK StockTransaction.projectId -> Project.id')
        } catch (err: any) {
          results.push(`FK projectId error: ${err.message}`)
        }
      } else {
        results.push('Table "StockTransaction" already exists')
      }
    } catch (err: any) {
      results.push(`Error creating StockTransaction table: ${err.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Stock transactions migration completed successfully',
      results
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
