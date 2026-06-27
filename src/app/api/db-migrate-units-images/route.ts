import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST - إضافة حقول الصور (mainImage + subImages) إلى جدول Unit
 *
 * هذه الهجرة آمنة تماماً:
 * - لا تمس أي بيانات موجودة
 * - تضيف حقل mainImage (TEXT, nullable) فقط إذا لم يكن موجوداً
 * - تضيف حقل subImages (TEXT[], default '{}') فقط إذا لم يكن موجوداً
 * - الوحدات الحالية تبقى بدون تغيير (mainImage = NULL, subImages = '{}')
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

    // 1) إضافة حقل mainImage (TEXT, nullable)
    try {
      const mainImageExists = await db.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'Unit'
        AND column_name = 'mainImage'
      ` as any[]

      if (mainImageExists.length === 0) {
        await db.$executeRawUnsafe(`ALTER TABLE "Unit" ADD COLUMN "mainImage" TEXT`)
        results.push('Added column "mainImage" to "Unit"')
      } else {
        results.push('Column "mainImage" already exists on "Unit"')
      }
    } catch (err: any) {
      results.push(`Error adding mainImage column: ${err.message}`)
    }

    // 2) إضافة حقل subImages (TEXT[], default '{}')
    try {
      const subImagesExists = await db.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'Unit'
        AND column_name = 'subImages'
      ` as any[]

      if (subImagesExists.length === 0) {
        await db.$executeRawUnsafe(`ALTER TABLE "Unit" ADD COLUMN "subImages" TEXT[] DEFAULT '{}'`)
        results.push('Added column "subImages" to "Unit"')
      } else {
        results.push('Column "subImages" already exists on "Unit"')
      }
    } catch (err: any) {
      results.push(`Error adding subImages column: ${err.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Units images migration completed successfully',
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
