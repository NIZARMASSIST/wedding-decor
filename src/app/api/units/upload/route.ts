import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/units/upload
 * رفع صورة واحدة (رئيسية أو فرعية) للوحدة
 * - المستخدم: general_manager, executive_manager, supervisor, maintenance
 * - الستور كيبر: لا يمكنه رفع الصور
 * - الحد الأقصى: 8 ميجابايت لكل صورة
 * - الصيغ المسموحة: jpg, jpeg, png, webp, gif
 *
 * الرد:
 *  { url: "data:image/jpeg;base64,..." }
 *
 * ملاحظة: نُخزّن الصورة كـ data URL (base64) في قاعدة البيانات
 * هذا يتوافق مع نمط المرفقات الموجود في النظام (Attachment.fileData)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    if (session.role === 'store_keeper') {
      return NextResponse.json({ error: 'لا يمكن لستور كيبر رفع الصور' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'الملف مطلوب' }, { status: 400 })
    }

    // التحقق من نوع الملف
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'نوع الملف غير مدعوم. الصيغ المسموحة: JPG, PNG, WEBP, GIF'
      }, { status: 400 })
    }

    // التحقق من حجم الملف (8 ميجابايت كحد أقصى)
    const maxSize = 8 * 1024 * 1024 // 8MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'حجم الملف يتجاوز الحد المسموح (8 ميجابايت)'
      }, { status: 400 })
    }

    // قراءة الملف وتحويله إلى base64 data URL
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    return NextResponse.json({
      url: dataUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })
  } catch (error) {
    console.error('Error uploading unit image:', error)
    return NextResponse.json({
      error: 'Failed to upload image',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 })
  }
}
