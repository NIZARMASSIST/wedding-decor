import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - جلب جميع المشاريع
export async function GET(request: NextRequest) {
  try {
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
    
    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

// POST - إنشاء مشروع جديد
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const project = await db.project.create({
      data: {
        name: data.name,
        nameAr: data.nameAr,
        clientName: data.clientName,
        description: data.description,
        status: data.status || 'active',
        startDate: data.startDate ? new Date(data.startDate) : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        notes: data.notes
      }
    })
    
    return NextResponse.json(project)
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}

// PUT - تحديث مشروع
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    
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
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
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
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
