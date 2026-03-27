import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - جلب مراحل عنصر معين أو جميع المراحل
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const itemId = searchParams.get('itemId')
    
    if (itemId) {
      const stages = await db.stage.findMany({
        where: { itemId },
        include: {
          department: true,
          attachments: true
        },
        orderBy: {
          stageNumber: 'asc'
        }
      })
      return NextResponse.json(stages)
    }
    
    // جلب جميع المراحل مع تفاصيل العنصر والقسم
    const stages = await db.stage.findMany({
      include: {
        item: true,
        department: true,
        attachments: true
      },
      orderBy: [
        { item: { priority: 'asc' } },
        { stageNumber: 'asc' }
      ]
    })
    
    return NextResponse.json(stages)
  } catch (error) {
    console.error('Error fetching stages:', error)
    return NextResponse.json({ error: 'Failed to fetch stages' }, { status: 500 })
  }
}

// POST - إضافة مرحلة جديدة
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      itemId, departmentId, timePerUnit, quantity, shifts, 
      notes, estimatedTime, shift1Start, shift1End, shift2Start, shift2End 
    } = body
    
    // جلب أعلى رقم مرحلة للعنصر
    const lastStage = await db.stage.findFirst({
      where: { itemId },
      orderBy: { stageNumber: 'desc' }
    })
    
    const stageNumber = lastStage ? lastStage.stageNumber + 1 : 1
    
    // استخدام القيم المقدمة من المستخدم
    const timeUnit = parseFloat(timePerUnit) || 0
    const qty = quantity || 1
    const estTime = estimatedTime !== undefined ? parseFloat(estimatedTime) : (timeUnit * qty)
    
    const stage = await db.stage.create({
      data: {
        itemId,
        departmentId,
        stageNumber,
        timePerUnit: timeUnit,
        quantity: qty,
        estimatedTime: estTime,
        shifts: shifts || 1,
        shift1Start: shift1Start || null,
        shift1End: shift1End || null,
        shift2Start: shift2Start || null,
        shift2End: shift2End || null,
        notes
      },
      include: {
        department: true,
        item: true
      }
    })
    
    return NextResponse.json(stage)
  } catch (error) {
    console.error('Error creating stage:', error)
    return NextResponse.json({ error: 'Failed to create stage' }, { status: 500 })
  }
}

// PUT - تحديث مرحلة
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      id, departmentId, timePerUnit, quantity, shifts, status, 
      startDate, endDate, readyForNextAt, notes, stageNumber, estimatedTime,
      shift1Start, shift1End, shift2Start, shift2End 
    } = body
    
    // جلب المرحلة الحالية للتحقق من تغيير الحالة
    const currentStage = await db.stage.findUnique({
      where: { id }
    })
    
    if (!currentStage) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 })
    }
    
    // تحضير بيانات التحديث
    const updateData: any = {}
    
    // تحديث الحقول فقط إذا تم تمريرها
    if (departmentId !== undefined) updateData.departmentId = departmentId
    if (timePerUnit !== undefined) updateData.timePerUnit = parseFloat(timePerUnit) || 0
    if (quantity !== undefined) updateData.quantity = quantity || 1
    if (estimatedTime !== undefined) updateData.estimatedTime = parseFloat(estimatedTime) || 0
    if (shifts !== undefined) updateData.shifts = shifts || 1
    if (notes !== undefined) updateData.notes = notes
    if (stageNumber !== undefined) updateData.stageNumber = stageNumber
    if (readyForNextAt !== undefined) updateData.readyForNextAt = readyForNextAt ? new Date(readyForNextAt) : null
    
    // تحديث أوقات الشفتات
    if (shift1Start !== undefined) updateData.shift1Start = shift1Start || null
    if (shift1End !== undefined) updateData.shift1End = shift1End || null
    if (shift2Start !== undefined) updateData.shift2Start = shift2Start || null
    if (shift2End !== undefined) updateData.shift2End = shift2End || null
    
    // تحديث التواريخ يدوياً إذا تم تمريرها
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    
    // تسجيل وقت البداية تلقائياً عند تغيير الحالة إلى قيد التنفيذ
    if (status === 'in_progress' && currentStage.status !== 'in_progress') {
      updateData.status = 'in_progress'
      updateData.startDate = new Date()
    }
    // تسجيل وقت الانتهاء تلقائياً عند تغيير الحالة إلى مكتمل
    else if (status === 'completed' && currentStage.status !== 'completed') {
      updateData.status = 'completed'
      updateData.endDate = new Date()
    }
    else if (status !== undefined) {
      updateData.status = status
    }
    
    const stage = await db.stage.update({
      where: { id },
      data: updateData,
      include: {
        department: true,
        item: true,
        attachments: true
      }
    })
    
    return NextResponse.json(stage)
  } catch (error) {
    console.error('Error updating stage:', error)
    return NextResponse.json({ error: 'Failed to update stage' }, { status: 500 })
  }
}

// DELETE - حذف مرحلة
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Stage ID is required' }, { status: 400 })
    }
    
    await db.stage.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting stage:', error)
    return NextResponse.json({ error: 'Failed to delete stage' }, { status: 500 })
  }
}
