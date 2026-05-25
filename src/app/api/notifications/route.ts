import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - جلب إشعارات المستخدم الحالي
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const where: any = { userId: session.userId }
    if (unreadOnly) where.isRead = false

    const notifications = await db.notification.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, nameAr: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // عد الإشعارات غير المقروءة
    const unreadCount = await db.notification.count({
      where: { userId: session.userId, isRead: false }
    })

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'فشل في جلب الإشعارات' }, { status: 500 })
  }
}

// PUT - تحديث إشعار (تحديد كمقروء)
export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const body = await request.json()

    // تحديد كل الإشعارات كمقروءة
    if (body.action === 'markAllRead') {
      await db.notification.updateMany({
        where: { userId: session.userId, isRead: false },
        data: { isRead: true }
      })
      return NextResponse.json({ success: true })
    }

    // تحديد إشعار واحد كمقروء
    if (body.id) {
      await db.notification.update({
        where: { id: body.id },
        data: { isRead: true }
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'إجراء غير صالح' }, { status: 400 })
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json({ error: 'فشل في تحديث الإشعار' }, { status: 500 })
  }
}
