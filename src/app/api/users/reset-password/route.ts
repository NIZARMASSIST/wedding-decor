import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, isFullAdmin, hashPassword, encryptPassword, isValidPassword } from '@/lib/auth'

/**
 * POST /api/users/reset-password
 * يسمح للمدير العام أو الصيانة بإعادة تعيين كلمة مرور أي مستخدم.
 *
 * الحماية:
 *  - فقط general_manager / maintenance يمكنهم الاستدعاء
 *  - لا يمكن إعادة تعيين كلمة مرور حساب إداري آخر (general_manager / maintenance)
 *    لمنع تصعيد الصلاحيات
 *  - لا يمكن للمرء إعادة تعيين كلمة مرور نفسه من هنا (يستخدم صفحة الملف الشخصي)
 *  - التحقق من قوة كلمة المرور (>= 6 أحرف)
 *  - تسجيل العملية في سجلات الخادم (audit trail)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    // فقط المدير العام أو الصيانة
    if (!isFullAdmin(session.role)) {
      return NextResponse.json(
        { error: 'فقط المدير العام أو الصيانة يمكنهما إعادة تعيين كلمات المرور' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, newPassword } = body as { userId?: string; newPassword?: string }

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 })
    }
    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'كلمة المرور الجديدة مطلوبة' }, { status: 400 })
    }
    if (!isValidPassword(newPassword)) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
        { status: 400 }
      )
    }

    // لا يمكن إعادة تعيين كلمة مرور نفسك من هنا
    if (userId === session.userId) {
      return NextResponse.json(
        { error: 'لا يمكنك إعادة تعيين كلمة مرورك من هنا. استخدم صفحة الملف الشخصي.' },
        { status: 400 }
      )
    }

    // التحقق من المستخدم المستهدف
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
    }

    // منع إعادة تعيين كلمات مرور الحسابات الإدارية الأخرى
    if (isFullAdmin(targetUser.role)) {
      return NextResponse.json(
        {
          error:
            'لا يمكن إعادة تعيين كلمة مرور حساب إداري (مدير عام / صيانة). هذه عملية محظورة لمنع تصعيد الصلاحيات.'
        },
        { status: 403 }
      )
    }

    // تشفير كلمة المرور الجديدة
    const hashedPassword = await hashPassword(newPassword)
    // تخزين نسخة مشفّرة قابلة للعكس (AES-256) لتمكين الصيانة/المدير من عرضها لاحقاً
    const encryptedPassword = encryptPassword(newPassword)

    // تحديث كلمة المرور (bcrypt + نسخة قابلة للعكس)
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordEncrypted: encryptedPassword,
      }
    })

    // تسجيل العملية للمساءلة (audit trail)
    console.log(
      `[AUDIT] Password reset: actor=${session.email} (${session.role}) -> target=${targetUser.email} (${targetUser.role}) at ${new Date().toISOString()}`
    )

    return NextResponse.json({
      success: true,
      message: `تم إعادة تعيين كلمة المرور للمستخدم: ${targetUser.name} (${targetUser.email})`,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role
      }
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'فشل في إعادة تعيين كلمة المرور' },
      { status: 500 }
    )
  }
}
