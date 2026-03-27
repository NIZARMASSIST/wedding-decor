import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// دالة لإنشاء شريط تقدم نصي
function createProgressBar(percent: number): string {
  const length = 20
  const filled = Math.round((percent / 100) * length)
  return '█'.repeat(filled) + '░'.repeat(length - filled)
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')
    const format = searchParams.get('format') || 'xlsx'
    
    // جلب البيانات مع الفلترة حسب المشروع
    const whereClause = projectId ? { projectId } : {}
    
    const items = await db.productionItem.findMany({
      where: whereClause,
      include: {
        project: true,
        stages: {
          include: {
            department: true,
            checklist: true
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

    const projects = projectId 
      ? await db.project.findUnique({ where: { id: projectId } })
      : await db.project.findMany()

    const departments = await db.department.findMany()

    // === حساب البيانات للرسوم البيانية ===
    
    // 1. تقدم المشاريع
    const projectProgress = (Array.isArray(projects) ? projects : [projects]).filter(Boolean).map(project => {
      const projectItems = items.filter(i => i.projectId === project.id)
      const totalStages = projectItems.reduce((sum, i) => sum + i.stages.length, 0)
      const completedStages = projectItems.reduce((sum, i) => 
        sum + i.stages.filter(s => s.status === 'completed').length, 0)
      const progress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0
      return {
        name: project.nameAr || project.name,
        totalStages,
        completedStages,
        progress
      }
    })

    // 2. توزيع المراحل حسب الأقسام
    const departmentStats = departments.map(dept => {
      const deptStages = items.flatMap(i => i.stages).filter(s => s.departmentId === dept.id)
      const completed = deptStages.filter(s => s.status === 'completed').length
      const inProgress = deptStages.filter(s => s.status === 'in_progress').length
      const pending = deptStages.filter(s => s.status === 'pending').length
      return {
        name: dept.nameAr || dept.name,
        color: dept.color,
        total: deptStages.length,
        completed,
        inProgress,
        pending
      }
    })

    // 3. حالة العناصر
    const itemStatusStats = {
      completed: items.filter(i => i.status === 'completed').length,
      inProgress: items.filter(i => i.status === 'in_progress').length,
      pending: items.filter(i => i.status === 'pending').length
    }

    // 4. تقدم Checklist
    const checklistStats = items.flatMap(i => i.stages).map(stage => {
      const total = stage.checklist?.length || 0
      const completed = stage.checklist?.filter(c => c.completed).length || 0
      return {
        stageName: `${stage.stageNumber}. ${stage.department?.nameAr || ''}`,
        total,
        completed,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0
      }
    })

    const projectName = projectId && projects ? 
      ` - ${(projects as any).nameAr || (projects as any).name}` : ''

    // إنشاء workbook
    const workbook = XLSX.utils.book_new()

    // === ورقة الرسوم البيانية (بيانات) ===
    const totalItems = items.length
    const progressPercent = totalItems > 0 ? Math.round((itemStatusStats.completed / totalItems) * 100) : 0

    const chartsData = [
      ['📄 تقرير الوان الخليج لتصنيع ديكور الأعراس' + projectName],
      ['تاريخ التقرير', new Date().toLocaleDateString('ar-SA')],
      [''],
      ['═══════════════════════════════════════════════════════════════'],
      ['📊 الإحصائيات العامة'],
      ['═══════════════════════════════════════════════════════════════'],
      ['المؤشر', 'القيمة', 'النسبة', 'شريط التقدم'],
      ['إجمالي العناصر', totalItems, '100%', createProgressBar(100)],
      ['عناصر مكتملة', itemStatusStats.completed, `${progressPercent}%`, createProgressBar(progressPercent)],
      ['عناصر قيد التنفيذ', itemStatusStats.inProgress, `${Math.round((itemStatusStats.inProgress / Math.max(totalItems, 1)) * 100)}%`, createProgressBar(Math.round((itemStatusStats.inProgress / Math.max(totalItems, 1)) * 100))],
      ['عناصر قيد الانتظار', itemStatusStats.pending, `${Math.round((itemStatusStats.pending / Math.max(totalItems, 1)) * 100)}%`, createProgressBar(Math.round((itemStatusStats.pending / Math.max(totalItems, 1)) * 100))],
      [''],
      ['═══════════════════════════════════════════════════════════════'],
      ['📈 رسم بياني - توزيع الحالة'],
      ['═══════════════════════════════════════════════════════════════'],
      ['الحالة', 'الرسم البياني', 'العدد'],
      ['مكتمل ✓', '█'.repeat(Math.round((itemStatusStats.completed / Math.max(totalItems, 1)) * 30)), itemStatusStats.completed],
      ['قيد التنفيذ ⏳', '▓'.repeat(Math.round((itemStatusStats.inProgress / Math.max(totalItems, 1)) * 30)), itemStatusStats.inProgress],
      ['قيد الانتظار ⏸', '░'.repeat(Math.round((itemStatusStats.pending / Math.max(totalItems, 1)) * 30)), itemStatusStats.pending],
      [''],
      ['═══════════════════════════════════════════════════════════════'],
      ['📊 تقدم المشاريع'],
      ['═══════════════════════════════════════════════════════════════'],
      ['المشروع', 'إجمالي المراحل', 'المكتملة', 'نسبة الإنجاز', 'شريط التقدم'],
      ...projectProgress.map(p => [p.name, p.totalStages, p.completedStages, `${p.progress}%`, createProgressBar(p.progress)]),
      [''],
      ['═══════════════════════════════════════════════════════════════'],
      ['🏭 توزيع المراحل حسب الأقسام'],
      ['═══════════════════════════════════════════════════════════════'],
      ['القسم', 'الإجمالي', 'مكتمل', 'قيد التنفيذ', 'قيد الانتظار', 'نسبة الإنجاز'],
      ...departmentStats.filter(d => d.total > 0).map(d => {
        const deptProgress = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0
        return [d.name, d.total, d.completed, d.inProgress, d.pending, `${deptProgress}%`]
      }),
      [''],
      ['═══════════════════════════════════════════════════════════════'],
      ['✅ تقدم الكميات (Checklist)'],
      ['═══════════════════════════════════════════════════════════════'],
      ['المرحلة', 'الكمية الإجمالية', 'المكتمل', 'نسبة الإنجاز'],
      ...checklistStats.slice(0, 30).map(c => [c.stageName, c.total, c.completed, `${c.progress}%`])
    ]
    const chartsSheet = XLSX.utils.aoa_to_sheet(chartsData)
    
    // ضبط عرض الأعمدة
    chartsSheet['!cols'] = [
      { width: 25 },
      { width: 35 },
      { width: 15 },
      { width: 15 },
      { width: 25 },
      { width: 15 }
    ]
    
    XLSX.utils.book_append_sheet(workbook, chartsSheet, 'الرسوم البيانية')

    // === ورقة ملخص ===
    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['الوان الخليج - تقرير تصنيع ديكور الأعراس' + projectName],
      ['تاريخ التقرير', new Date().toLocaleDateString('ar-SA')],
      [''],
      ['📈 إحصائيات عامة'],
      ['إجمالي العناصر', items.length],
      ['العناصر المكتملة', itemStatusStats.completed],
      ['العناصر قيد التنفيذ', itemStatusStats.inProgress],
      ['العناصر قيد الانتظار', itemStatusStats.pending],
      ['إجمالي المراحل', items.reduce((sum, i) => sum + i.stages.length, 0)],
      ['المراحل المكتملة', items.reduce((sum, i) => 
        sum + i.stages.filter(s => s.status === 'completed').length, 0)],
      [''],
      ['📈 نسبة الإنجاز الكلية'],
      [`${progressPercent}%`]
    ])
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'ملخص')

    // === ورقة العناصر ===
    const itemsHeaders = [
      'م', 'المشروع', 'اسم العنصر', 'الأولوية', 'الكمية', 'الحالة',
      'عدد المراحل', 'الوقت الإجمالي (ساعات)', 'الموعد النهائي', 'ملاحظات'
    ]
    
    const itemsData = items.map((item, index) => {
      const totalTime = item.stages.reduce((sum, s) => sum + s.estimatedTime, 0)
      return [
        index + 1,
        item.project?.nameAr || item.project?.name || '-',
        item.name,
        item.priority,
        item.totalQuantity,
        item.status === 'completed' ? 'مكتمل' : 
          item.status === 'in_progress' ? 'قيد التنفيذ' : 'قيد الانتظار',
        item.stages.length,
        totalTime.toFixed(1),
        item.deadline ? new Date(item.deadline).toLocaleDateString('ar-SA') : '-',
        item.notes || '-'
      ]
    })
    
    const itemsSheet = XLSX.utils.aoa_to_sheet([itemsHeaders, ...itemsData])
    XLSX.utils.book_append_sheet(workbook, itemsSheet, 'العناصر')

    // === ورقة المراحل التفصيلية ===
    const stagesHeaders = [
      'م', 'المشروع', 'العنصر', 'المرحلة', 'القسم', 'الكمية', 
      'الوقت (ساعات)', 'الشفتات', 'الحالة', 'تقدم الكميات', 'ملاحظات'
    ]
    
    let stageIndex = 1
    const stagesData: any[][] = []
    
    for (const item of items) {
      for (const stage of item.stages) {
        const checklistProgress = stage.checklist && stage.checklist.length > 0
          ? `${stage.checklist.filter(c => c.completed).length}/${stage.checklist.length}`
          : '-'
        stagesData.push([
          stageIndex++,
          item.project?.nameAr || item.project?.name || '-',
          item.name,
          stage.stageNumber,
          stage.department?.nameAr || stage.department?.name || '-',
          stage.quantity,
          stage.estimatedTime?.toFixed(1) || '0',
          stage.shifts === 2 ? 'شفتين' : 'شفت واحد',
          stage.status === 'completed' ? 'مكتمل' : 
            stage.status === 'in_progress' ? 'قيد التنفيذ' : 'قيد الانتظار',
          checklistProgress,
          stage.notes || '-'
        ])
      }
    }
    
    const stagesSheet = XLSX.utils.aoa_to_sheet([stagesHeaders, ...stagesData])
    XLSX.utils.book_append_sheet(workbook, stagesSheet, 'المراحل')

    // === ورقة تقدم الكميات ===
    const checklistHeaders = [
      'م', 'المشروع', 'العنصر', 'المرحلة', 'القسم', 'القطعة', 
      'الكمية', 'الحالة', 'تاريخ الإنجاز', 'ملاحظات'
    ]
    
    let checkIndex = 1
    const checklistData: any[][] = []
    
    for (const item of items) {
      for (const stage of item.stages) {
        if (stage.checklist && stage.checklist.length > 0) {
          for (const check of stage.checklist) {
            checklistData.push([
              checkIndex++,
              item.project?.nameAr || item.project?.name || '-',
              item.name,
              stage.stageNumber,
              stage.department?.nameAr || '-',
              check.itemName,
              check.quantity,
              check.completed ? '✓ مكتمل' : '○ غير مكتمل',
              check.completedAt ? new Date(check.completedAt).toLocaleDateString('ar-SA') : '-',
              check.notes || '-'
            ])
          }
        }
      }
    }
    
    if (checklistData.length > 0) {
      const checklistSheet = XLSX.utils.aoa_to_sheet([checklistHeaders, ...checklistData])
      XLSX.utils.book_append_sheet(workbook, checklistSheet, 'تقدم الكميات')
    }

    // === ورقة الأقسام ===
    const deptsHeaders = ['م', 'القسم', 'اللون', 'عدد المراحل', 'المكتملة', 'قيد التنفيذ', 'قيد الانتظار']
    
    const deptsData = departmentStats.map((dept, index) => [
      index + 1,
      dept.name,
      dept.color,
      dept.total,
      dept.completed,
      dept.inProgress,
      dept.pending
    ])
    
    const deptsSheet = XLSX.utils.aoa_to_sheet([deptsHeaders, ...deptsData])
    XLSX.utils.book_append_sheet(workbook, deptsSheet, 'الأقسام')

    // إنشاء الملف
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    
    const fileName = projectId ? 
      `alwan-al-khaleej-${(projects as any)?.nameAr || (projects as any)?.name || 'project'}-${new Date().toISOString().split('T')[0]}.xlsx` :
      `alwan-al-khaleej-report-${new Date().toISOString().split('T')[0]}.xlsx`
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`
      }
    })
  } catch (error) {
    console.error('Error exporting to Excel:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}
