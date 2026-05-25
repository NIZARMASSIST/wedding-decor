import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// Helper: validate email format
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Helper: validate password strength
function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) {
    return { valid: false, message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" };
  }
  return { valid: true };
}

// POST - Login or Register
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, action, list } = body;

    // ---- LIST USERS (admin) ----
    if (list === true) {
      const users = await db.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          whatsappNumber: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(users);
    }

    // ---- REGISTER ----
    if (action === "register") {
      // Validate required fields
      if (!email || !email.trim()) {
        return NextResponse.json({ error: "البريد الإلكتروني مطلوب" }, { status: 400 });
      }
      if (!isValidEmail(email)) {
        return NextResponse.json({ error: "صيغة البريد الإلكتروني غير صحيحة" }, { status: 400 });
      }
      if (!name || !name.trim()) {
        return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
      }
      if (!password || !password.trim()) {
        return NextResponse.json({ error: "كلمة المرور مطلوبة" }, { status: 400 });
      }
      const passwordCheck = isValidPassword(password);
      if (!passwordCheck.valid) {
        return NextResponse.json({ error: passwordCheck.message }, { status: 400 });
      }

      // Check if email already exists
      const existingUser = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (existingUser) {
        return NextResponse.json({ error: "البريد مسجل مسبقاً" }, { status: 400 });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user with pending status
      const user = await db.user.create({
        data: {
          email: email.trim().toLowerCase(),
          name: name.trim(),
          password: hashedPassword,
          role: "user",
          status: "pending",
        },
      });

      return NextResponse.json({ success: true, message: "تم التسجيل بنجاح، حسابك قيد المراجعة" });
    }

    // ---- LOGIN ----
    if (!email || !email.trim()) {
      return NextResponse.json({ error: "البريد الإلكتروني مطلوب" }, { status: 400 });
    }
    if (!password || !password.trim()) {
      return NextResponse.json({ error: "كلمة المرور مطلوبة" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });

    // Step 1: Check if user exists (generic message to prevent enumeration)
    if (!user) {
      return NextResponse.json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    // Step 2: Check if user has a password set
    if (!user.password) {
      return NextResponse.json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    // Step 3: Verify password BEFORE checking status
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    // Step 4: Check account status AFTER password verification
    if (user.status === "pending") {
      return NextResponse.json({ error: "حسابك قيد المراجعة، يرجى الانتظار حتى يتم تفعيله" }, { status: 403 });
    }
    if (user.status === "rejected") {
      return NextResponse.json({ error: "تم رفض طلب التسجيل، يرجى التواصل مع الإدارة" }, { status: 403 });
    }

    // Step 5: Return user data (exclude password)
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);

  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// PUT - Update user (admin action: approve/reject/change role)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "معرف المستخدم مطلوب" }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id },
      data: updates,
    });

    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "حدث خطأ في تحديث المستخدم" }, { status: 500 });
  }
}
