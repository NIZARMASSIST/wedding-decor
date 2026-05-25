import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - جلب جميع العناصر
export async function GET(request: NextRequest) {
  try {
    console.log('Fetching items...')
    
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
    
    console.log(`Found ${items.length} items`)
    
    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching items:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch items'
    }, { status: 500 })
  }
}

// POST - إنشاء عنصر جديد
export async function POST(request: NextRequest) {
  try {
    console.log('Creating new item...')
    
    const body = await request.json()
    console.log('Item data:', body)
    
    const { name, image, priority, notes, totalQuantity, deadline, stages, projectId } = body
    
    // التحقق من الحقول المطلوبة
    if (!name || !name.trim()) {
      return NextResponse.json({ 
        error: 'Item name is required' 
      }, { status: 400 })
    }
    
    // Validate stages data - filter out stages with missing departmentId
    const validStages = Array.isArray(stages) 
      ? stages.filter((stage: any) => stage && stage.departmentId) 
      : []
    
    // إنشاء بيانات المراحل مع القيم المقدمة من المستخدم
    const stagesData = validStages.map((stage: any, index: number) => {
      const timePerUnit = parseFloat(stage.timePerUnit) || 0
      const quantity = parseInt(stage.quantity) || 1
      const estimatedTime = stage.estimatedTime !== undefined 
        ? parseFloat(stage.estimatedTime) 
        : (timePerUnit * quantity)
      
      return {
        departmentId: stage.departmentId,
        stageNumber: index + 1,
        timePerUnit,
        quantity,
        estimatedTime,
        shifts: parseInt(stage.shifts) || 1,
        shift1Start: stage.shift1Start || null,
        shift1End: stage.shift1End || null,
        shift2Start: stage.shift2Start || null,
        shift2End: stage.shift2End || null,
        notes: stage.notes || null
      }
    })
    
    // إنشاء العنصر مع المراحل
    const item = await db.productionItem.create({
      data: {
        name: name.trim(),
        image: image || null,
        priority: parseInt(priority) || 1,
        notes: notes || null,
        totalQuantity: parseInt(totalQuantity) || 1,
        deadline: deadline ? new Date(deadline) : null,
        projectId: projectId || null,
        stages: stagesData.length > 0 ? {
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
    
    console.log('Item created:', item.id)
    
    return NextResponse.json(item)
  } catch (error) {
    console.error('Error creating item:', error)
    return NextResponse.json({ 
      error: 'Failed to create item'
    }, { status: 500 })
  }
}

// PUT - تحديث عنصر
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, image, priority, notes, totalQuantity, deadline, status, projectId } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }
    
    // Build update data object with only provided fields
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (image !== undefined) updateData.image = image
    if (priority !== undefined) updateData.priority = priority
    if (notes !== undefined) updateData.notes = notes
    if (totalQuantity !== undefined) updateData.totalQuantity = totalQuantity
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null
    if (status !== undefined) updateData.status = status
    if (projectId !== undefined) updateData.projectId = projectId || null
    
    const item = await db.productionItem.update({
      where: { id },
      data: updateData,
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
