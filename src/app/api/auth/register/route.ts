import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, isValidEmail, isValidPassword, generateToken, setAuthCookie, safeErrorResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, phone } = body

    // === Input Validation ===
    
    // Check required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'الاسم مطلوب / Name is required' },
        { status: 400 }
      )
    }

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

    // Validate email format
    if (!isValidEmail(email.trim())) {
      return NextResponse.json(
        { error: 'صيغة البريد الإلكتروني غير صحيحة / Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل / Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Validate name length
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'الاسم يجب أن يكون حرفين على الأقل / Name must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'هذا البريد الإلكتروني مسجل بالفعل / Email already registered' },
        { status: 409 }
      )
    }

    // Hash the password
    const hashedPassword = await hashPassword(password)

    // Create the user - default role is supervisor, active immediately
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        phone: phone?.trim() || null,
        role: 'supervisor',
        status: 'active',
      },
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

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // Set auth cookie
    await setAuthCookie(token)

    return NextResponse.json({
      message: 'تم إنشاء الحساب بنجاح / Account created successfully',
      user,
    }, { status: 201 })

  } catch (error) {
    return NextResponse.json(
      safeErrorResponse(error, 'حدث خطأ أثناء إنشاء الحساب / Error creating account'),
      { status: 500 }
    )
  }
}
