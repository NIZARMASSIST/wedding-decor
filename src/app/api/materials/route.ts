import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isFullAdmin } from '@/lib/auth'

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
    const usedMaterials = searchParams.get('usedMaterials') // جلب المواد المستعملة

    const where: any = {}
    if (category) where.category = category
    if (type) where.type = type
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search, mode: 'insensitive' } }
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
      orderBy: { category: 'asc' }
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
          if (!mat.name) {
            results.errors++
            continue
          }

          const existing = await db.material.findFirst({
            where: { name: mat.name }
          })

          if (existing) {
            await db.material.update({
              where: { id: existing.id },
              data: {
                nameAr: mat.nameAr || existing.nameAr,
                unit: mat.unit || existing.unit,
                unitAr: mat.unitAr || existing.unitAr,
                category: mat.category || existing.category,
                categoryAr: mat.categoryAr || existing.categoryAr,
                unitPrice: mat.unitPrice !== undefined ? mat.unitPrice : existing.unitPrice,
                stockQuantity: mat.stockQuantity !== undefined ? mat.stockQuantity : existing.stockQuantity,
                type: mat.type || existing.type,
                description: mat.description || existing.description,
              }
            })
            results.updated++
          } else {
            await db.material.create({
              data: {
                name: mat.name,
                nameAr: mat.nameAr || '-',
                unit: mat.unit || 'PCS',
                unitAr: mat.unitAr || '-',
                category: mat.category || 'GENERAL WORK',
                categoryAr: mat.categoryAr || '-',
                unitPrice: mat.unitPrice || 0,
                stockQuantity: mat.stockQuantity || 0,
                status: 'active',
                type: mat.type || 'raw',
                description: mat.description || '',
              }
            })
            results.created++
          }
        } catch {
          results.errors++
        }
      }

      return NextResponse.json(results)
    }

    // إنشاء مادة واحدة
    const { name, nameAr, unit, unitAr, category, categoryAr, unitPrice, stockQuantity, status, description, type } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Material name is required' }, { status: 400 })
    }

    const material = await db.material.create({
      data: {
        name: name.trim(),
        nameAr: nameAr || '-',
        unit: unit || 'PCS',
        unitAr: unitAr || '-',
        category: category || 'GENERAL WORK',
        categoryAr: categoryAr || '-',
        unitPrice: unitPrice || 0,
        stockQuantity: stockQuantity || 0,
        status: status || 'active',
        type: type || 'raw',
        description: description || '',
      }
    })

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

    // === إضافة مادة مستعملة للمشروع (ستور كيبر فقط) ===
    if (body.action === 'addUsedMaterial') {
      if (session.role !== 'store_keeper' && !isFullAdmin(session.role)) {
        return NextResponse.json({ error: 'فقط الستور كيبر يمكنه إضافة المواد المستعملة' }, { status: 403 })
      }

      const { projectId, materialId, quantity, notes } = body
      if (!projectId || !materialId) {
        return NextResponse.json({ error: 'معرف المشروع والمادة مطلوبان' }, { status: 400 })
      }

      // التحقق من وجود المادة المستعملة مسبقاً
      const existing = await db.usedMaterial.findFirst({
        where: { projectId, materialId }
      })

      if (existing) {
        // تحديث الكمية
        const updated = await db.usedMaterial.update({
          where: { id: existing.id },
          data: { 
            quantity: quantity !== undefined ? quantity : existing.quantity, 
            notes: notes || existing.notes,
            addedById: session.userId,
          },
          include: { material: true, addedBy: { select: { id: true, name: true } } }
        })
        return NextResponse.json(updated)
      }

      const usedMaterial = await db.usedMaterial.create({
        data: { 
          projectId, 
          materialId, 
          quantity: quantity || 0, 
          notes,
          addedById: session.userId,
        },
        include: { material: true, addedBy: { select: { id: true, name: true } } }
      })
      return NextResponse.json(usedMaterial)
    }

    // === إزالة مادة مستعملة من المشروع (ستور كيبر فقط) ===
    if (body.action === 'removeUsedMaterial') {
      if (session.role !== 'store_keeper' && !isFullAdmin(session.role)) {
        return NextResponse.json({ error: 'فقط الستور كيبر يمكنه إزالة المواد المستعملة' }, { status: 403 })
      }

      const { id } = body
      if (!id) {
        return NextResponse.json({ error: 'معرف المادة المستعملة مطلوب' }, { status: 400 })
      }
      await db.usedMaterial.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    // === إضافة مادة مطلوبة للمشروع ===
    // منشئ المشروع فقط يمكنه إضافة المواد المطلوبة
    if (body.action === 'addToProject') {
      const { projectId, materialId, quantity, notes } = body
      if (!projectId || !materialId) {
        return NextResponse.json({ error: 'Project ID and Material ID are required' }, { status: 400 })
      }

      // التحقق من الصلاحية: منشئ المشروع أو المدير العام
      const project = await db.project.findUnique({ where: { id: projectId } })
      if (!project) {
        return NextResponse.json({ error: 'المشروع غير موجود' }, { status: 404 })
      }

      if (!isFullAdmin(session.role) && project.createdById !== session.userId) {
        return NextResponse.json({ error: 'فقط منشئ المشروع يمكنه إضافة المواد المطلوبة' }, { status: 403 })
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
        return NextResponse.json(updated)
      }

      const projectMaterial = await db.projectMaterial.create({
        data: { projectId, materialId, quantity: quantity || 0, notes },
        include: { material: true }
      })
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
        if (project && !isFullAdmin(session.role) && project.createdById !== session.userId) {
          return NextResponse.json({ error: 'فقط منشئ المشروع يمكنه إزالة المواد المطلوبة' }, { status: 403 })
        }
      }

      await db.projectMaterial.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    // === تحديث مادة (المدير العام + الستور كيبر فقط) ===
    const { id, name, nameAr, unit, unitAr, category, categoryAr, unitPrice, stockQuantity, status, description, type } = body

    if (!id) {
      return NextResponse.json({ error: 'Material ID is required' }, { status: 400 })
    }

    // فقط الإدارة والستور كيبر يمكنهم تحديث المواد الأولية والمخزون
    if (!isFullAdmin(session.role) && session.role !== 'store_keeper') {
      return NextResponse.json({ error: 'ليس لديك صلاحية تحديث المواد' }, { status: 403 })
    }

    const material = await db.material.update({
      where: { id },
      data: {
        name,
        nameAr,
        unit,
        unitAr,
        category,
        categoryAr,
        unitPrice,
        stockQuantity,
        status,
        description,
        type,
      }
    })

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

    await db.material.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting material:', error)
    return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 })
  }
}
