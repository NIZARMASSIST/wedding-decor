import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - جلب مرفقات مرحلة معينة
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const stageId = searchParams.get('stageId')
    
    if (stageId) {
      const attachments = await db.attachment.findMany({
        where: { stageId },
        orderBy: { uploadedAt: 'desc' }
      })
      return NextResponse.json(attachments)
    }
    
    // جلب جميع المرفقات مع تفاصيل المرحلة
    const attachments = await db.attachment.findMany({
      include: {
        stage: {
          include: {
            item: true,
            department: true
          }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    })
    
    return NextResponse.json(attachments)
  } catch (error) {
    console.error('Error fetching attachments:', error)
    return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 })
  }
}

// POST - إضافة مرفق جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stageId, fileName, fileType, fileData, fileSize, description, uploadType } = body
    
    const attachment = await db.attachment.create({
      data: {
        stageId,
        fileName,
        fileType,
        fileData,
        fileSize,
        description,
        uploadType: uploadType || 'work'
      }
    })
    
    return NextResponse.json(attachment)
  } catch (error) {
    console.error('Error creating attachment:', error)
    return NextResponse.json({ error: 'Failed to create attachment' }, { status: 500 })
  }
}

// DELETE - حذف مرفق
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Attachment ID is required' }, { status: 400 })
    }
    
    await db.attachment.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting attachment:', error)
    return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 })
  }
}
