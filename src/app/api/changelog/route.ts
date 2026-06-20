import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, isFullAdmin } from '@/lib/auth'

// GET - جلب سجل التغييرات لمشروع
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    // فقط الإدارة والمسؤول التنفيذي يمكنهم رؤية سجل التغييرات
    if (!isFullAdmin(session.role) && session.role !== 'executive_manager') {
      return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')

    const where: any = {}
    if (projectId) where.projectId = projectId

    const logs = await db.changeLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true } },
        project: { select: { id: true, name: true, nameAr: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Error fetching changelog:', error)
    return NextResponse.json({ error: 'فشل في جلب سجل التغييرات' }, { status: 500 })
  }
}
