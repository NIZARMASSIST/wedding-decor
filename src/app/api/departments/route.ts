import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// الأقسام الافتراضية
const defaultDepartments = [
  { name: 'Design', nameAr: 'التصميم', color: '#8B5CF6', icon: 'pen' },
  { name: 'CNC', nameAr: 'القطع الرقمي', color: '#EF4444', icon: 'scissors' },
  { name: 'Carpentry', nameAr: 'النجارة', color: '#F59E0B', icon: 'hammer' },
  { name: 'Blacksmith', nameAr: 'الحدادة', color: '#6B7280', icon: 'anvil' },
  { name: 'Sewing', nameAr: 'الخياطة', color: '#A855F7', icon: 'needle' },
  { name: 'Painting', nameAr: 'الصبغ', color: '#3B82F6', icon: 'paintbrush' },
  { name: 'Foam', nameAr: 'الفوم', color: '#10B981', icon: 'box' },
  { name: 'Assembly', nameAr: 'التجميع', color: '#F97316', icon: 'puzzle' },
  { name: 'Digital Print', nameAr: 'الطباعة الرقمية', color: '#06B6D4', icon: 'printer' },
  { name: 'Other', nameAr: 'صناعات أخرى', color: '#EC4899', icon: 'settings' },
]

// GET - جلب جميع الأقسام
export async function GET() {
  try {
    console.log('Fetching departments...')
    
    let departments = await db.department.findMany({
      orderBy: { name: 'asc' }
    })
    
    console.log(`Found ${departments.length} departments`)
    
    // إذا لم تكن الأقسام موجودة، أنشئها
    if (departments.length === 0) {
      console.log('No departments found, creating defaults...')
      
      try {
        await db.department.createMany({
          data: defaultDepartments,
          skipDuplicates: true
        })
        
        departments = await db.department.findMany({
          orderBy: { name: 'asc' }
        })
        
        console.log(`Created ${departments.length} default departments`)
      } catch (createError) {
        console.error('Error creating default departments:', createError)
        // إذا فشل الإنشاء، أعد الأقسام الفارغة
      }
    }
    
    return NextResponse.json(departments)
  } catch (error) {
    console.error('Error fetching departments:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch departments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - إضافة قسم جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, nameAr, color, icon } = body
    
    if (!name || !nameAr) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    
    const department = await db.department.create({
      data: {
        name,
        nameAr,
        color: color || '#6B7280',
        icon: icon || 'settings'
      }
    })
    
    return NextResponse.json(department)
  } catch (error) {
    console.error('Error creating department:', error)
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 })
  }
}

// PUT - تحديث قسم
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, nameAr, color, icon } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 })
    }
    
    const department = await db.department.update({
      where: { id },
      data: {
        name,
        nameAr,
        color,
        icon
      }
    })
    
    return NextResponse.json(department)
  } catch (error) {
    console.error('Error updating department:', error)
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 })
  }
}

// DELETE - حذف قسم
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 })
    }
    
    // التحقق من وجود مراحل مرتبطة بالقسم
    const stagesCount = await db.stage.count({
      where: { departmentId: id }
    })
    
    if (stagesCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete department with associated stages',
        stagesCount 
      }, { status: 400 })
    }
    
    await db.department.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting department:', error)
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 })
  }
}
