import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isFullAdmin } from '@/lib/auth'

/**
 * GET /api/stock-transactions
 * معاملات الاستعلام:
 *   - materialId: فلترة حسب مادة محددة
 *   - projectId: فلترة حسب مشروع
 *   - department: فلترة حسب القسم
 *   - type: فلترة حسب نوع الحركة (delivery, usage, adjustment, opening, return)
 *   - fromDate / toDate: نطاق التاريخ
 *   - search: بحث في itemCode/description/notes
 *   - limit: عدد النتائج (افتراضي 500)
 *   - offset: تخطي النتائج
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const materialId = searchParams.get('materialId')
    const projectId = searchParams.get('projectId')
    const department = searchParams.get('department')
    const type = searchParams.get('type')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '500')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (materialId) where.materialId = materialId
    if (projectId) where.projectId = projectId
    if (department) where.department = department
    if (type) where.type = type
    if (fromDate || toDate) {
      where.date = {}
      if (fromDate) where.date.gte = new Date(fromDate)
      if (toDate) where.date.lte = new Date(toDate)
    }
    if (search) {
      where.OR = [
        { itemCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [transactions, total] = await Promise.all([
      db.stockTransaction.findMany({
        where,
        include: {
          material: { select: { id: true, name: true, nameAr: true, itemCode: true, unit: true } },
          project: { select: { id: true, name: true, nameAr: true } }
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset
      }),
      db.stockTransaction.count({ where })
    ])

    return NextResponse.json({ transactions, total })
  } catch (error) {
    console.error('Error fetching stock transactions:', error)
    return NextResponse.json({
      error: 'Failed to fetch stock transactions',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 })
  }
}

/**
 * POST - إنشاء حركة مخزون جديدة (دخل/خرج/تسوية/إرجاع)
 *
 * أنواع الحركات (type):
 *   - delivery: دخل (شراء، استلام) - deliveryQty موجبة
 *   - usage: استخدام - deliveryQty سالبة (تُنشأ تلقائياً من addUsedMaterial)
 *   - adjustment: تسوية يدوية للرصيد
 *   - opening: رصيد افتتاحي
 *   - return: إرجاع - deliveryQty موجبة
 *
 * الصلاحيات:
 *   - delivery, opening, return, adjustment: المدير العام + الستور كيبر فقط
 *   - usage: لا يُنشأ يدوياً (يُنشأ تلقائياً من addUsedMaterial)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    // فقط الإدارة والستور كيبر يمكنهم تسجيل الحركات يدوياً
    if (!isFullAdmin(session.role) && session.role !== 'store_keeper') {
      return NextResponse.json({ error: 'ليس لديك صلاحية تسجيل حركات المخزون' }, { status: 403 })
    }

    const body = await request.json()
    const {
      materialId, projectId, itemCode, description, uom,
      date, deliveryQty, price, department, type, notes, reference
    } = body

    if (!materialId) {
      return NextResponse.json({ error: 'معرف المادة مطلوب' }, { status: 400 })
    }

    if (deliveryQty === undefined || deliveryQty === null) {
      return NextResponse.json({ error: 'الكمية مطلوبة' }, { status: 400 })
    }

    const qty = parseFloat(deliveryQty)
    if (isNaN(qty)) {
      return NextResponse.json({ error: 'الكمية يجب أن تكون رقماً' }, { status: 400 })
    }

    const moveType = type || 'delivery'

    // منع إنشاء حركات "usage" يدوياً (يجب أن تُنشأ عبر addUsedMaterial)
    if (moveType === 'usage' && !projectId) {
      return NextResponse.json({ error: 'حركات الاستخدام تُنشأ تلقائياً عند إضافة مادة مستعملة لمشروع' }, { status: 400 })
    }

    // جلب المادة
    const material = await db.material.findUnique({ where: { id: materialId } })
    if (!material) {
      return NextResponse.json({ error: 'المادة غير موجودة' }, { status: 404 })
    }

    const movePrice = price !== undefined ? parseFloat(price) : material.unitPrice
    const moveDate = date ? new Date(date) : new Date()
    const moveDept = department || material.department
    const moveItemCode = itemCode || material.itemCode
    const moveDesc = description || material.name
    const moveUom = uom || material.unit

    // حساب الرصيد بعد الحركة
    const oldStock = material.stockQuantity || 0
    // للـ usage الكمية تكون سالبة أصلاً، لباقي الأنواع نحسب الإشارة
    let signedQty = qty
    if (moveType === 'usage') {
      signedQty = -Math.abs(qty) // استخدام = سلبة دائماً
    } else if (moveType === 'delivery' || moveType === 'opening' || moveType === 'return') {
      signedQty = Math.abs(qty) // موجبة دائماً
    } // adjustment: نحترم إشارة الكمية المدخلة

    const newStock = Math.max(0, oldStock + signedQty)

    // إنشاء الحركة
    const txn = await db.stockTransaction.create({
      data: {
        materialId,
        projectId: projectId || null,
        itemCode: moveItemCode,
        description: moveDesc,
        uom: moveUom,
        date: moveDate,
        deliveryQty: signedQty,
        price: movePrice,
        totalPrice: Math.abs(signedQty) * movePrice,
        department: moveDept,
        balanceAfter: newStock,
        type: moveType,
        notes,
        reference,
        createdById: session.userId
      },
      include: {
        material: { select: { id: true, name: true, nameAr: true, itemCode: true, unit: true } },
        project: { select: { id: true, name: true, nameAr: true } }
      }
    })

    // تحديث رصيد المادة
    await db.material.update({
      where: { id: materialId },
      data: {
        stockQuantity: newStock,
        unitPrice: movePrice > 0 ? movePrice : undefined // تحديث آخر سعر للوارد
      }
    })

    return NextResponse.json(txn)
  } catch (error) {
    console.error('Error creating stock transaction:', error)
    return NextResponse.json({
      error: 'Failed to create stock transaction',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 })
  }
}

/**
 * DELETE - حذف حركة مخزون
 * المدير العام + الستور كيبر فقط
 * عند الحذف: يتم عكس تأثير الحركة على رصيد المادة
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    if (!isFullAdmin(session.role) && session.role !== 'store_keeper') {
      return NextResponse.json({ error: 'ليس لديك صلاحية حذف حركات المخزون' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'معرف الحركة مطلوب' }, { status: 400 })
    }

    const txn = await db.stockTransaction.findUnique({ where: { id } })
    if (!txn) {
      return NextResponse.json({ error: 'الحركة غير موجودة' }, { status: 404 })
    }

    // عكس تأثير الحركة على رصيد المادة
    if (txn.materialId) {
      const material = await db.material.findUnique({ where: { id: txn.materialId } })
      if (material) {
        const reversedStock = Math.max(0, (material.stockQuantity || 0) - (txn.deliveryQty || 0))
        await db.material.update({
          where: { id: txn.materialId },
          data: { stockQuantity: reversedStock }
        })
      }
    }

    // فك الارتباط مع UsedMaterial إن وجد
    await db.usedMaterial.updateMany({
      where: { transactionId: id },
      data: { transactionId: null }
    })

    await db.stockTransaction.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting stock transaction:', error)
    return NextResponse.json({
      error: 'Failed to delete stock transaction',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 })
  }
}
