import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - جلب محادثات المستخدم
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId: user.userId }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true, role: true }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          where: { isDeleted: false },
          include: {
            sender: { select: { id: true, name: true } },
            reads: { include: { user: { select: { id: true, name: true } } } }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // حساب الرسائل غير المقروءة لكل محادثة
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const participant = conv.participants.find(p => p.userId === user.userId)
        const lastReadAt = participant?.lastReadAt

        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            isDeleted: false,
            senderId: { not: user.userId },
            ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {})
          }
        })

        return {
          ...conv,
          unreadCount
        }
      })
    )

    return NextResponse.json({ conversations: conversationsWithUnread })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json({ error: 'فشل في جلب المحادثات' }, { status: 500 })
  }
}

// POST - إنشاء محادثة جديدة
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const body = await req.json()
    const { participantIds, name, type = 'DIRECT' } = body

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ error: 'اختر مشاركاً واحداً على الأقل' }, { status: 400 })
    }

    // التأكد من أن المستخدم الحالي ضمن المشاركين
    const allParticipantIds = [...new Set([...participantIds, user.userId])]

    // للمحادثة المباشرة - التحقق من عدم وجود محادثة سابقة
    if (type === 'DIRECT' && allParticipantIds.length === 2) {
      const existingConv = await prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          participants: {
            every: { userId: { in: allParticipantIds } }
          }
        },
        include: {
          participants: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true, role: true } }
            }
          }
        }
      })

      if (existingConv && existingConv.participants.length === 2) {
        return NextResponse.json({ conversation: existingConv, existing: true })
      }
    }

    // إنشاء محادثة جديدة
    const conversation = await prisma.conversation.create({
      data: {
        name: type === 'DIRECT' ? null : (name || 'محادثة جماعية'),
        type,
        createdBy: user.userId,
        participants: {
          create: allParticipantIds.map(uid => ({
            userId: uid
          }))
        }
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true, role: true } }
          }
        }
      }
    })

    return NextResponse.json({ conversation, existing: false })
  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json({ error: 'فشل في إنشاء المحادثة' }, { status: 500 })
  }
}

// PUT - تحديث محادثة (تحديث آخر قراءة)
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const body = await req.json()
    const { conversationId, action } = body

    if (action === 'markRead' && conversationId) {
      // تحديث آخر قراءة للمستخدم في هذه المحادثة
      await prisma.conversationParticipant.updateMany({
        where: {
          conversationId,
          userId: user.userId
        },
        data: { lastReadAt: new Date() }
      })

      // تسجيل قراءة الرسائل
      const messages = await prisma.message.findMany({
        where: {
          conversationId,
          isDeleted: false,
          senderId: { not: user.userId },
          reads: { none: { userId: user.userId } }
        },
        select: { id: true }
      })

      if (messages.length > 0) {
        await prisma.messageRead.createMany({
          data: messages.map(m => ({
            messageId: m.id,
            userId: user.userId
          })),
          skipDuplicates: true
        })
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'markAllRead') {
      // تحديث جميع المحادثات
      const participations = await prisma.conversationParticipant.findMany({
        where: { userId: user.userId }
      })

      for (const p of participations) {
        await prisma.conversationParticipant.update({
          where: { id: p.id },
          data: { lastReadAt: new Date() }
        })

        const messages = await prisma.message.findMany({
          where: {
            conversationId: p.conversationId,
            isDeleted: false,
            senderId: { not: user.userId },
            reads: { none: { userId: user.userId } }
          },
          select: { id: true }
        })

        if (messages.length > 0) {
          await prisma.messageRead.createMany({
            data: messages.map(m => ({
              messageId: m.id,
              userId: user.userId
            })),
            skipDuplicates: true
          })
        }
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
  } catch (error) {
    console.error('Error updating conversation:', error)
    return NextResponse.json({ error: 'فشل في التحديث' }, { status: 500 })
  }
}
