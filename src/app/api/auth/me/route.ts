import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

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

    return NextResponse.json({ user })

  } catch {
    return NextResponse.json(
      { error: 'حدث خطأ / An error occurred' },
      { status: 500 }
    )
  }
}
