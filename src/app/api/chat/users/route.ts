import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - جلب المستخدمين للمحادثة (جميع المستخدمين النشطين)
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      where: {
        status: 'active',
        id: { not: user.userId } // استثناء المستخدم الحالي
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
      orderBy: { name: 'asc' }
    })

    const ROLE_LABELS: Record<string, string> = {
      general_manager: 'مدير عام',
      executive_manager: 'مسؤول تنفيذي',
      supervisor: 'مشرف',
      store_keeper: 'ستور كيبر',
    }

    const usersWithLabels = users.map(u => ({
      ...u,
      roleLabel: ROLE_LABELS[u.role] || u.role,
    }))

    return NextResponse.json({ users: usersWithLabels })
  } catch (error) {
    console.error('Error fetching chat users:', error)
    return NextResponse.json({ error: 'فشل في جلب المستخدمين' }, { status: 500 })
  }
}
