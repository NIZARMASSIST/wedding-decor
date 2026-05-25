import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// الأدوار المتاحة
const VALID_ROLES = ['general_manager', 'executive_manager', 'supervisor', 'store_keeper']

const ROLE_LABELS: Record<string, string> = {
  general_manager: 'مدير عام',
  executive_manager: 'مسؤول تنفيذي',
  supervisor: 'مشرف',
  store_keeper: 'ستور كيبر',
}

// GET - جلب جميع المستخدمين
export async function GET() {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    // فقط المدير العام يمكنه رؤية كل المستخدمين
    if (session.role !== 'general_manager') {
      return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    // إضافة تسمية الدور بالعربية
    const usersWithLabels = users.map(u => ({
      ...u,
      roleLabel: ROLE_LABELS[u.role] || u.role,
    }))

    return NextResponse.json(usersWithLabels)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'فشل في جلب المستخدمين' }, { status: 500 })
  }
}

// PUT - تحديث مستخدم (تغيير الدور، الحالة، الاسم، الهاتف)
export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const body = await request.json()
    const { id, role, status, name, phone } = body

    if (!id) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 })
    }

    const data: any = {}

    // تحديث الاسم - يمكن لأي مستخدم تحديث اسمه
    if (name !== undefined) {
      // إذا كان المستخدم يحدث اسمه الخاص
      if (id === session.userId) {
        data.name = name.trim()
      } else if (session.role === 'general_manager') {
        // المدير العام يمكنه تحديث أسماء الآخرين
        data.name = name.trim()
      } else {
        return NextResponse.json({ error: 'لا يمكنك تغيير اسم مستخدم آخر' }, { status: 403 })
      }
    }

    // تحديث الهاتف - يمكن لأي مستخدم تحديث هاتفه
    if (phone !== undefined) {
      if (id === session.userId || session.role === 'general_manager') {
        data.phone = phone.trim() || null
      } else {
        return NextResponse.json({ error: 'لا يمكنك تغيير هاتف مستخدم آخر' }, { status: 403 })
      }
    }

    // تحديث الدور - فقط المدير العام
    if (role !== undefined) {
      if (session.role !== 'general_manager') {
        return NextResponse.json({ error: 'فقط المدير العام يمكنه تغيير الأدوار' }, { status: 403 })
      }
      if (!VALID_ROLES.includes(role)) {
        return NextResponse.json({ error: 'دور غير صالح' }, { status: 400 })
      }

      // التأكد من وجود مدير عام واحد فقط
      if (role === 'general_manager') {
        const currentGM = await prisma.user.findFirst({
          where: { role: 'general_manager', id: { not: id } }
        })
        if (currentGM) {
          return NextResponse.json({ 
            error: `يوجد مدير عام بالفعل: ${currentGM.name}. يمكن وجود مدير عام واحد فقط.` 
          }, { status: 400 })
        }
      }

      data.role = role
    }

    // تحديث الحالة - فقط المدير العام
    if (status !== undefined) {
      if (session.role !== 'general_manager') {
        return NextResponse.json({ error: 'فقط المدير العام يمكنه تغيير حالة المستخدمين' }, { status: 403 })
      }
      data.status = status
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({
      ...user,
      roleLabel: ROLE_LABELS[user.role] || user.role,
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'فشل في تحديث المستخدم' }, { status: 500 })
  }
}

// DELETE - حذف مستخدم - فقط المدير العام
export async function DELETE(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }
    if (session.role !== 'general_manager') {
      return NextResponse.json({ error: 'فقط المدير العام يمكنه حذف المستخدمين' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 })
    }

    // لا يمكن حذف المدير العام
    const userToDelete = await prisma.user.findUnique({ where: { id } })
    if (userToDelete?.role === 'general_manager') {
      return NextResponse.json({ error: 'لا يمكن حذف المدير العام' }, { status: 400 })
    }

    // لا يمكن حذف نفسك
    if (id === session.userId) {
      return NextResponse.json({ error: 'لا يمكنك حذف حسابك' }, { status: 400 })
    }

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'فشل في حذف المستخدم' }, { status: 500 })
  }
}
