import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - جلب جميع المواد
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const projectId = searchParams.get('projectId')
    const search = searchParams.get('search')

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

    // إذا طلب مشروع معين، نرجع المواد المرتبطة به
    if (projectId) {
      const projectMaterials = await db.projectMaterial.findMany({
        where: { projectId },
        include: { material: true },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json({ materials, projectMaterials })
    }

    return NextResponse.json(materials)
  } catch (error) {
    console.error('Error fetching materials:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch materials'
    return NextResponse.json({ error: 'Failed to fetch materials', details: message }, { status: 500 })
  }
}

// POST - إنشاء مادة جديدة أو استيراد من Excel
export async function POST(request: NextRequest) {
  try {
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

          // تحقق من وجود المادة بنفس الاسم
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

// PUT - تحديث مادة أو إضافة مادة لمشروع
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    // إضافة مادة لمشروع
    if (body.action === 'addToProject') {
      const { projectId, materialId, quantity, notes } = body
      if (!projectId || !materialId) {
        return NextResponse.json({ error: 'Project ID and Material ID are required' }, { status: 400 })
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

    // إزالة مادة من مشروع
    if (body.action === 'removeFromProject') {
      const { id } = body
      if (!id) {
        return NextResponse.json({ error: 'ProjectMaterial ID is required' }, { status: 400 })
      }
      await db.projectMaterial.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    // تحديث مادة
    const { id, name, nameAr, unit, unitAr, category, categoryAr, unitPrice, stockQuantity, status, description, type } = body

    if (!id) {
      return NextResponse.json({ error: 'Material ID is required' }, { status: 400 })
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

// DELETE - حذف مادة
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Material ID is required' }, { status: 400 })
    }

    // حذف الارتباطات أولاً
    await db.projectMaterial.deleteMany({
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
