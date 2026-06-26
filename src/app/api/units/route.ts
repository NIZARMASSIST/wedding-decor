import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isFullAdmin } from '@/lib/auth'

/**
 * GET /api/units?projectId=XXX
 *  - يعيد كل الوحدات لمشروع محدد (مع عناصرها ومراحلها)
 *  - إذا لم يُمرّر projectId يعيد كل الوحدات (مع عناصرها) مجمّعة
 *
 * GET /api/units?id=XXX
 *  - يعيد وحدة واحدة بعناصرها ومراحلها
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')
    const id = searchParams.get('id')

    const include = {
      project: { select: { id: true, name: true, nameAr: true } },
      items: {
        include: {
          stages: {
            include: { department: true },
            orderBy: { stageNumber: 'asc' as const }
          }
        },
        orderBy: { priority: 'asc' as const }
      }
    }

    if (id) {
      const unit = await db.unit.findUnique({
        where: { id },
        include
      })
      if (!unit) {
        return NextResponse.json({ error: 'الوحدة غير موجودة' }, { status: 404 })
      }
      return NextResponse.json(unit)
    }

    const units = await db.unit.findMany({
      where: projectId ? { projectId } : undefined,
      include,
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
    })

    return NextResponse.json(units)
  } catch (error) {
    console.error('Error fetching units:', error)
    return NextResponse.json({
      error: 'Failed to fetch units',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 })
  }
}

/**
 * POST - إنشاء وحدة جديدة
 * المدير العام + maintenance + executive_manager + supervisor: يمكنهم الإنشاء
 * الستور كيبر: لا يمكنه الإنشاء
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    if (session.role === 'store_keeper') {
      return NextResponse.json({ error: 'لا يمكن لستور كيبر إنشاء وحدات' }, { status: 403 })
    }

    const data = await request.json()

    if (!data.projectId) {
      return NextResponse.json({ error: 'معرّف المشروع مطلوب' }, { status: 400 })
    }
    if (!data.name || !String(data.name).trim()) {
      return NextResponse.json({ error: 'اسم الوحدة مطلوب' }, { status: 400 })
    }

    // التحقق من وجود المشروع
    const project = await db.project.findUnique({ where: { id: data.projectId } })
    if (!project) {
      return NextResponse.json({ error: 'المشروع غير موجود' }, { status: 404 })
    }

    // حساب ترتيب الوحدة الجديدة تلقائياً
    const lastOrder = await db.unit.aggregate({
      where: { projectId: data.projectId },
      _max: { order: true }
    })
    const nextOrder = (lastOrder._max.order ?? -1) + 1

    const unit = await db.unit.create({
      data: {
        projectId: data.projectId,
        name: String(data.name).trim(),
        nameAr: data.nameAr?.trim() || null,
        description: data.description?.trim() || null,
        order: typeof data.order === 'number' ? data.order : nextOrder,
        status: data.status || 'active'
      },
      include: {
        project: { select: { id: true, name: true, nameAr: true } }
      }
    })

    return NextResponse.json(unit)
  } catch (error) {
    console.error('Error creating unit:', error)
    return NextResponse.json({
      error: 'Failed to create unit',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 })
  }
}

/**
 * PUT - تحديث وحدة
 * المدير العام + maintenance + executive_manager + supervisor: يمكنهم التحديث
 * الستور كيبر: لا يمكنه التحديث
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    if (session.role === 'store_keeper') {
      return NextResponse.json({ error: 'لا يمكن لستور كيبر تعديل الوحدات' }, { status: 403 })
    }

    const data = await request.json()

    if (!data.id) {
      return NextResponse.json({ error: 'معرّف الوحدة مطلوب' }, { status: 400 })
    }

    const existing = await db.unit.findUnique({ where: { id: data.id } })
    if (!existing) {
      return NextResponse.json({ error: 'الوحدة غير موجودة' }, { status: 404 })
    }

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = String(data.name).trim()
    if (data.nameAr !== undefined) updateData.nameAr = data.nameAr?.trim() || null
    if (data.description !== undefined) updateData.description = data.description?.trim() || null
    if (data.order !== undefined) updateData.order = parseInt(data.order) || 0
    if (data.status !== undefined) updateData.status = data.status

    const updated = await db.unit.update({
      where: { id: data.id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true, nameAr: true } }
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating unit:', error)
    return NextResponse.json({
      error: 'Failed to update unit',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 })
  }
}

/**
 * DELETE - حذف وحدة
 * المدير العام + maintenance + executive_manager: يمكنهم الحذف
 * المشرف والستور كيبر: لا يمكنهم الحذف
 * العناصر المرتبطة: تُفك ارتباطها (unitId = NULL) بفعل onDelete: SetNull
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    if (!isFullAdmin(session.role) && session.role !== 'executive_manager') {
      return NextResponse.json({ error: 'ليس لديك صلاحية حذف الوحدات' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'معرّف الوحدة مطلوب' }, { status: 400 })
    }

    const existing = await db.unit.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'الوحدة غير موجودة' }, { status: 404 })
    }

    // فك ارتباط العناصر بالوحدة قبل الحذف (احتياط إضافي - onDelete: SetNull يكفي لكن نضمن)
    await db.productionItem.updateMany({
      where: { unitId: id },
      data: { unitId: null }
    })

    await db.unit.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting unit:', error)
    return NextResponse.json({
      error: 'Failed to delete unit',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 })
  }
}
