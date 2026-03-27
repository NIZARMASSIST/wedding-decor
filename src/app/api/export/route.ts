import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  try {
    // جلب جميع البيانات
    const items = await db.productionItem.findMany({
      include: {
        stages: {
          include: {
            department: true
          },
          orderBy: {
            stageNumber: 'asc'
          }
        }
      },
      orderBy: {
        priority: 'asc'
      }
    })

    const departments = await db.department.findMany()
    const attachments = await db.attachment.findMany({
      include: {
        stage: {
          include: {
            item: true,
            department: true
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    })

    // إنشاء workbook جديد
    const workbook = XLSX.utils.book_new()

    // === ورقة ملخص المشروع ===
    const summaryData = [
      ['تقرير تصنيع ديكور الأعراس'],
      ['تاريخ التقرير', new Date().toLocaleDateString('ar-SA')],
      [''],
      ['إحصائيات عامة'],
      ['إجمالي العناصر', items.length],
      ['العناصر المكتملة', items.filter(i => i.status === 'completed').length],
      ['العناصر قيد التنفيذ', items.filter(i => i.status === 'in_progress').length],
      ['العناصر قيد الانتظار', items.filter(i => i.status === 'pending').length],
      ['إجمالي المراحل', items.reduce((sum, i) => sum + i.stages.length, 0)],
      ['إجمالي المرفقات', attachments.length],
    ]
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'ملخص المشروع')

    // === ورقة العناصر ===
    const itemsHeaders = [
      'م',
      'اسم العنصر',
      'الأولوية',
      'الكمية',
      'الحالة',
      'عدد المراحل',
      'الوقت الإجمالي (ساعات)',
      'الموعد النهائي',
      'ملاحظات',
      'تاريخ الإنشاء'
    ]
    
    const itemsData = items.map((item, index) => {
      const totalTime = item.stages.reduce((sum, s) => sum + s.estimatedTime, 0)
      return [
        index + 1,
        item.name,
        item.priority,
        item.totalQuantity,
        item.status === 'completed' ? 'مكتمل' : 
          item.status === 'in_progress' ? 'قيد التنفيذ' : 'قيد الانتظار',
        item.stages.length,
        totalTime,
        item.deadline ? new Date(item.deadline).toLocaleDateString('ar-SA') : '-',
        item.notes || '-',
        new Date(item.createdAt).toLocaleDateString('ar-SA')
      ]
    })
    
    const itemsSheet = XLSX.utils.aoa_to_sheet([itemsHeaders, ...itemsData])
    XLSX.utils.book_append_sheet(workbook, itemsSheet, 'العناصر')

    // === ورقة المراحل ===
    const stagesHeaders = [
      'م',
      'اسم العنصر',
      'رقم المرحلة',
      'القسم',
      'وقت الوحدة (ساعات)',
      'الكمية',
      'الوقت الإجمالي (ساعات)',
      'الشفتات',
      'الحالة',
      'ملاحظات'
    ]
    
    let stageIndex = 1
    const stagesData: any[][] = []
    
    for (const item of items) {
      for (const stage of item.stages) {
        stagesData.push([
          stageIndex++,
          item.name,
          stage.stageNumber,
          stage.department?.nameAr || stage.department?.name || '-',
          stage.timePerUnit || 0,
          stage.quantity,
          stage.estimatedTime || 0,
          stage.shifts === 2 ? 'شفتين' : 'شفت واحد',
          stage.status === 'completed' ? 'مكتمل' : 
            stage.status === 'in_progress' ? 'قيد التنفيذ' : 'قيد الانتظار',
          stage.notes || '-'
        ])
      }
    }
    
    const stagesSheet = XLSX.utils.aoa_to_sheet([stagesHeaders, ...stagesData])
    XLSX.utils.book_append_sheet(workbook, stagesSheet, 'المراحل')

    // === ورقة المرفقات ===
    const attachmentsHeaders = [
      'م',
      'اسم العنصر',
      'القسم',
      'اسم الملف',
      'نوع الملف',
      'حجم الملف',
      'نوع الرفع',
      'الوصف',
      'تاريخ الرفع'
    ]
    
    const attachmentsData = attachments.map((att, index) => {
      const fileSize = att.fileSize < 1024 
        ? `${att.fileSize} بايت`
        : att.fileSize < 1024 * 1024
          ? `${(att.fileSize / 1024).toFixed(1)} كيلوبايت`
          : `${(att.fileSize / (1024 * 1024)).toFixed(1)} ميجابايت`
      
      return [
        index + 1,
        att.stage?.item?.name || '-',
        att.stage?.department?.nameAr || '-',
        att.fileName,
        att.fileType === 'image' ? 'صورة' : 'PDF',
        fileSize,
        att.uploadType === 'work' ? 'أثناء العمل' : 'عند الانتهاء',
        att.description || '-',
        new Date(att.uploadedAt).toLocaleDateString('ar-SA')
      ]
    })
    
    const attachmentsSheet = XLSX.utils.aoa_to_sheet([attachmentsHeaders, ...attachmentsData])
    XLSX.utils.book_append_sheet(workbook, attachmentsSheet, 'المرفقات')

    // === ورقة الأقسام ===
    const deptsHeaders = [
      'م',
      'اسم القسم',
      'Name',
      'عدد المراحل',
      'عدد المرفقات'
    ]
    
    const deptsData = departments.map((dept, index) => {
      const stagesCount = items.reduce((count, item) => 
        count + item.stages.filter(s => s.departmentId === dept.id).length, 0
      )
      const attachmentsCount = attachments.filter(a => a.stage?.departmentId === dept.id).length
      
      return [
        index + 1,
        dept.nameAr,
        dept.name,
        stagesCount,
        attachmentsCount
      ]
    })
    
    const deptsSheet = XLSX.utils.aoa_to_sheet([deptsHeaders, ...deptsData])
    XLSX.utils.book_append_sheet(workbook, deptsSheet, 'الأقسام')

    // === ورقة الجدول الزمني ===
    const scheduleHeaders = [
      'م',
      'اسم العنصر',
      'الأولوية',
      'المراحل',
      'الوقت الإجمالي (ساعات)',
      'الحالة',
      'الموعد النهائي'
    ]
    
    const scheduleData = items.map((item, index) => {
      const totalTime = item.stages.reduce((sum, s) => sum + s.estimatedTime, 0)
      const stagesStr = item.stages
        .map(s => `${s.stageNumber}. ${s.department?.nameAr || '?'}`)
        .join(' → ')
      
      return [
        index + 1,
        item.name,
        item.priority,
        stagesStr || '-',
        totalTime,
        item.status === 'completed' ? 'مكتمل' : 
          item.status === 'in_progress' ? 'قيد التنفيذ' : 'قيد الانتظار',
        item.deadline ? new Date(item.deadline).toLocaleDateString('ar-SA') : '-'
      ]
    })
    
    const scheduleSheet = XLSX.utils.aoa_to_sheet([scheduleHeaders, ...scheduleData])
    XLSX.utils.book_append_sheet(workbook, scheduleSheet, 'الجدول الزمني')

    // إنشاء الملف
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    
    // إرجاع الملف
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="wedding-decor-report-${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    })
  } catch (error) {
    console.error('Error exporting to Excel:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}
