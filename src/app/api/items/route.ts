import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - جلب جميع العناصر
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const projectId = searchParams.get('projectId')
    
    const where: any = {}
    if (status) {
      where.status = status
    }
    if (projectId) {
      where.projectId = projectId
    }
    
    const items = await db.productionItem.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            nameAr: true
          }
        },
        stages: {
          include: {
            department: true,
            attachments: true
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
    const { name, image, priority, notes, totalQuantity, deadline, stages, projectId } = body
    
    // إنشاء بيانات المراحل مع القيم المقدمة من المستخدم
    const stagesData = stages ? stages.map((stage: any, index: number) => {
      const timePerUnit = parseFloat(stage.timePerUnit) || 0
      const quantity = stage.quantity || 1
      const estimatedTime = stage.estimatedTime !== undefined 
        ? parseFloat(stage.estimatedTime) 
        : (timePerUnit * quantity)
      
      return {
        departmentId: stage.departmentId,
        stageNumber: index + 1,
        timePerUnit,
        quantity,
        estimatedTime,
        shifts: stage.shifts || 1,
        shift1Start: stage.shift1Start || null,
        shift1End: stage.shift1End || null,
        shift2Start: stage.shift2Start || null,
        shift2End: stage.shift2End || null,
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
        projectId: projectId || null,
        stages: stages ? {
          create: stagesData
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
    const { id, name, image, priority, notes, totalQuantity, deadline, status, projectId } = body
    
    const item = await db.productionItem.update({
      where: { id },
      data: {
        name,
        image,
        priority,
        notes,
        totalQuantity,
        deadline: deadline ? new Date(deadline) : null,
        status,
        projectId: projectId !== undefined ? projectId : undefined
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
