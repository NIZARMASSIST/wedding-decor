import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decryptPassword } from '@/lib/auth'
import { sendEmail, buildPasswordEmail } from '@/lib/email'

/**
 * Rate limiting بسيط في الذاكرة (يكفي لحماية أساسية).
 * يسمح بـ 5 طلبات لكل بريد في الساعة، و 20 طلب لكل IP في الساعة.
 */
const emailRequests = new Map<string, { count: number; resetAt: number }>()
const ipRequests = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60 * 60 * 1000 // ساعة
const MAX_EMAIL = 5
const MAX_IP = 20

function checkRate(map: Map<string, { count: number; resetAt: number }>, key: string, max: number): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = map.get(key)
  if (!entry || entry.resetAt < now) {
    map.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, remaining: max - 1, resetAt: now + WINDOW_MS }
  }
  if (entry.count >= max) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt }
  }
  entry.count += 1
  return { ok: true, remaining: max - entry.count, resetAt: entry.resetAt }
}

/**
 * POST /api/auth/forgot-password
 * يطلب البريد الإلكتروني ويرسل كلمة المرور الحالية (إذا كانت متوفرة) إليه.
 *
 * الاستجابة دائماً رسالة نجاح عامة (لا يكشف وجود البريد) لمنع التعداد.
 *
 * حالات الفشل الداخلية:
 *  - البريد غير موجود في النظام: يرسل 200 لكن لا يرسل بريداً
 *  - كلمة المرور غير متوفرة (مستخدم قديم): يرسل 200 مع رسالة إدارية في السجل
 *  - Rate limit: يرسل 429
 */
export async function POST(request: NextRequest) {
  try {
    // الحصول على IP للـ rate limiting
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = (forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown')

    const body = await request.json().catch(() => ({} as any))
    const email = body?.email?.toString().trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'صيغة البريد الإلكتروني غير صحيحة' },
        { status: 400 }
      )
    }

    // فحص rate limit على IP
    const ipCheck = checkRate(ipRequests, ip, MAX_IP)
    if (!ipCheck.ok) {
      return NextResponse.json(
        { error: 'تم تجاوز الحد المسموح من المحاولات. حاول بعد ساعة.' },
        { status: 429 }
      )
    }

    // فحص rate limit على البريد نفسه
    const emailCheck = checkRate(emailRequests, email, MAX_EMAIL)
    if (!emailCheck.ok) {
      return NextResponse.json(
        { error: 'تم إرسال طلبات متعددة لهذا البريد. تحقق من بريدك أو حاول بعد ساعة.' },
        { status: 429 }
      )
    }

    // البحث عن المستخدم (لا نكشف وجود/عدم وجود البريد في الاستجابة)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true, status: true, passwordEncrypted: true }
    })

    // رسالة النجاح العامة (لا تكشف شيئاً)
    const successMessage = 'إذا كان البريد مسجلاً لدينا، فستصلك رسالة بكلمة المرور خلال دقيقة. تحقق من صندوق الوارد ومجلد الرسائل غير المرغوبة.'

    if (!user) {
      // بريد غير موجود - نسجّل ذلك لكن نرجع نفس رسالة النجاح
      console.log(`[FORGOT-PASSWORD] Unknown email requested: ${email} (ip=${ip})`)
      return NextResponse.json({ success: true, message: successMessage })
    }

    // حساب معلّق أو قيد المراجعة
    if (user.status !== 'active') {
      console.log(`[FORGOT-PASSWORD] Inactive account: ${email} status=${user.status} (ip=${ip})`)
      return NextResponse.json({ success: true, message: successMessage })
    }

    // فك تشفير كلمة المرور
    const plainPassword = decryptPassword(user.passwordEncrypted)

    if (!plainPassword) {
      // كلمة المرور غير متوفرة (مستخدم قديم لم يسجّل الدخول بعد تفعيل الميزة)
      console.log(`[FORGOT-PASSWORD] No viewable password for: ${email} - admin should reset`)
      return NextResponse.json({ success: true, message: successMessage })
    }

    // إرسال البريد
    const html = buildPasswordEmail({
      userName: user.name,
      password: plainPassword,
    })

    const result = await sendEmail({
      to: user.email,
      subject: '🔐 استعادة كلمة المرور - الوان الخليج',
      html,
    })

    if (!result.success) {
      console.error(`[FORGOT-PASSWORD] Email send failed for ${email}:`, result.error)
      // لا نكشف الفشل للمستخدم (نفس الرسالة)
      return NextResponse.json({ success: true, message: successMessage })
    }

    console.log(`[FORGOT-PASSWORD] Password email sent to: ${email} (ip=${ip})`)
    return NextResponse.json({ success: true, message: successMessage })
  } catch (error) {
    console.error('Error in forgot-password:', error)
    return NextResponse.json(
      { error: 'حدث خطأ. حاول مرة أخرى.' },
      { status: 500 }
    )
  }
}
