import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET - جلب الجدول الزمني الكامل
export async function GET() {
  try {
    // جلب جميع العناصر مع مراحلها
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
    
    // حساب التواريخ المتوقعة لكل مرحلة
    const now = new Date()
    const schedule: any[] = []
    
    for (const item of items) {
      let currentDate = new Date(now)
      const itemSchedule: any = {
        item,
        stages: []
      }
      
      for (const stage of item.stages) {
        const startDate = new Date(currentDate)
        const endDate = new Date(currentDate)
        endDate.setHours(endDate.getHours() + stage.estimatedTime)
        
        itemSchedule.stages.push({
          ...stage,
          calculatedStartDate: startDate,
          calculatedEndDate: endDate
        })
        
        // المرحلة التالية تبدأ بعد انتهاء الحالية
        currentDate = new Date(endDate)
      }
      
      schedule.push(itemSchedule)
    }
    
    // ترتيب حسب تاريخ البداية وأولوية العنصر
    schedule.sort((a, b) => {
      const priorityDiff = a.item.priority - b.item.priority
      if (priorityDiff !== 0) return priorityDiff
      
      const aStartDate = a.stages[0]?.calculatedStartDate || new Date()
      const bStartDate = b.stages[0]?.calculatedStartDate || new Date()
      return aStartDate.getTime() - bStartDate.getTime()
    })
    
    // تجميع حسب القسم
    const byDepartment: Record<string, any[]> = {}
    
    for (const itemSchedule of schedule) {
      for (const stage of itemSchedule.stages) {
        const deptId = stage.departmentId
        if (!byDepartment[deptId]) {
          byDepartment[deptId] = []
        }
        byDepartment[deptId].push({
          ...stage,
          item: itemSchedule.item
        })
      }
    }
    
    return NextResponse.json({
      schedule,
      byDepartment,
      items
    })
  } catch (error) {
    console.error('Error generating schedule:', error)
    return NextResponse.json({ error: 'Failed to generate schedule' }, { status: 500 })
  }
}
