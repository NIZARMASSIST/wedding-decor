import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, isFullAdmin, decryptPassword } from '@/lib/auth'

/**
 * GET /api/users/view-password?userId=...
 * يسمح للمدير العام أو الصيانة بفك تشفير وعرض كلمة مرور أي مستخدم.
 *
 * الحماية:
 *  - فقط general_manager / maintenance يمكنهم الاستدعاء
 *  - لا يمكن عرض كلمة مرور حساب إداري آخر (general_manager / maintenance)
 *    لمنع تصعيد الصلاحيات
 *  - لا يمكن للمرء عرض كلمة مرور نفسه من هنا (يستخدم صفحة الملف الشخصي)
 *  - يرجع null إذا لم تكن هناك نسخة قابلة للعكس (مستخدم قديم لم يسجّل الدخول بعد تفعيل الميزة)
 *  - تسجيل العملية في سجلات الخادم (audit trail)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    // فقط المدير العام أو الصيانة
    if (!isFullAdmin(session.role)) {
      return NextResponse.json(
        { error: 'فقط المدير العام أو الصيانة يمكنهما عرض كلمات المرور' },
        { status: 403 }
      )
    }

    const userId = request.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 })
    }

    // لا يمكن عرض كلمة مرور نفسك من هنا
    if (userId === session.userId) {
      return NextResponse.json(
        { error: 'لا يمكنك عرض كلمة مرورك من هنا.' },
        { status: 400 }
      )
    }

    // التحقق من المستخدم المستهدف
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, passwordEncrypted: true }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
    }

    // منع عرض كلمات مرور الحسابات الإدارية الأخرى
    if (isFullAdmin(targetUser.role)) {
      return NextResponse.json(
        {
          error:
            'لا يمكن عرض كلمة مرور حساب إداري (مدير عام / صيانة). هذه عملية محظورة لمنع تصعيد الصلاحيات.'
        },
        { status: 403 }
      )
    }

    // فك التشفير
    const plainPassword = decryptPassword(targetUser.passwordEncrypted)

    // تسجيل العملية للمساءلة (audit trail)
    console.log(
      `[AUDIT] Password view: actor=${session.email} (${session.role}) -> target=${targetUser.email} (${targetUser.role}) at ${new Date().toISOString()}`
    )

    return NextResponse.json({
      success: true,
      password: plainPassword, // قد يكون null للمستخدمين القدامى
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role
      }
    })
  } catch (error) {
    console.error('Error viewing password:', error)
    return NextResponse.json(
      { error: 'فشل في عرض كلمة المرور' },
      { status: 500 }
    )
  }
}
