import { NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/auth'

export async function POST() {
  try {
    await clearAuthCookie()
    return NextResponse.json({
      message: 'تم تسجيل الخروج بنجاح / Logged out successfully'
    })
  } catch {
    return NextResponse.json(
      { error: 'حدث خطأ / An error occurred' },
      { status: 500 }
    )
  }
}
