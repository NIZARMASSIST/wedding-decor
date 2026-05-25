import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// POST - استيراد المواد من ملف Excel
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = (formData.get('type') as string) || 'raw'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })

    const results = { created: 0, updated: 0, errors: 0, total: 0 }

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json<any>(ws)

      for (const row of data) {
        results.total++
        try {
          // محاولة قراءة البيانات بأسماء الأعمدة المختلفة
          const name = row['اسم المادة'] || row['name'] || row['Name'] || ''
          const nameAr = row['الاسم بالعربي'] || row['nameAr'] || '-'
          const unit = row['الوحدة'] || row['unit'] || row['Unit'] || 'PCS'
          const unitAr = row['الوحدة بالعربي'] || row['unitAr'] || '-'
          const category = row['الفئة'] || row['category'] || row['Category'] || 'GENERAL WORK'
          const categoryAr = row['الفئة بالعربي'] || row['categoryAr'] || '-'
          const unitPrice = parseFloat(row['سعر الوحدة'] || row['unitPrice'] || row['Unit Price'] || 0)
          const stockQuantity = parseInt(row['الكمية في المخزون'] || row['stockQuantity'] || row['Stock Quantity'] || 0)
          const status = row['الحالة'] || row['status'] || row['Status'] || 'active'
          const description = row['الوصف'] || row['description'] || row['Description'] || ''
          const materialType = row['النوع'] || row['type'] || type

          if (!name || !name.trim()) {
            results.errors++
            continue
          }

          // تحقق من وجود المادة بنفس الاسم
          const existing = await db.material.findFirst({
            where: { name: name.trim() }
          })

          if (existing) {
            await db.material.update({
              where: { id: existing.id },
              data: {
                nameAr: nameAr !== '-' ? nameAr : existing.nameAr,
                unit: unit !== 'PCS' ? unit : existing.unit,
                unitAr: unitAr !== '-' ? unitAr : existing.unitAr,
                category: category !== 'GENERAL WORK' ? category : existing.category,
                categoryAr: categoryAr !== '-' ? categoryAr : existing.categoryAr,
                unitPrice: unitPrice || existing.unitPrice,
                stockQuantity: stockQuantity || existing.stockQuantity,
                type: materialType || existing.type,
                description: description || existing.description,
              }
            })
            results.updated++
          } else {
            await db.material.create({
              data: {
                name: name.trim(),
                nameAr: nameAr || '-',
                unit: unit || 'PCS',
                unitAr: unitAr || '-',
                category: category || 'GENERAL WORK',
                categoryAr: categoryAr || '-',
                unitPrice: unitPrice || 0,
                stockQuantity: stockQuantity || 0,
                status: status || 'active',
                type: materialType || type,
                description: description || '',
              }
            })
            results.created++
          }
        } catch (err) {
          console.error('Error importing row:', err)
          results.errors++
        }
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error importing materials:', error)
    return NextResponse.json({ error: 'Failed to import materials' }, { status: 500 })
  }
}
