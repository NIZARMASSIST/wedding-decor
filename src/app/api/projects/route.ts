import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - جلب جميع المشاريع
export async function GET(request: NextRequest) {
  try {
    console.log('Fetching projects...')
    
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (id) {
      const project = await db.project.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              stages: {
                include: {
                  department: true,
                  checklist: true
                }
              }
            }
          }
        }
      })
      return NextResponse.json(project)
    }
    
    const projects = await db.project.findMany({
      include: {
        items: {
          include: {
            stages: {
              include: {
                department: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`Found ${projects.length} projects`)
    
    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch projects',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - إنشاء مشروع جديد
export async function POST(request: NextRequest) {
  try {
    console.log('Creating new project...')
    
    const data = await request.json()
    console.log('Project data:', data)
    
    // التحقق من الحقول المطلوبة
    if (!data.name || !data.name.trim()) {
      return NextResponse.json({ 
        error: 'Project name is required' 
      }, { status: 400 })
    }
    
    const project = await db.project.create({
      data: {
        name: data.name.trim(),
        nameAr: data.nameAr?.trim() || null,
        clientName: data.clientName?.trim() || null,
        description: data.description?.trim() || null,
        status: data.status || 'active',
        startDate: data.startDate ? new Date(data.startDate) : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        notes: data.notes?.trim() || null
      }
    })
    
    console.log('Project created:', project.id)
    
    return NextResponse.json(project)
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ 
      error: 'Failed to create project',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT - تحديث مشروع
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    
    if (!data.id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }
    
    const project = await db.project.update({
      where: { id: data.id },
      data: {
        name: data.name,
        nameAr: data.nameAr,
        clientName: data.clientName,
        description: data.description,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        notes: data.notes
      }
    })
    
    return NextResponse.json(project)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ 
      error: 'Failed to update project',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - حذف مشروع
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }
    
    // حذف جميع العناصر المرتبطة بالمشروع أولاً
    await db.productionItem.deleteMany({
      where: { projectId: id }
    })
    
    // حذف المشروع
    await db.project.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ 
      error: 'Failed to delete project',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
