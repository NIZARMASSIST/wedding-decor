import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isFullAdmin } from '@/lib/auth'

// دالة مساعدة لإنشاء سجل تغيير
async function logChange(projectId: string, userId: string, action: string, entity: string, entityId?: string, changes?: string) {
  try {
    await db.changeLog.create({
      data: {
        projectId,
        userId,
        action,
        entity,
        entityId: entityId || null,
        changes: changes || null,
      }
    })
  } catch (error) {
    console.error('Error logging change:', error)
  }
}

// دالة مساعدة لإرسال إشعار للمدير التنفيذي والمدير العام
async function notifyManagers(projectId: string, supervisorName: string, action: string, entity: string) {
  try {
    const project = await db.project.findUnique({ where: { id: projectId }, select: { nameAr: true, name: true } })
    const projectName = project?.nameAr || project?.name || 'مشروع'
    
    const title = `تغيير بواسطة مشرف: ${supervisorName}`
    const message = `قام المشرف ${supervisorName} بـ${action} على ${entity} في مشروع "${projectName}"`
    
    // جلب المدير العام والمسؤول التنفيذي
    const managers = await db.user.findMany({
      where: {
        role: { in: ['general_manager', 'maintenance', 'executive_manager'] },
        status: 'active',
      },
      select: { id: true }
    })

    for (const manager of managers) {
      await db.notification.create({
        data: {
          userId: manager.id,
          projectId,
          title,
          message,
          type: 'change',
        }
      })
    }
  } catch (error) {
    console.error('Error notifying managers:', error)
  }
}

// GET - جلب جميع المشاريع
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (id) {
      const project = await db.project.findUnique({
        where: { id },
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
          items: {
            include: {
              stages: {
                include: {
                  department: true,
                  checklist: true
                }
              }
            }
          },
          projectMaterials: { include: { material: true } },
          usedMaterials: { include: { material: true, addedBy: { select: { id: true, name: true } } } },
        }
      })
      return NextResponse.json(project)
    }
    
    const projects = await db.project.findMany({
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        items: {
          include: {
            stages: {
              include: {
                department: true
              }
            }
          }
        },
        projectMaterials: { include: { material: true } },
        usedMaterials: { include: { material: true, addedBy: { select: { id: true, name: true } } } },
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch projects',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 })
  }
}

// POST - إنشاء مشروع جديد
// المدير العام + المسؤول التنفيذي + المشرف يمكنهم إنشاء مشاريع
// الستور كيبر لا يمكنه إنشاء مشاريع
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    // الستور كيبر لا يمكنه إنشاء مشاريع
    if (session.role === 'store_keeper') {
      return NextResponse.json({ error: 'لا يمكن لستور كيبر إنشاء مشاريع' }, { status: 403 })
    }

    const data = await request.json()
    
    if (!data.projectDate && !data.name?.trim()) {
      return NextResponse.json({ 
        error: 'Project date or name is required' 
      }, { status: 400 })
    }
    
    // إنشاء اسم المشروع من التاريخ تلقائياً
    let projectName = data.name?.trim() || ''
    if (!projectName && data.projectDate) {
      const d = new Date(data.projectDate)
      projectName = `Project ${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    }
    if (!projectName) {
      projectName = `Project ${new Date().toISOString().split('T')[0]}`
    }

    const project = await db.project.create({
      data: {
        name: projectName,
        nameAr: data.nameAr?.trim() || null,
        projectDate: data.projectDate ? new Date(data.projectDate) : null,
        location: data.location?.trim() || null,
        recipient: data.recipient?.trim() || null,
        executiveManager: data.executiveManager?.trim() || null,
        clientName: data.clientName?.trim() || null,
        description: data.description?.trim() || null,
        image: data.image || null,
        status: data.status || 'active',
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        notes: data.notes?.trim() || null,
        notesAuthor: data.notesAuthor?.trim() || null,
        createdById: session.userId, // من أنشأ المشروع
      }
    })
    
    // تسجيل التغيير
    await logChange(project.id, session.userId, 'create', 'project', project.id)
    
    return NextResponse.json(project)
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ 
      error: 'Failed to create project',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 })
  }
}

// PUT - تحديث مشروع
// المدير العام: يمكنه تحديث أي مشروع
// المسؤول التنفيذي: يمكنه تحديث مشاريعه فقط (بدون المواد المستعملة)
// المشرف: يمكنه تحديث المشاريع مع تسجيل اسمه + إشعار للمدراء
// الستور كيبر: لا يمكنه تحديث المشاريع
export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    // الستور كيبر لا يمكنه تعديل المشاريع
    if (session.role === 'store_keeper') {
      return NextResponse.json({ error: 'لا يمكن لستور كيبر تعديل المشاريع' }, { status: 403 })
    }

    const data = await request.json()
    
    if (!data.id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // جلب المشروع للتحقق من الصلاحيات
    const project = await db.project.findUnique({ where: { id: data.id } })
    if (!project) {
      return NextResponse.json({ error: 'المشروع غير موجود' }, { status: 404 })
    }

    // المسؤول التنفيذي: يمكنه تعديل مشاريعه فقط
    if (session.role === 'executive_manager' && project.createdById !== session.userId) {
      return NextResponse.json({ error: 'يمكنك تعديل مشاريعك فقط' }, { status: 403 })
    }

    // المشرف: تسجيل التغيير وإرسال إشعار
    if (session.role === 'supervisor') {
      const user = await db.user.findUnique({ where: { id: session.userId }, select: { name: true } })
      await logChange(data.id, session.userId, 'update', 'project', data.id, JSON.stringify(data))
      await notifyManagers(data.id, user?.name || 'مشرف', 'تعديل', 'مشروع')
    }

    const updatedProject = await db.project.update({
      where: { id: data.id },
      data: {
        name: data.name,
        nameAr: data.nameAr,
        projectDate: data.projectDate ? new Date(data.projectDate) : null,
        location: data.location,
        recipient: data.recipient,
        executiveManager: data.executiveManager,
        clientName: data.clientName,
        description: data.description,
        image: data.image,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        notes: data.notes,
        notesAuthor: data.notesAuthor
      }
    })
    
    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ 
      error: 'Failed to update project',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 })
  }
}

// DELETE - حذف مشروع
// المدير العام: يمكنه حذف أي مشروع
// المسؤول التنفيذي: يمكنه حذف مشاريعه فقط
// المشرف والستور كيبر: لا يمكنهم الحذف
export async function DELETE(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    // فقط الإدارة والمسؤول التنفيذي يمكنهم الحذف
    if (!isFullAdmin(session.role) && session.role !== 'executive_manager') {
      return NextResponse.json({ error: 'ليس لديك صلاحية حذف المشاريع' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'المشروع غير موجود' }, { status: 404 })
    }

    // المسؤول التنفيذي: يمكنه حذف مشاريعه فقط
    if (session.role === 'executive_manager' && project.createdById !== session.userId) {
      return NextResponse.json({ error: 'يمكنك حذف مشاريعك فقط' }, { status: 403 })
    }

    // تسجيل التغيير قبل الحذف
    await logChange(id, session.userId, 'delete', 'project', id)

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
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 })
  }
}
