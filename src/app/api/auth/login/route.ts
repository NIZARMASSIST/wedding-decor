import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, encryptPassword, generateToken, setAuthCookie, safeErrorResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // === Input Validation ===
    
    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني مطلوب / Email is required' },
        { status: 400 }
      )
    }

    if (!password || !password.trim()) {
      return NextResponse.json(
        { error: 'كلمة المرور مطلوبة / Password is required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة / Incorrect email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة / Incorrect email or password' },
        { status: 401 }
      )
    }

    // Backfill the reversible encrypted password for users who don't have it (e.g. legacy accounts).
    // We do this only on successful login, so existing users will become "viewable" by maintenance
    // the next time they sign in.
    if (!user.passwordEncrypted) {
      try {
        const encryptedPassword = encryptPassword(password)
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordEncrypted: encryptedPassword },
        })
      } catch (e) {
        // Non-fatal: don't block login if backfill fails
        console.error('Failed to backfill passwordEncrypted for user', user.id, e)
      }
    }

    // Check account status
    if (user.status === 'under_review') {
      return NextResponse.json(
        { error: 'حسابك قيد المراجعة، يرجى الانتظار / Your account is under review, please wait' },
        { status: 403 }
      )
    }

    if (user.status === 'suspended') {
      return NextResponse.json(
        { error: 'تم تعليق هذا الحساب / This account has been suspended' },
        { status: 403 }
      )
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // Set auth cookie
    await setAuthCookie(token)

    return NextResponse.json({
      message: 'تم تسجيل الدخول بنجاح / Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    }, { status: 200 })

  } catch (error) {
    return NextResponse.json(
      safeErrorResponse(error, 'حدث خطأ أثناء تسجيل الدخول / Error during login'),
      { status: 500 }
    )
  }
}
