import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - جلب جميع العناصر
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    
    const where: any = {}
    if (status) {
      where.status = status
    }
    
    const items = await db.productionItem.findMany({
      where,
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
    
    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching items:', error)
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }
}

// POST - إنشاء عنصر جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, image, priority, notes, totalQuantity, deadline, stages } = body
    
    // حساب الوقت الإجمالي لكل مرحلة
    const stagesWithTime = stages ? stages.map((stage: any, index: number) => {
      const timePerUnit = parseFloat(stage.timePerUnit) || 0
      const quantity = stage.quantity || 1
      const estimatedTime = timePerUnit * quantity
      return {
        departmentId: stage.departmentId,
        stageNumber: index + 1,
        timePerUnit,
        quantity,
        estimatedTime,
        shifts: stage.shifts || 1,
        notes: stage.notes
      }
    }) : []
    
    // إنشاء العنصر مع المراحل
    const item = await db.productionItem.create({
      data: {
        name,
        image,
        priority: priority || 1,
        notes,
        totalQuantity: totalQuantity || 1,
        deadline: deadline ? new Date(deadline) : null,
        stages: stages ? {
          create: stagesWithTime
        } : undefined
      },
      include: {
        stages: {
          include: {
            department: true
          }
        }
      }
    })
    
    return NextResponse.json(item)
  } catch (error) {
    console.error('Error creating item:', error)
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }
}

// PUT - تحديث عنصر
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, image, priority, notes, totalQuantity, deadline, status } = body
    
    const item = await db.productionItem.update({
      where: { id },
      data: {
        name,
        image,
        priority,
        notes,
        totalQuantity,
        deadline: deadline ? new Date(deadline) : null,
        status
      },
      include: {
        stages: {
          include: {
            department: true
          }
        }
      }
    })
    
    return NextResponse.json(item)
  } catch (error) {
    console.error('Error updating item:', error)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

// DELETE - حذف عنصر
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }
    
    await db.productionItem.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
