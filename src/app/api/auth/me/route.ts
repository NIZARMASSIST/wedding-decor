import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

const ROLE_LABELS: Record<string, string> = {
  general_manager: 'مدير عام',
  maintenance: 'صيانة',
  executive_manager: 'مسؤول تنفيذي',
  supervisor: 'مشرف',
  store_keeper: 'ستور كيبر',
}

export async function GET() {
  try {
    const session = await getCurrentUser()
    
    if (!session) {
      return NextResponse.json(
        { error: 'غير مصرح / Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود / User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      user: {
        ...user,
        roleLabel: ROLE_LABELS[user.role] || user.role,
      }
    })

  } catch {
    return NextResponse.json(
      { error: 'حدث خطأ / An error occurred' },
      { status: 500 }
    )
  }
}
