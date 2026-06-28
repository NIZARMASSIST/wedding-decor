import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isFullAdmin } from '@/lib/auth'

// دالة مساعدة لإرسال إشعار لمنشئ المشروع عند التعديل من قبل مسؤول تنفيذي
async function notifyProjectOwner(projectId: string, editorName: string, editorRole: string, action: string, entity: string) {
  try {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { nameAr: true, name: true, createdById: true }
    })
    if (!project || !project.createdById) return

    const projectName = project?.nameAr || project?.name || 'مشروع'
    const roleLabel = editorRole === 'executive_manager' ? 'مسؤول تنفيذي' : editorRole

    const title = `تعديل في مشروعك بواسطة ${roleLabel}`
    const message = `قام ${roleLabel} "${editorName}" بـ${action} على ${entity} في مشروعك "${projectName}"`

    await db.notification.create({
      data: {
        userId: project.createdById,
        projectId,
        title,
        message,
        type: 'change',
      }
    })
  } catch (error) {
    console.error('Error notifying project owner:', error)
  }
}

// GET - جلب جميع المواد
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const projectId = searchParams.get('projectId')
    const search = searchParams.get('search')
    const department = searchParams.get('department')
    const usedMaterials = searchParams.get('usedMaterials') // جلب المواد المستعملة

    const where: any = {}
    if (category) where.category = category
    if (type) where.type = type
    if (department) where.department = department
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search, mode: 'insensitive' } },
        { itemCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const materials = await db.material.findMany({
      where,
      include: {
        projectMaterials: projectId ? {
          where: { projectId },
          select: { id: true, quantity: true, notes: true }
        } : false
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    })

    // إذا طلب مشروع معين، نرجع المواد المطلوبة والمستعملة
    if (projectId) {
      const projectMaterials = await db.projectMaterial.findMany({
        where: { projectId },
        include: { material: true },
        orderBy: { createdAt: 'desc' }
      })

      // جلب المواد المستعملة أيضاً
      const usedMats = await db.usedMaterial.findMany({
        where: { projectId },
        include: { 
          material: true,
          addedBy: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json({ materials, projectMaterials, usedMaterials: usedMats })
    }

    return NextResponse.json(materials)
  } catch (error) {
    console.error('Error fetching materials:', error)
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 })
  }
}

// POST - إنشاء مادة جديدة أو استيراد من Excel
// المدير العام + الستور كيبر فقط يمكنهم إضافة مواد أولية
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    // فقط الإدارة والستور كيبر يمكنهم إضافة مواد
    if (!isFullAdmin(session.role) && session.role !== 'store_keeper') {
      return NextResponse.json({ error: 'ليس لديك صلاحية إضافة مواد' }, { status: 403 })
    }

    const body = await request.json()

    // استيراد جماعي من Excel
    if (body.action === 'import' && Array.isArray(body.materials)) {
      const results = { created: 0, updated: 0, errors: 0 }

      for (const mat of body.materials) {
        try {
          if (!mat.name && !mat.itemCode) {
            results.errors++
            continue
          }

          // البحث بواسطة itemCode أولاً، ثم name
          let existing: any = null
          if (mat.itemCode) {
            existing = await db.material.findUnique({ where: { itemCode: mat.itemCode } })
          }
          if (!existing && mat.name) {
            existing = await db.material.findFirst({ where: { name: mat.name } })
          }

          if (existing) {
            await db.material.update({
              where: { id: existing.id },
              data: {
                name: mat.name || existing.name,
                nameAr: mat.nameAr || existing.nameAr,
                itemCode: mat.itemCode || existing.itemCode,
                unit: mat.unit || existing.unit,
                unitAr: mat.unitAr || existing.unitAr,
                category: mat.category || existing.category,
                categoryAr: mat.categoryAr || existing.categoryAr,
                department: mat.department || existing.department,
                unitPrice: mat.unitPrice !== undefined ? mat.unitPrice : existing.unitPrice,
                stockQuantity: mat.stockQuantity !== undefined ? mat.stockQuantity : existing.stockQuantity,
                minStockLevel: mat.minStockLevel !== undefined ? mat.minStockLevel : existing.minStockLevel,
                type: mat.type || existing.type,
                description: mat.description || existing.description,
              }
            })
            results.updated++
          } else {
            const created = await db.material.create({
              data: {
                name: mat.name || mat.itemCode,
                nameAr: mat.nameAr || '-',
                itemCode: mat.itemCode || null,
                unit: mat.unit || 'PCS',
                unitAr: mat.unitAr || '-',
                category: mat.category || 'GENERAL WORK',
                categoryAr: mat.categoryAr || '-',
                department: mat.department || null,
                unitPrice: mat.unitPrice || 0,
                stockQuantity: mat.stockQuantity || 0,
                minStockLevel: mat.minStockLevel || null,
                status: 'active',
                type: mat.type || 'raw',
                description: mat.description || '',
              }
            })
            // إنشاء حركة افتتاحية للرصيد الأولي
            if (mat.stockQuantity && mat.stockQuantity > 0) {
              await db.stockTransaction.create({
                data: {
                  materialId: created.id,
                  itemCode: created.itemCode,
                  description: created.name,
                  uom: created.unit,
                  deliveryQty: mat.stockQuantity,
                  price: mat.unitPrice || 0,
                  totalPrice: (mat.stockQuantity) * (mat.unitPrice || 0),
                  department: created.department,
                  balanceAfter: mat.stockQuantity,
                  type: 'opening',
                  notes: 'رصيد افتتاحي من الاستيراد',
                  createdById: session.userId
                }
              })
            }
            results.created++
          }
        } catch (err) {
          console.error('Import error for material:', err)
          results.errors++
        }
      }

      return NextResponse.json(results)
    }

    // إنشاء مادة واحدة
    const { name, nameAr, itemCode, unit, unitAr, category, categoryAr, department, unitPrice, stockQuantity, minStockLevel, status, description, type } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Material name is required' }, { status: 400 })
    }

    // التحقق من فرادة itemCode
    if (itemCode && itemCode.trim()) {
      const existing = await db.material.findUnique({ where: { itemCode: itemCode.trim() } })
      if (existing) {
        return NextResponse.json({ error: 'كود المادة موجود مسبقاً' }, { status: 400 })
      }
    }

    const material = await db.material.create({
      data: {
        name: name.trim(),
        nameAr: nameAr || '-',
        itemCode: itemCode?.trim() || null,
        unit: unit || 'PCS',
        unitAr: unitAr || '-',
        category: category || 'GENERAL WORK',
        categoryAr: categoryAr || '-',
        department: department || null,
        unitPrice: unitPrice || 0,
        stockQuantity: stockQuantity || 0,
        minStockLevel: minStockLevel || null,
        status: status || 'active',
        type: type || 'raw',
        description: description || '',
      }
    })

    // إنشاء حركة افتتاحية إذا كان هناك رصيد أولي
    if (stockQuantity && stockQuantity > 0) {
      await db.stockTransaction.create({
        data: {
          materialId: material.id,
          itemCode: material.itemCode,
          description: material.name,
          uom: material.unit,
          deliveryQty: stockQuantity,
          price: unitPrice || 0,
          totalPrice: stockQuantity * (unitPrice || 0),
          department: material.department,
          balanceAfter: stockQuantity,
          type: 'opening',
          notes: 'رصيد افتتاحي',
          createdById: session.userId
        }
      })
    }

    return NextResponse.json(material)
  } catch (error) {
    console.error('Error creating material:', error)
    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 })
  }
}

