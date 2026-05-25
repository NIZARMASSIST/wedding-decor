import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST - إضافة الأعمدة الجديدة لجدول المشاريع
export async function POST(request: NextRequest) {
  try {
    // التحقق من أن الطلب يأتي من مسؤول
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.MIGRATION_SECRET || 'migrate-2024'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results: string[] = []

    // إضافة الأعمدة الجديدة إذا لم تكن موجودة
    const columns = [
      { name: 'projectDate', type: 'TIMESTAMP', default: null },
      { name: 'location', type: 'TEXT', default: null },
      { name: 'recipient', type: 'TEXT', default: null },
      { name: 'executiveManager', type: 'TEXT', default: null },
      { name: 'notesAuthor', type: 'TEXT', default: null },
    ]

    for (const col of columns) {
      try {
        // Check if column exists
        const checkResult = await db.$queryRaw`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'Project' 
          AND column_name = ${col.name}
        ` as any[]
        
        if (checkResult.length === 0) {
          const def = col.default ? ` DEFAULT ${col.default}` : ''
          await db.$executeRawUnsafe(`ALTER TABLE "Project" ADD COLUMN "${col.name}" ${col.type}${def}`)
          results.push(`Added column ${col.name}`)
        } else {
          results.push(`Column ${col.name} already exists`)
        }
      } catch (err: any) {
        results.push(`Error with column ${col.name}: ${err.message}`)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database schema migration completed',
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
