import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// GET - تصدير المواد كملف Excel
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const type = searchParams.get('type')

    const where: any = {}
    if (category) where.category = category
    if (type) where.type = type

    const materials = await db.material.findMany({
      where,
      orderBy: { category: 'asc' }
    })

    // إنشاء ملف Excel
    const wb = XLSX.utils.book_new()

    // ورقة المواد الأولية
    const rawData = materials.filter(m => m.type === 'raw').map((m, i) => ({
      '#': i + 1,
      'اسم المادة': m.name,
      'الاسم بالعربي': m.nameAr || '-',
      'الوحدة': m.unit,
      'الوحدة بالعربي': m.unitAr || '-',
      'الفئة': m.category,
      'الفئة بالعربي': m.categoryAr || '-',
      'سعر الوحدة': m.unitPrice,
      'الكمية في المخزون': m.stockQuantity,
      'الحالة': m.status,
      'الوصف': m.description || '-',
    }))

    // ورقة المواد التشغيلية
    const operationalData = materials.filter(m => m.type === 'operational').map((m, i) => ({
      '#': i + 1,
      'اسم المادة': m.name,
      'الاسم بالعربي': m.nameAr || '-',
      'الوحدة': m.unit,
      'الوحدة بالعربي': m.unitAr || '-',
      'الفئة': m.category,
      'الفئة بالعربي': m.categoryAr || '-',
      'سعر الوحدة': m.unitPrice,
      'الكمية في المخزون': m.stockQuantity,
      'الحالة': m.status,
      'الوصف': m.description || '-',
    }))

    if (rawData.length > 0) {
      const ws1 = XLSX.utils.json_to_sheet(rawData)
      // تعيين عرض الأعمدة
      ws1['!cols'] = [
        { wch: 5 }, { wch: 50 }, { wch: 20 }, { wch: 8 }, { wch: 12 },
        { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 20 }
      ]
      XLSX.utils.book_append_sheet(wb, ws1, 'المواد الأولية')
    }

    if (operationalData.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(operationalData)
      ws2['!cols'] = [
        { wch: 5 }, { wch: 50 }, { wch: 20 }, { wch: 8 }, { wch: 12 },
        { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 20 }
      ]
      XLSX.utils.book_append_sheet(wb, ws2, 'المواد التشغيلية')
    }

    // إذا لا توجد بيانات، أنشئ ورقة فارغة مع الهيدر
    if (rawData.length === 0 && operationalData.length === 0) {
      const emptyData = [{
        '#': 1,
        'اسم المادة': '',
        'الاسم بالعربي': '',
        'الوحدة': 'PCS',
        'الوحدة بالعربي': '',
        'الفئة': 'CARPENTER',
        'الفئة بالعربي': '',
        'سعر الوحدة': 0,
        'الكمية في المخزون': 0,
        'الحالة': 'active',
        'الوصف': '',
      }]
      const ws = XLSX.utils.json_to_sheet(emptyData)
      ws['!cols'] = [
        { wch: 5 }, { wch: 50 }, { wch: 20 }, { wch: 8 }, { wch: 12 },
        { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 20 }
      ]
      XLSX.utils.book_append_sheet(wb, ws, 'المواد الأولية')
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('مواد-ألوان-الخليج.xlsx')}`
      }
    })
  } catch (error) {
    console.error('Error exporting materials:', error)
    return NextResponse.json({ error: 'Failed to export materials' }, { status: 500 })
  }
}
