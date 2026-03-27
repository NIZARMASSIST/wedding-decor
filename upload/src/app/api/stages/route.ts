import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - جلب مراحل عنصر معين
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const itemId = searchParams.get('itemId')
    
    if (itemId) {
      const stages = await db.stage.findMany({
        where: { itemId },
        include: {
          department: true
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
        department: true
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
    const { itemId, departmentId, timePerUnit, quantity, shifts, notes, readyForNextAt } = body
    
    // حساب الوقت الإجمالي
    const qty = quantity || 1
    const timeUnit = parseFloat(timePerUnit) || 0
    const estimatedTime = timeUnit * qty
    
    // جلب أعلى رقم مرحلة للعنصر
    const lastStage = await db.stage.findFirst({
      where: { itemId },
      orderBy: { stageNumber: 'desc' }
    })
    
    const stageNumber = lastStage ? lastStage.stageNumber + 1 : 1
    
    const stage = await db.stage.create({
      data: {
        itemId,
        departmentId,
        stageNumber,
        timePerUnit: timeUnit,
        quantity: qty,
        estimatedTime,
        shifts: shifts || 1,
        notes,
        readyForNextAt: readyForNextAt ? new Date(readyForNextAt) : null
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
    const { id, departmentId, timePerUnit, quantity, shifts, status, startDate, endDate, readyForNextAt, notes, stageNumber } = body
    
    // حساب الوقت الإجمالي
    const qty = quantity || 1
    const timeUnit = parseFloat(timePerUnit) || 0
    const estimatedTime = timeUnit * qty
    
    const stage = await db.stage.update({
      where: { id },
      data: {
        departmentId,
        timePerUnit: timeUnit,
        quantity: qty,
        estimatedTime,
        shifts: shifts || 1,
        status,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        readyForNextAt: readyForNextAt ? new Date(readyForNextAt) : null,
        notes,
        stageNumber
      },
      include: {
        department: true,
        item: true
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
