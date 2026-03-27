import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// الأقسام الافتراضية
const defaultDepartments = [
  { id: 'design', name: 'Design', nameAr: 'التصميم', color: '#8B5CF6', icon: 'pen' },
  { id: 'cnc', name: 'CNC', nameAr: 'القطع الرقمي', color: '#EF4444', icon: 'scissors' },
  { id: 'carpentry', name: 'Carpentry', nameAr: 'النجارة', color: '#F59E0B', icon: 'hammer' },
  { id: 'blacksmith', name: 'Blacksmith', nameAr: 'الحدادة', color: '#6B7280', icon: 'anvil' },
  { id: 'sewing', name: 'Sewing', nameAr: 'الخياطة', color: '#A855F7', icon: 'needle' },
  { id: 'painting', name: 'Painting', nameAr: 'الصبغ', color: '#3B82F6', icon: 'paintbrush' },
  { id: 'foam', name: 'Foam', nameAr: 'الفوم', color: '#10B981', icon: 'box' },
  { id: 'assembly', name: 'Assembly', nameAr: 'التجميع', color: '#F97316', icon: 'puzzle' },
  { id: 'digital_print', name: 'Digital Print', nameAr: 'الطباعة الرقمية', color: '#06B6D4', icon: 'printer' },
  { id: 'other', name: 'Other', nameAr: 'صناعات أخرى', color: '#EC4899', icon: 'settings' },
]

export async function GET() {
  try {
    let departments = await db.department.findMany()
    
    // إذا لم تكن الأقسام موجودة، أنشئها
    if (departments.length === 0) {
      await db.department.createMany({
        data: defaultDepartments
      })
      departments = await db.department.findMany()
    }
    
    // تحقق من وجود الأقسام الجديدة وأضفها إذا لم تكن موجودة
    const existingIds = departments.map(d => d.id)
    const newDepts = defaultDepartments.filter(d => !existingIds.includes(d.id))
    
    if (newDepts.length > 0) {
      await db.department.createMany({
        data: newDepts
      })
      departments = await db.department.findMany()
    }
    
    return NextResponse.json(departments)
  } catch (error) {
    console.error('Error fetching departments:', error)
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
  }
}