// PUT - تحديث مادة أو إضافة مادة لمشروع أو إضافة مادة مستعملة
export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const body = await request.json()

    // === إضافة مادة مستعملة للمشروع (ستور كيبر + مسؤول تنفيذي + الإدارة) ===
    if (body.action === 'addUsedMaterial') {
      if (session.role !== 'store_keeper' && session.role !== 'executive_manager' && !isFullAdmin(session.role)) {
        return NextResponse.json({ error: 'فقط الستور كيبر أو المسؤول التنفيذي يمكنه إضافة المواد المستعملة' }, { status: 403 })
      }

      const { projectId, materialId, quantity, price, department, notes } = body
      if (!projectId || !materialId) {
        return NextResponse.json({ error: 'معرف المشروع والمادة مطلوبان' }, { status: 400 })
      }

      // جلب المادة لمعرفة السعر والقسم الافتراضي
      const material = await db.material.findUnique({ where: { id: materialId } })
      if (!material) {
        return NextResponse.json({ error: 'المادة غير موجودة' }, { status: 404 })
      }

      const usedQty = parseFloat(quantity) || 0
      const usedPrice = price !== undefined ? parseFloat(price) : material.unitPrice
      const usedDept = department || material.department

      // التحقق من وجود المادة المستعملة مسبقاً
      const existing = await db.usedMaterial.findFirst({
        where: { projectId, materialId }
      })

      let usedMaterial: any
      let oldQty = 0

      if (existing) {
        oldQty = existing.quantity
        const newQty = usedQty // استبدال الكمية
        const deltaQty = newQty - oldQty

        // تحديث الكمية في UsedMaterial
        usedMaterial = await db.usedMaterial.update({
          where: { id: existing.id },
          data: { 
            quantity: newQty, 
            price: usedPrice,
            department: usedDept,
            notes: notes || existing.notes,
            addedById: session.userId,
          },
          include: { material: true, addedBy: { select: { id: true, name: true } } }
        })

        // تعديل الرصيد في Material بالفرق
        if (deltaQty !== 0) {
          const newStock = Math.max(0, (material.stockQuantity || 0) - deltaQty)
          await db.material.update({
            where: { id: materialId },
            data: { stockQuantity: newStock }
          })

          // إنشاء/تعديل حركة المخزون - نحذف القديمة وننشئ جديدة
          if (existing.transactionId) {
            await db.stockTransaction.delete({ where: { id: existing.transactionId } }).catch(() => {})
          }
          const txn = await db.stockTransaction.create({
            data: {
              materialId,
              projectId,
              itemCode: material.itemCode,
              description: material.name,
              uom: material.unit,
              deliveryQty: -newQty, // سلبة لأنه استهلاك
              price: usedPrice,
              totalPrice: newQty * usedPrice,
              department: usedDept,
              balanceAfter: newStock,
              type: 'usage',
              notes: notes || `استخدام في مشروع`,
              createdById: session.userId
            }
          })
          // ربط الحركة بالـ UsedMaterial
          await db.usedMaterial.update({
            where: { id: usedMaterial.id },
            data: { transactionId: txn.id }
          })
        }
      } else {
        // إنشاء جديد
        const newStock = Math.max(0, (material.stockQuantity || 0) - usedQty)
        
        // إنشاء حركة المخزون أولاً
        const txn = await db.stockTransaction.create({
          data: {
            materialId,
            projectId,
            itemCode: material.itemCode,
            description: material.name,
            uom: material.unit,
            deliveryQty: -usedQty,
            price: usedPrice,
            totalPrice: usedQty * usedPrice,
            department: usedDept,
            balanceAfter: newStock,
            type: 'usage',
            notes: notes || `استخدام في مشروع`,
            createdById: session.userId
          }
        })

        // تحديث رصيد المادة
        await db.material.update({
          where: { id: materialId },
          data: { stockQuantity: newStock }
        })

        usedMaterial = await db.usedMaterial.create({
          data: { 
            projectId, 
            materialId, 
            quantity: usedQty, 
            price: usedPrice,
            department: usedDept,
            notes,
            transactionId: txn.id,
            addedById: session.userId,
          },
          include: { material: true, addedBy: { select: { id: true, name: true } } }
        })
      }

      // إشعار لمنشئ المشروع إذا كان المعدّل مسؤول تنفيذي وليس هو المنشئ
      if (session.role === 'executive_manager') {
        const project = await db.project.findUnique({ where: { id: projectId }, select: { createdById: true } })
        const user = await db.user.findUnique({ where: { id: session.userId }, select: { name: true } })
        if (project && project.createdById !== session.userId) {
          await notifyProjectOwner(projectId, user?.name || 'مسؤول تنفيذي', 'executive_manager', 'إضافة/تعديل', 'مادة مستعملة')
        }
      }
      return NextResponse.json(usedMaterial)
    }

    // === إزالة مادة مستعملة من المشروع (ستور كيبر + مسؤول تنفيذي + الإدارة) ===
    if (body.action === 'removeUsedMaterial') {
      if (session.role !== 'store_keeper' && session.role !== 'executive_manager' && !isFullAdmin(session.role)) {
        return NextResponse.json({ error: 'فقط الستور كيبر أو المسؤول التنفيذي يمكنه إزالة المواد المستعملة' }, { status: 403 })
      }

      const { id } = body
      if (!id) {
        return NextResponse.json({ error: 'معرف المادة المستعملة مطلوب' }, { status: 400 })
      }
      // جلب معلومات المادة قبل حذفها لإرسال الإشعار وإرجاع الكمية للمخزون
      const usedMat = await db.usedMaterial.findUnique({ 
        where: { id }, 
        select: { projectId: true, materialId: true, quantity: true, transactionId: true }
      })
      
      if (usedMat) {
        // إرجاع الكمية للمخزون
        if (usedMat.materialId) {
          const material = await db.material.findUnique({ where: { id: usedMat.materialId } })
          if (material) {
            const newStock = (material.stockQuantity || 0) + (usedMat.quantity || 0)
            await db.material.update({
              where: { id: usedMat.materialId },
              data: { stockQuantity: newStock }
            })
            // إنشاء حركة إرجاع
            await db.stockTransaction.create({
              data: {
                materialId: usedMat.materialId,
                projectId: usedMat.projectId,
                itemCode: material.itemCode,
                description: material.name,
                uom: material.unit,
                deliveryQty: usedMat.quantity || 0, // موجبة = إرجاع
                price: material.unitPrice,
                totalPrice: (usedMat.quantity || 0) * material.unitPrice,
                department: material.department,
                balanceAfter: newStock,
                type: 'return',
                notes: 'إرجاع بعد حذف مادة مستعملة',
                createdById: session.userId
              }
            })
          }
        }
        // حذف حركة المخزون المرتبطة
        if (usedMat.transactionId) {
          await db.stockTransaction.delete({ where: { id: usedMat.transactionId } }).catch(() => {})
        }
      }
      await db.usedMaterial.delete({ where: { id } })
      // إشعار لمنشئ المشروع إذا كان المعدّل مسؤول تنفيذي وليس هو المنشئ
      if (session.role === 'executive_manager' && usedMat) {
        const project = await db.project.findUnique({ where: { id: usedMat.projectId }, select: { createdById: true } })
        const user = await db.user.findUnique({ where: { id: session.userId }, select: { name: true } })
        if (project && project.createdById !== session.userId) {
          await notifyProjectOwner(usedMat.projectId, user?.name || 'مسؤول تنفيذي', 'executive_manager', 'حذف', 'مادة مستعملة')
        }
      }
      return NextResponse.json({ success: true })
    }

    // === إضافة مادة مطلوبة للمشروع ===
    // منشئ المشروع + المسؤول التنفيذي + المدير العام يمكنهم إضافة المواد المطلوبة
    if (body.action === 'addToProject') {
      const { projectId, materialId, quantity, notes } = body
      if (!projectId || !materialId) {
        return NextResponse.json({ error: 'Project ID and Material ID are required' }, { status: 400 })
      }

      // التحقق من الصلاحية: منشئ المشروع أو المدير العام أو المسؤول التنفيذي
      const project = await db.project.findUnique({ where: { id: projectId } })
      if (!project) {
        return NextResponse.json({ error: 'المشروع غير موجود' }, { status: 404 })
      }

      if (!isFullAdmin(session.role) && session.role !== 'executive_manager' && project.createdById !== session.userId) {
        return NextResponse.json({ error: 'فقط منشئ المشروع أو المسؤول التنفيذي يمكنه إضافة المواد المطلوبة' }, { status: 403 })
      }

      const existing = await db.projectMaterial.findUnique({
        where: { projectId_materialId: { projectId, materialId } }
      })

      if (existing) {
        const updated = await db.projectMaterial.update({
          where: { id: existing.id },
          data: { quantity: quantity || existing.quantity, notes: notes || existing.notes },
          include: { material: true }
        })
        // إشعار لمنشئ المشروع إذا كان المعدّل مسؤول تنفيذي وليس هو المنشئ
        if (session.role === 'executive_manager' && project.createdById !== session.userId) {
          const user = await db.user.findUnique({ where: { id: session.userId }, select: { name: true } })
          await notifyProjectOwner(projectId, user?.name || 'مسؤول تنفيذي', 'executive_manager', 'تعديل', 'مادة مطلوبة')
        }
        return NextResponse.json(updated)
      }

      const projectMaterial = await db.projectMaterial.create({
        data: { projectId, materialId, quantity: quantity || 0, notes },
        include: { material: true }
      })
      // إشعار لمنشئ المشروع إذا كان المعدّل مسؤول تنفيذي وليس هو المنشئ
      if (session.role === 'executive_manager' && project.createdById !== session.userId) {
        const user = await db.user.findUnique({ where: { id: session.userId }, select: { name: true } })
        await notifyProjectOwner(projectId, user?.name || 'مسؤول تنفيذي', 'executive_manager', 'إضافة', 'مادة مطلوبة')
      }
      return NextResponse.json(projectMaterial)
    }

    // === إزالة مادة مطلوبة من المشروع ===
    if (body.action === 'removeFromProject') {
      const { id, projectId } = body
      if (!id) {
        return NextResponse.json({ error: 'ProjectMaterial ID is required' }, { status: 400 })
      }

      // التحقق من الصلاحية
      if (projectId) {
        const project = await db.project.findUnique({ where: { id: projectId } })
        if (project && !isFullAdmin(session.role) && session.role !== 'executive_manager' && project.createdById !== session.userId) {
          return NextResponse.json({ error: 'فقط منشئ المشروع أو المسؤول التنفيذي يمكنه إزالة المواد المطلوبة' }, { status: 403 })
        }
        // إشعار لمنشئ المشروع إذا كان المعدّل مسؤول تنفيذي وليس هو المنشئ
        if (session.role === 'executive_manager' && project && project.createdById !== session.userId) {
          const user = await db.user.findUnique({ where: { id: session.userId }, select: { name: true } })
          await notifyProjectOwner(projectId, user?.name || 'مسؤول تنفيذي', 'executive_manager', 'حذف', 'مادة مطلوبة')
        }
      }

      await db.projectMaterial.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    // === تحديث مادة (المدير العام + الستور كيبر فقط) ===
    const { id, name, nameAr, itemCode, unit, unitAr, category, categoryAr, department, unitPrice, stockQuantity, minStockLevel, status, description, type } = body

    if (!id) {
      return NextResponse.json({ error: 'Material ID is required' }, { status: 400 })
    }

    // فقط الإدارة والستور كيبر يمكنهم تحديث المواد الأولية والمخزون
    if (!isFullAdmin(session.role) && session.role !== 'store_keeper') {
      return NextResponse.json({ error: 'ليس لديك صلاحية تحديث المواد' }, { status: 403 })
    }

    // التحقق من فرادة itemCode
    if (itemCode && itemCode.trim()) {
      const existing = await db.material.findFirst({ 
        where: { 
          itemCode: itemCode.trim(),
          NOT: { id }
        } 
      })
      if (existing) {
        return NextResponse.json({ error: 'كود المادة موجود مسبقاً' }, { status: 400 })
      }
    }

    // جلب الرصيد الحالي قبل التحديث
    const currentMat = await db.material.findUnique({ where: { id } })
    if (!currentMat) {
      return NextResponse.json({ error: 'المادة غير موجودة' }, { status: 404 })
    }

    const oldStock = currentMat.stockQuantity || 0
    const newStock = stockQuantity !== undefined ? parseFloat(stockQuantity) : oldStock
    const stockDelta = newStock - oldStock

    const material = await db.material.update({
      where: { id },
      data: {
        name,
        nameAr,
        itemCode: itemCode === '' ? null : itemCode,
        unit,
        unitAr,
        category,
        categoryAr,
        department: department === '' ? null : department,
        unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined,
        stockQuantity: newStock,
        minStockLevel: minStockLevel !== undefined ? (minStockLevel === '' || minStockLevel === null ? null : parseFloat(minStockLevel)) : undefined,
        status,
        description,
        type,
      }
    })

    // إنشاء حركة تسوية إذا تغير الرصيد يدوياً
    if (stockDelta !== 0 && stockQuantity !== undefined) {
      await db.stockTransaction.create({
        data: {
          materialId: id,
          itemCode: material.itemCode,
          description: material.name,
          uom: material.unit,
          deliveryQty: stockDelta, // موجبة أو سالبة حسب التغيير
          price: material.unitPrice,
          totalPrice: Math.abs(stockDelta) * material.unitPrice,
          department: material.department,
          balanceAfter: newStock,
          type: 'adjustment',
          notes: `تسوية يدوية للرصيد من ${oldStock} إلى ${newStock}`,
          createdById: session.userId
        }
      })
    }

    return NextResponse.json(material)
  } catch (error) {
    console.error('Error updating material:', error)
    return NextResponse.json({ error: 'Failed to update material' }, { status: 500 })
  }
}

// DELETE - حذف مادة (المدير العام فقط)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    if (!isFullAdmin(session.role)) {
      return NextResponse.json({ error: 'فقط الإدارة يمكنها حذف المواد' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Material ID is required' }, { status: 400 })
    }

    // حذف الارتباطات أولاً
    await db.projectMaterial.deleteMany({
      where: { materialId: id }
    })
    await db.usedMaterial.deleteMany({
      where: { materialId: id }
    })
    // حذف حركات المخزون المرتبطة (أو فك الارتباط)
    await db.stockTransaction.deleteMany({
      where: { materialId: id }
    })

    await db.material.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting material:', error)
    return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 })
  }
}
