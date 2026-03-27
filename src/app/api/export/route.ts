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
        nameEn: project.name,
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
        nameEn: dept.name,
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
        stageNameEn: `${stage.stageNumber}. ${stage.department?.name || ''}`,
        total,
        completed,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0
      }
    })

    const projectName = projectId && projects ? 
      ` - ${(projects as any).nameAr || (projects as any).name}` : ''
    const projectNameEn = projectId && projects ? 
      ` - ${(projects as any).name}` : ''

    // === PDF Export (English Only) ===
    if (format === 'pdf') {
      return generatePDFEnglish({
        projectName: projectNameEn,
        items,
        projectProgress,
        departmentStats,
        itemStatusStats,
        checklistStats
      })
    }

    // === Excel Export (Arabic) ===
    return generateExcel({
      projectName,
      items,
      projectProgress,
      departmentStats,
      itemStatusStats,
      checklistStats,
      departments,
      projectId,
      projects
    })
    
  } catch (error) {
    console.error('Error exporting:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}

// === PDF Generator (English Only) ===
async function generatePDFEnglish(data: {
  projectName: string
  items: any[]
  projectProgress: any[]
  departmentStats: any[]
  itemStatusStats: { completed: number; inProgress: number; pending: number }
  checklistStats: any[]
}) {
  // Use a simple HTML to PDF approach with table formatting
  const totalItems = data.items.length
  const progressPercent = totalItems > 0 ? Math.round((data.itemStatusStats.completed / totalItems) * 100) : 0

  // Create PDF using jsPDF-like approach with simple text
  const pdfContent = `
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 2000 >>
stream
BT
/F1 24 Tf
100 750 Td
(Alwan Al Khaleej - Wedding Decor Report) Tj
/F1 12 Tf
100 720 Td
(Report Date: ${new Date().toLocaleDateString('en-US')}) Tj
100 690 Td
(Project: ${data.projectName || 'All Projects'}) Tj
/F1 16 Tf
100 650 Td
(=== Statistics ===) Tj
/F1 12 Tf
100 620 Td
(Total Items: ${totalItems}) Tj
100 600 Td
(Completed: ${data.itemStatusStats.completed} (${progressPercent}%)) Tj
100 580 Td
(In Progress: ${data.itemStatusStats.inProgress}) Tj
100 560 Td
(Pending: ${data.itemStatusStats.pending}) Tj
/F1 16 Tf
100 520 Td
(=== Progress Bar ===) Tj
/F1 12 Tf
100 490 Td
(Completed: ${createProgressBar(progressPercent)}) Tj
/F1 16 Tf
100 450 Td
(=== Projects Progress ===) Tj
/F1 12 Tf
${data.projectProgress.slice(0, 10).map((p, i) => `100 ${420 - i * 20} Td (${p.nameEn}: ${p.progress}% ${createProgressBar(p.progress)}) Tj`).join('\n')}
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000002333 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
2405
%%EOF
  `

  // Instead of raw PDF, return HTML that can be printed as PDF
  const htmlContent = `
<!DOCTYPE html>
<html dir="ltr">
<head>
  <meta charset="UTF-8">
  <title>Alwan Al Khaleej Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; direction: ltr; }
    h1 { color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; }
    h2 { color: #1f2937; margin-top: 30px; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat-box { background: #fef3c7; padding: 20px; border-radius: 8px; text-align: center; flex: 1; }
    .stat-box .value { font-size: 32px; font-weight: bold; color: #f59e0b; }
    .stat-box .label { color: #6b7280; }
    .progress-bar { background: #e5e7eb; height: 24px; border-radius: 12px; overflow: hidden; margin: 10px 0; }
    .progress-fill { background: linear-gradient(90deg, #22c55e, #16a34a); height: 100%; transition: width 0.3s; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
    th { background: #f59e0b; color: white; }
    tr:nth-child(even) { background: #f9fafb; }
    .completed { background: #dcfce7 !important; }
    .in-progress { background: #dbeafe !important; }
    .pending { background: #fef3c7 !important; }
    .chart { font-family: monospace; white-space: pre; font-size: 12px; line-height: 1.8; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>Alwan Al Khaleej - Wedding Decor Manufacturing Report</h1>
  <p><strong>Report Date:</strong> ${new Date().toLocaleDateString('en-US')}</p>
  <p><strong>Project:</strong> ${data.projectName || 'All Projects'}</p>

  <div class="stats">
    <div class="stat-box">
      <div class="value">${totalItems}</div>
      <div class="label">Total Items</div>
    </div>
    <div class="stat-box">
      <div class="value">${data.itemStatusStats.completed}</div>
      <div class="label">Completed</div>
    </div>
    <div class="stat-box">
      <div class="value">${data.itemStatusStats.inProgress}</div>
      <div class="label">In Progress</div>
    </div>
    <div class="stat-box">
      <div class="value">${progressPercent}%</div>
      <div class="label">Progress</div>
    </div>
  </div>

  <h2>Progress Visualization</h2>
  <div style="margin: 20px 0;">
    <p><strong>Overall Progress: ${progressPercent}%</strong></p>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${progressPercent}%"></div>
    </div>
  </div>

  <h2>Status Distribution Chart</h2>
  <div class="chart">
    <pre>
    ┌─────────────────────────────────────────────────────────────┐
    │  COMPLETED    │ ${'█'.repeat(Math.round((data.itemStatusStats.completed / Math.max(totalItems, 1)) * 30)).padEnd(30)} │ ${data.itemStatusStats.completed} │
    │  IN PROGRESS  │ ${'▓'.repeat(Math.round((data.itemStatusStats.inProgress / Math.max(totalItems, 1)) * 30)).padEnd(30)} │ ${data.itemStatusStats.inProgress} │
    │  PENDING      │ ${'░'.repeat(Math.round((data.itemStatusStats.pending / Math.max(totalItems, 1)) * 30)).padEnd(30)} │ ${data.itemStatusStats.pending} │
    └─────────────────────────────────────────────────────────────┘
    </pre>
  </div>

  <h2>Projects Progress</h2>
  <table>
    <tr>
      <th>Project</th>
      <th>Total Stages</th>
      <th>Completed</th>
      <th>Progress</th>
    </tr>
    ${data.projectProgress.map(p => `
    <tr>
      <td>${p.nameEn}</td>
      <td>${p.totalStages}</td>
      <td>${p.completedStages}</td>
      <td>${p.progress}%</td>
    </tr>
    `).join('')}
  </table>

  <h2>Departments Statistics</h2>
  <table>
    <tr>
      <th>Department</th>
      <th>Total</th>
      <th>Completed</th>
      <th>In Progress</th>
      <th>Pending</th>
    </tr>
    ${data.departmentStats.filter(d => d.total > 0).map(d => `
    <tr>
      <td>${d.nameEn}</td>
      <td>${d.total}</td>
      <td>${d.completed}</td>
      <td>${d.inProgress}</td>
      <td>${d.pending}</td>
    </tr>
    `).join('')}
  </table>

  <h2>Items Details</h2>
  <table>
    <tr>
      <th>#</th>
      <th>Item Name</th>
      <th>Quantity</th>
      <th>Status</th>
      <th>Stages</th>
    </tr>
    ${data.items.slice(0, 50).map((item, i) => `
    <tr class="${item.status === 'completed' ? 'completed' : item.status === 'in_progress' ? 'in-progress' : 'pending'}">
      <td>${i + 1}</td>
      <td>${item.name}</td>
      <td>${item.totalQuantity}</td>
      <td>${item.status === 'completed' ? 'Completed' : item.status === 'in_progress' ? 'In Progress' : 'Pending'}</td>
      <td>${item.stages.length}</td>
    </tr>
    `).join('')}
  </table>

  <p style="margin-top: 40px; color: #9ca3af; text-align: center;">
    Generated by Alwan Al Khaleej Wedding Decor Management System
  </p>
</body>
</html>
  `

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="alwan-al-khaleej-report-${new Date().toISOString().split('T')[0]}.html"`
    }
  })
}

// === Excel Generator (Arabic) ===
async function generateExcel(data: {
  projectName: string
  items: any[]
  projectProgress: any[]
  departmentStats: any[]
  itemStatusStats: { completed: number; inProgress: number; pending: number }
  checklistStats: any[]
  departments: any[]
  projectId: string | null
  projects: any
}) {
  // إنشاء workbook
  const workbook = XLSX.utils.book_new()

  // === ورقة الرسوم البيانية (بيانات) ===
  const totalItems = data.items.length
  const progressPercent = totalItems > 0 ? Math.round((data.itemStatusStats.completed / totalItems) * 100) : 0

  const chartsData = [
    ['تقرير الوان الخليج لتصنيع ديكور الأعراس' + data.projectName],
    ['تاريخ التقرير', new Date().toLocaleDateString('ar-SA')],
    [''],
    ['═══════════════════════════════════════════════════════════════'],
    ['الإحصائيات العامة'],
    ['═══════════════════════════════════════════════════════════════'],
    ['المؤشر', 'القيمة', 'النسبة', 'شريط التقدم'],
    ['إجمالي العناصر', totalItems, '100%', createProgressBar(100)],
    ['عناصر مكتملة', data.itemStatusStats.completed, `${progressPercent}%`, createProgressBar(progressPercent)],
    ['عناصر قيد التنفيذ', data.itemStatusStats.inProgress, `${Math.round((data.itemStatusStats.inProgress / Math.max(totalItems, 1)) * 100)}%`, createProgressBar(Math.round((data.itemStatusStats.inProgress / Math.max(totalItems, 1)) * 100))],
    ['عناصر قيد الانتظار', data.itemStatusStats.pending, `${Math.round((data.itemStatusStats.pending / Math.max(totalItems, 1)) * 100)}%`, createProgressBar(Math.round((data.itemStatusStats.pending / Math.max(totalItems, 1)) * 100))],
    [''],
    ['═══════════════════════════════════════════════════════════════'],
    ['رسم بياني - توزيع الحالة'],
    ['═══════════════════════════════════════════════════════════════'],
    ['الحالة', 'الرسم البياني', 'العدد'],
    ['مكتمل', '█'.repeat(Math.round((data.itemStatusStats.completed / Math.max(totalItems, 1)) * 30)), data.itemStatusStats.completed],
    ['قيد التنفيذ', '▓'.repeat(Math.round((data.itemStatusStats.inProgress / Math.max(totalItems, 1)) * 30)), data.itemStatusStats.inProgress],
    ['قيد الانتظار', '░'.repeat(Math.round((data.itemStatusStats.pending / Math.max(totalItems, 1)) * 30)), data.itemStatusStats.pending],
    [''],
    ['═══════════════════════════════════════════════════════════════'],
    ['تقدم المشاريع'],
    ['═══════════════════════════════════════════════════════════════'],
    ['المشروع', 'إجمالي المراحل', 'المكتملة', 'نسبة الإنجاز', 'شريط التقدم'],
    ...data.projectProgress.map(p => [p.name, p.totalStages, p.completedStages, `${p.progress}%`, createProgressBar(p.progress)]),
    [''],
    ['═══════════════════════════════════════════════════════════════'],
    ['توزيع المراحل حسب الأقسام'],
    ['═══════════════════════════════════════════════════════════════'],
    ['القسم', 'الإجمالي', 'مكتمل', 'قيد التنفيذ', 'قيد الانتظار', 'نسبة الإنجاز'],
    ...data.departmentStats.filter(d => d.total > 0).map(d => {
      const deptProgress = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0
      return [d.name, d.total, d.completed, d.inProgress, d.pending, `${deptProgress}%`]
    }),
    [''],
    ['═══════════════════════════════════════════════════════════════'],
    ['تقدم الكميات (Checklist)'],
    ['═══════════════════════════════════════════════════════════════'],
    ['المرحلة', 'الكمية الإجمالية', 'المكتمل', 'نسبة الإنجاز'],
    ...data.checklistStats.slice(0, 30).map(c => [c.stageName, c.total, c.completed, `${c.progress}%`])
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
    ['الوان الخليج - تقرير تصنيع ديكور الأعراس' + data.projectName],
    ['تاريخ التقرير', new Date().toLocaleDateString('ar-SA')],
    [''],
    ['إحصائيات عامة'],
    ['إجمالي العناصر', data.items.length],
    ['العناصر المكتملة', data.itemStatusStats.completed],
    ['العناصر قيد التنفيذ', data.itemStatusStats.inProgress],
    ['العناصر قيد الانتظار', data.itemStatusStats.pending],
    ['إجمالي المراحل', data.items.reduce((sum, i) => sum + i.stages.length, 0)],
    ['المراحل المكتملة', data.items.reduce((sum, i) => 
      sum + i.stages.filter(s => s.status === 'completed').length, 0)],
    [''],
    ['نسبة الإنجاز الكلية'],
    [`${progressPercent}%`]
  ])
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'ملخص')

  // === ورقة العناصر ===
  const itemsHeaders = [
    'م', 'المشروع', 'اسم العنصر', 'الأولوية', 'الكمية', 'الحالة',
    'عدد المراحل', 'الوقت الإجمالي (ساعات)', 'الموعد النهائي', 'ملاحظات'
  ]
  
  const itemsData = data.items.map((item, index) => {
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
  
  for (const item of data.items) {
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
  
  for (const item of data.items) {
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
            check.completed ? 'مكتمل' : 'غير مكتمل',
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
  
  const deptsData = data.departmentStats.map((dept, index) => [
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
  
  const fileName = data.projectId ? 
    `alwan-al-khaleej-${(data.projects as any)?.nameAr || (data.projects as any)?.name || 'project'}-${new Date().toISOString().split('T')[0]}.xlsx` :
    `alwan-al-khaleej-report-${new Date().toISOString().split('T')[0]}.xlsx`
  
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`
    }
  })
}
