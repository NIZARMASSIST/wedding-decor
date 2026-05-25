import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - جلب جميع عناصر Checklist
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const stageId = searchParams.get('stageId')
    
    if (stageId) {
      const checklist = await db.checklistItem.findMany({
        where: { stageId },
        orderBy: { order: 'asc' }
      })
      return NextResponse.json(checklist)
    }
    
    const checklist = await db.checklistItem.findMany({
      orderBy: { order: 'asc' }
    })
    
    return NextResponse.json(checklist)
  } catch (error) {
    console.error('Error fetching checklist:', error)
    return NextResponse.json({ error: 'Failed to fetch checklist' }, { status: 500 })
  }
}

// POST - إنشاء عنصر Checklist جديد
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // الحصول على أعلى ترتيب
    const maxOrder = await db.checklistItem.findFirst({
      where: { stageId: data.stageId },
      orderBy: { order: 'desc' },
      select: { order: true }
    })
    
    const checklist = await db.checklistItem.create({
      data: {
        stageId: data.stageId,
        itemName: data.itemName,
        quantity: data.quantity || 1,
        order: (maxOrder?.order || 0) + 1
      }
    })
    
    return NextResponse.json(checklist)
  } catch (error) {
    console.error('Error creating checklist item:', error)
    return NextResponse.json({ error: 'Failed to create checklist item' }, { status: 500 })
  }
}

// PUT - تحديث عنصر Checklist
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    
    const checklist = await db.checklistItem.update({
      where: { id: data.id },
      data: {
        itemName: data.itemName,
        quantity: data.quantity,
        completed: data.completed,
        completedAt: data.completed ? new Date() : null,
        notes: data.notes
      }
    })
    
    return NextResponse.json(checklist)
  } catch (error) {
    console.error('Error updating checklist item:', error)
    return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 })
  }
}

// DELETE - حذف عنصر Checklist
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Checklist item ID is required' }, { status: 400 })
    }
    
    await db.checklistItem.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting checklist item:', error)
    return NextResponse.json({ error: 'Failed to delete checklist item' }, { status: 500 })
  }
}
