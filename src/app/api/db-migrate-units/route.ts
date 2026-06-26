import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST - إنشاء جدول Unit وإضافة حقل unitId لجدول ProductionItem
 *
 * هذه الهجرة آمنة تماماً:
 * - لا تمس أي بيانات موجودة
 * - تنشئ جدول Unit فقط إذا لم يكن موجوداً
 * - تضيف حقل unitId (NULL افتراضياً) إلى جدول ProductionItem فقط إذا لم يكن موجوداً
 * - كل العناصر الحالية تبقى بدون تغيير (unitId = NULL)
 *
 * المصرّح: فقط من لديه MIGRATION_SECRET
 */
export async function POST(request: NextRequest) {
  try {
    // التحقق من أن الطلب يأتي من مسؤول
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.MIGRATION_SECRET || 'migrate-2024'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results: string[] = []

    // 1) التحقق من وجود جدول Unit، وإنشاؤه إن لم يكن موجوداً
    try {
      const tableExists = await db.$queryRaw`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'Unit'
      ` as any[]

      if (tableExists.length === 0) {
        // إنشاء جدول Unit
        await db.$executeRawUnsafe(`
          CREATE TABLE "Unit" (
            "id" TEXT NOT NULL,
            "projectId" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "nameAr" TEXT,
            "description" TEXT,
            "order" INTEGER NOT NULL DEFAULT 0,
            "status" TEXT NOT NULL DEFAULT 'active',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
          )
        `)
        // إنشاء الفهرس
        await db.$executeRawUnsafe(`CREATE INDEX "Unit_projectId_idx" ON "Unit"("projectId")`)
        // إنشاء المفتاح الأجنبي
        await db.$executeRawUnsafe(`
          ALTER TABLE "Unit"
          ADD CONSTRAINT "Unit_projectId_fkey"
          FOREIGN KEY ("projectId") REFERENCES "Project"("id")
          ON DELETE CASCADE
        `)
        results.push('Created table "Unit" with index and foreign key')
      } else {
        results.push('Table "Unit" already exists')
      }
    } catch (err: any) {
      results.push(`Error creating Unit table: ${err.message}`)
    }

    // 2) إضافة حقل unitId لجدول ProductionItem (NULL افتراضياً)
    try {
      const columnExists = await db.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'ProductionItem'
        AND column_name = 'unitId'
      ` as any[]

      if (columnExists.length === 0) {
        await db.$executeRawUnsafe(`ALTER TABLE "ProductionItem" ADD COLUMN "unitId" TEXT`)
        results.push('Added column "unitId" to "ProductionItem"')
      } else {
        results.push('Column "unitId" already exists on "ProductionItem"')
      }
    } catch (err: any) {
      results.push(`Error adding unitId column: ${err.message}`)
    }

    // 3) إنشاء الفهرس على unitId إذا لم يكن موجوداً
    try {
      const indexExists = await db.$queryRaw`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'ProductionItem'
        AND indexname = 'ProductionItem_unitId_idx'
      ` as any[]

      if (indexExists.length === 0) {
        await db.$executeRawUnsafe(`CREATE INDEX "ProductionItem_unitId_idx" ON "ProductionItem"("unitId")`)
        results.push('Created index "ProductionItem_unitId_idx"')
      } else {
        results.push('Index "ProductionItem_unitId_idx" already exists')
      }
    } catch (err: any) {
      results.push(`Error creating unitId index: ${err.message}`)
    }

    // 4) إنشاء المفتاح الأجنبي بين ProductionItem.unitId و Unit.id
    try {
      const fkExists = await db.$queryRaw`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'ProductionItem'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = 'ProductionItem_unitId_fkey'
      ` as any[]

      if (fkExists.length === 0) {
        await db.$executeRawUnsafe(`
          ALTER TABLE "ProductionItem"
          ADD CONSTRAINT "ProductionItem_unitId_fkey"
          FOREIGN KEY ("unitId") REFERENCES "Unit"("id")
          ON DELETE SET NULL
        `)
        results.push('Created foreign key "ProductionItem_unitId_fkey"')
      } else {
        results.push('Foreign key "ProductionItem_unitId_fkey" already exists')
      }
    } catch (err: any) {
      results.push(`Error creating unitId foreign key: ${err.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Units migration completed successfully',
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
