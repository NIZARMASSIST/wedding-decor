import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - جلب رسائل محادثة
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId')
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!conversationId) {
      return NextResponse.json({ error: 'معرف المحادثة مطلوب' }, { status: 400 })
    }

    // التحقق من أن المستخدم مشارك في هذه المحادثة
    const participation = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.userId
        }
      }
    })

    if (!participation) {
      return NextResponse.json({ error: 'غير مصرح لهذه المحادثة' }, { status: 403 })
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        isDeleted: false,
        ...(cursor ? { id: { lt: cursor } } : {})
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        reads: {
          include: { user: { select: { id: true, name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    // تحديث آخر قراءة
    await prisma.conversationParticipant.update({
      where: { id: participation.id },
      data: { lastReadAt: new Date() }
    })

    // تسجيل قراءة الرسائل
    const unreadMessages = messages.filter(
      m => m.senderId !== user.userId && !m.reads.some(r => r.userId === user.userId)
    )

    if (unreadMessages.length > 0) {
      await prisma.messageRead.createMany({
        data: unreadMessages.map(m => ({
          messageId: m.id,
          userId: user.userId
        })),
        skipDuplicates: true
      })
    }

    return NextResponse.json({
      messages: messages.reverse(),
      hasMore: messages.length === limit
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'فشل في جلب الرسائل' }, { status: 500 })
  }
}

// POST - إرسال رسالة
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const body = await req.json()
    const { conversationId, content, messageType = 'TEXT', fileUrl, fileName, fileSize } = body

    if (!conversationId) {
      return NextResponse.json({ error: 'معرف المحادثة مطلوب' }, { status: 400 })
    }

    if (!content && !fileUrl) {
      return NextResponse.json({ error: 'الرسالة لا يمكن أن تكون فارغة' }, { status: 400 })
    }

    // التحقق من أن المستخدم مشارك في هذه المحادثة
    const participation = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.userId
        }
      }
    })

    if (!participation) {
      return NextResponse.json({ error: 'غير مصرح لهذه المحادثة' }, { status: 403 })
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: user.userId,
        content: content || null,
        messageType,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        reads: { include: { user: { select: { id: true, name: true } } } }
      }
    })

    // تحديث تاريخ المحادثة
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'فشل في إرسال الرسالة' }, { status: 500 })
  }
}

// PUT - حذف رسالة أو حذف كل الرسائل
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const body = await req.json()
    const { action, messageId, conversationId } = body

    if (action === 'deleteMessage' && messageId) {
      // حذف رسالة واحدة
      const message = await prisma.message.findUnique({ where: { id: messageId } })
      if (!message) {
        return NextResponse.json({ error: 'الرسالة غير موجودة' }, { status: 404 })
      }
      if (message.senderId !== user.userId && user.role !== 'general_manager') {
        return NextResponse.json({ error: 'غير مصرح بحذف هذه الرسالة' }, { status: 403 })
      }
      await prisma.message.update({
        where: { id: messageId },
        data: { isDeleted: true, content: null, fileUrl: null }
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'deleteAllMessages' && conversationId) {
      // حذف كل رسائل المحادثة
      const participation = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId: user.userId
          }
        }
      })
      if (!participation && user.role !== 'general_manager') {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
      }
      await prisma.message.updateMany({
        where: { conversationId, isDeleted: false },
        data: { isDeleted: true, content: null, fileUrl: null }
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
  } catch (error) {
    console.error('Error updating message:', error)
    return NextResponse.json({ error: 'فشل في التحديث' }, { status: 500 })
  }
}
