import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// GET — تصدير المواد المستعملة إلى Excel
// الاستخدام:
//   /api/materials/export-used                → كل المشاريع
//   /api/materials/export-used?projectId=XXX  → مشروع محدد
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')

    // جلب المواد المستعملة مع تفاصيل المادة والمشروع ومن أضافها
    const whereClause: { projectId?: string } = {}
    if (projectId) whereClause.projectId = projectId

    const usedMaterials = await db.usedMaterial.findMany({
      where: whereClause,
      include: {
        material: true,
        project: { select: { id: true, name: true, nameAr: true, projectDate: true, location: true, recipient: true, executiveManager: true } },
        addedBy: { select: { id: true, name: true } }
      },
      orderBy: [
        { projectId: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    if (usedMaterials.length === 0) {
      return NextResponse.json(
        { error: 'No used materials found' },
        { status: 404 }
      )
    }

    // إعداد صفوف Excel
    const rows = usedMaterials.map((um, idx) => ({
      '#': idx + 1,
      'Project Name (EN)': um.project?.name || '-',
      'اسم المشروع': um.project?.nameAr || um.project?.name || '-',
      'Project Date': um.project?.projectDate
        ? new Date(um.project.projectDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : '-',
      'Location': um.project?.location || '-',
      'Recipient': um.project?.recipient || '-',
      'Executive Manager': um.project?.executiveManager || '-',
      'Material Name (EN)': um.material?.name || '-',
      'اسم المادة': um.material?.nameAr || um.material?.name || '-',
      'Category': um.material?.category || '-',
      'Material Type': um.material?.type === 'raw' ? 'Raw Material' : 'Operational',
      'Unit': um.material?.unit || '-',
      'الوحدة': um.material?.unitAr || um.material?.unit || '-',
      'Unit Price (QR)': um.material?.unitPrice ?? 0,
      'Quantity Used': um.quantity,
      'Total Cost (QR)': ((um.material?.unitPrice ?? 0) * um.quantity).toFixed(2),
      'Notes': um.notes || '',
      'Added By': um.addedBy?.name || '-',
      'Date Added': new Date(um.createdAt).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    }))

    // إنشاء ورقة العمل
    const ws = XLSX.utils.json_to_sheet(rows)

    // تعيين عرض الأعمدة
    ws['!cols'] = [
      { wch: 5 },   // #
      { wch: 25 },  // Project Name EN
      { wch: 25 },  // اسم المشروع
      { wch: 14 },  // Project Date
      { wch: 18 },  // Location
      { wch: 18 },  // Recipient
      { wch: 20 },  // Executive Manager
      { wch: 25 },  // Material Name EN
      { wch: 25 },  // اسم المادة
      { wch: 15 },  // Category
      { wch: 15 },  // Material Type
      { wch: 10 },  // Unit
      { wch: 10 },  // الوحدة
      { wch: 14 },  // Unit Price
      { wch: 12 },  // Quantity Used
      { wch: 14 },  // Total Cost
      { wch: 30 },  // Notes
      { wch: 18 },  // Added By
      { wch: 22 },  // Date Added
    ]

    // إنشاء مصنف وورقة
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Used Materials')

    // ورقة ملخص (Summary) — تجميع حسب المادة
    const summaryMap = new Map<string, {
      materialNameEn: string
      materialNameAr: string
      unit: string
      unitPrice: number
      totalQty: number
      projectsCount: Set<string>
    }>()

    usedMaterials.forEach(um => {
      const key = um.materialId
      const existing = summaryMap.get(key)
      if (existing) {
        existing.totalQty += um.quantity
        existing.projectsCount.add(um.projectId)
      } else {
        summaryMap.set(key, {
          materialNameEn: um.material?.name || '-',
          materialNameAr: um.material?.nameAr || um.material?.name || '-',
          unit: um.material?.unit || '-',
          unitPrice: um.material?.unitPrice ?? 0,
          totalQty: um.quantity,
          projectsCount: new Set([um.projectId])
        })
      }
    })

    const summaryRows = Array.from(summaryMap.entries()).map(([materialId, s], idx) => ({
      '#': idx + 1,
      'Material Name (EN)': s.materialNameEn,
      'اسم المادة': s.materialNameAr,
      'Unit': s.unit,
      'Unit Price (QR)': s.unitPrice,
      'Total Quantity Used': s.totalQty,
      'Total Cost (QR)': (s.unitPrice * s.totalQty).toFixed(2),
      'Used in # Projects': s.projectsCount.size
    }))

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
    wsSummary['!cols'] = [
      { wch: 5 },
      { wch: 25 },
      { wch: 25 },
      { wch: 10 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
    ]
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary by Material')

    // توليد الـ buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // اسم الملف
    const projectLabel = projectId
      ? usedMaterials[0]?.project?.nameAr || usedMaterials[0]?.project?.name || 'project'
      : 'all-projects'
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `used-materials-${projectLabel}-${dateStr}.xlsx`

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': buf.length.toString(),
      }
    })
  } catch (error) {
    console.error('Error exporting used materials:', error)
    return NextResponse.json(
      { error: 'Failed to export used materials' },
      { status: 500 }
    )
  }
}
