'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  X, Send, Plus, MessageCircle, Image as ImageIcon,
  FileText, Trash2, Download, Copy, Eye, ArrowRight, ArrowLeft,
  Paperclip, MoreVertical, Check, CheckCheck
} from 'lucide-react'
import { toast } from 'sonner'

// أنواع البيانات
interface ChatUser {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  roleLabel: string
}

interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  sender: { id: string; name: string; role: string }
  content: string | null
  messageType: string
  fileUrl: string | null
  fileName: string | null
  fileSize: number | null
  isDeleted: boolean
  createdAt: string
  reads: { id: string; userId: string; user: { id: string; name: string }; readAt: string }[]
}

interface ChatConversation {
  id: string
  name: string | null
  type: string
  createdBy: string | null
  createdAt: string
  updatedAt: string
  unreadCount: number
  participants: {
    id: string
    userId: string
    user: { id: string; name: string; email: string; phone?: string; role: string }
  }[]
  messages: ChatMessage[]
}

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  currentUser: { id: string; name: string; email: string; phone?: string; role: string } | null
  language: 'ar' | 'en'
}

export default function ChatSidebar({ isOpen, onClose, currentUser, language }: ChatSidebarProps) {
  const isRTL = language === 'ar'
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([])
  const [showNewChatDialog, setShowNewChatDialog] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [newChatName, setNewChatName] = useState('')
  const [newChatType, setNewChatType] = useState<'DIRECT' | 'GROUP' | 'BROADCAST'>('DIRECT')
  const [messageSearchQuery, setMessageSearchQuery] = useState('')
  const [showMessageOptions, setShowMessageOptions] = useState<string | null>(null)
  const [showReadersDialog, setShowReadersDialog] = useState<ChatMessage | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // جلب المحادثات
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    }
  }, [])

  // جلب الرسائل - silent=true يعني تحديث بصمت بدون لودينق (للـ polling)
  const fetchMessages = useCallback(async (conversationId: string, silent: boolean = false) => {
    try {
      if (!silent) setLoadingMessages(true)
      const res = await fetch(`/api/chat/messages?conversationId=${conversationId}&limit=100`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      if (!silent) setLoadingMessages(false)
    }
  }, [])

  // جلب المستخدمين
  const fetchChatUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/users')
      if (res.ok) {
        const data = await res.json()
        setChatUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching chat users:', error)
    }
  }, [])

  // Polling للرسائل الجديدة
  useEffect(() => {
    if (!isOpen) return

    fetchConversations()
    fetchChatUsers()

    pollingRef.current = setInterval(() => {
      fetchConversations()
      if (activeConversation) {
        fetchMessages(activeConversation.id, true) // silent=true - تحديث بصمت
      }
    }, 3000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [isOpen, activeConversation, fetchConversations, fetchMessages, fetchChatUsers])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // إرسال رسالة
  const handleSendMessage = async () => {
    if (!activeConversation) return
    if (!newMessage.trim() && !selectedFile) return

    setUploading(true)
    try {
      if (selectedFile) {
        // إرسال ملف/صورة
        const reader = new FileReader()
        reader.onloadend = async () => {
          const isImage = selectedFile.type.startsWith('image/')
          const res = await fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: activeConversation.id,
              content: newMessage.trim() || null,
              messageType: isImage ? 'IMAGE' : 'FILE',
              fileUrl: reader.result as string,
              fileName: selectedFile.name,
              fileSize: selectedFile.size
            })
          })
          if (res.ok) {
            setNewMessage('')
            setSelectedFile(null)
            fetchMessages(activeConversation.id)
            fetchConversations()
          } else {
            const errData = await res.json().catch(() => ({}))
            toast.error(errData.error || (isRTL ? 'فشل في إرسال الرسالة' : 'Failed to send'))
          }
          setUploading(false)
        }
        reader.readAsDataURL(selectedFile)
      } else {
        // إرسال رسالة نصية
        const res = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: activeConversation.id,
            content: newMessage.trim(),
            messageType: 'TEXT'
          })
        })
        if (res.ok) {
          setNewMessage('')
          fetchMessages(activeConversation.id)
          fetchConversations()
        } else {
          const errData = await res.json().catch(() => ({}))
          toast.error(errData.error || (isRTL ? 'فشل في إرسال الرسالة' : 'Failed to send'))
        }
        setUploading(false)
      }
    } catch (error) {
      toast.error(isRTL ? 'فشل في إرسال الرسالة' : 'Failed to send')
      setUploading(false)
    }
  }

  // إنشاء محادثة جديدة
  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) {
      toast.error(isRTL ? 'اختر مشاركاً واحداً على الأقل' : 'Select at least one participant')
      return
    }

    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds: selectedUsers,
          name: newChatType !== 'DIRECT' ? newChatName : undefined,
          type: newChatType === 'DIRECT' && selectedUsers.length === 1 ? 'DIRECT' : (newChatType === 'BROADCAST' ? 'BROADCAST' : 'GROUP')
        })
      })

      if (res.ok) {
        const data = await res.json()
        setShowNewChatDialog(false)
        setSelectedUsers([])
        setNewChatName('')
        setNewChatType('DIRECT')
        fetchConversations()
        if (data.conversation) {
          setActiveConversation(data.conversation)
          fetchMessages(data.conversation.id)
        }
        if (data.existing) {
          toast.success(isRTL ? 'تم فتح المحادثة الموجودة' : 'Opened existing conversation')
        }
      } else {
        const errData = await res.json().catch(() => ({}))
        toast.error(errData.error || (isRTL ? 'فشل في إنشاء المحادثة' : 'Failed to create'))
      }
    } catch (error) {
      toast.error(isRTL ? 'فشل في إنشاء المحادثة' : 'Failed to create')
    }
  }

  // حذف رسالة
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteMessage', messageId })
      })
      if (res.ok) {
        toast.success(isRTL ? 'تم حذف الرسالة' : 'Message deleted')
        if (activeConversation) fetchMessages(activeConversation.id)
      }
    } catch (error) {
      toast.error(isRTL ? 'فشل في حذف الرسالة' : 'Failed to delete')
    }
    setShowMessageOptions(null)
  }

  // حذف كل الرسائل
  const handleDeleteAllMessages = async () => {
    if (!activeConversation) return
    if (!confirm(isRTL ? 'هل تريد حذف جميع الرسائل؟' : 'Delete all messages?')) return

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteAllMessages', conversationId: activeConversation.id })
      })
      if (res.ok) {
        toast.success(isRTL ? 'تم حذف جميع الرسائل' : 'All messages deleted')
        fetchMessages(activeConversation.id)
      }
    } catch (error) {
      toast.error(isRTL ? 'فشل في حذف الرسائل' : 'Failed to delete')
    }
  }

  // نسخ الرسالة
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success(isRTL ? 'تم النسخ' : 'Copied')
    setShowMessageOptions(null)
  }

  // تنزيل ملف
  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = fileName || 'file'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setShowMessageOptions(null)
  }

  // اختيار ملف
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error(isRTL ? 'حجم الملف كبير جداً (الحد 10MB)' : 'File too large (max 10MB)')
      return
    }
    setSelectedFile(file)
  }

  // اسم المحادثة
  const getConversationName = (conv: ChatConversation) => {
    if (conv.name) return conv.name
    if (conv.type === 'DIRECT') {
      const other = conv.participants.find(p => p.userId !== currentUser?.id)
      return other?.user?.name || (isRTL ? 'محادثة' : 'Chat')
    }
    if (conv.type === 'BROADCAST') return isRTL ? 'إعلان عام' : 'Broadcast'
    return conv.participants.map(p => p.user.name).join(', ')
  }

  // صورة/أيقونة المحادثة
  const getConversationIcon = (conv: ChatConversation) => {
    if (conv.type === 'DIRECT') return '👤'
    if (conv.type === 'BROADCAST') return '📢'
    return '👥'
  }

  // وقت آخر رسالة
  const getLastMessageTime = (conv: ChatConversation) => {
    if (!conv.messages || conv.messages.length === 0) return ''
    const msg = conv.messages[0]
    const date = new Date(msg.createdAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return isRTL ? 'الآن' : 'now'
    if (diffMins < 60) return `${diffMins} ${isRTL ? 'د' : 'm'}`
    if (diffHours < 24) return `${diffHours} ${isRTL ? 'س' : 'h'}`
    if (diffDays < 7) return `${diffDays} ${isRTL ? 'ي' : 'd'}`
    return date.toLocaleDateString('en-US')
  }

  // تنسيق حجم الملف
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // تنسيق وقت الرسالة
  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  // حالة القراءة
  const getReadStatus = (message: ChatMessage) => {
    if (message.senderId !== currentUser?.id) return null
    const otherReads = message.reads.filter(r => r.userId !== currentUser?.id)
    if (otherReads.length > 0) {
      return <CheckCheck className="w-4 h-4 text-blue-500" />
    }
    return <Check className="w-4 h-4 text-gray-400" />
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed top-[80px] z-50 h-[calc(100vh-80px)] bg-white shadow-2xl border border-amber-200 flex flex-col"
      style={{
        [isRTL ? 'left' : 'right']: 0,
        width: '420px',
        maxWidth: '95vw'
      }}
    >
      {/* الهيدر */}
      <div className="bg-gradient-to-l from-amber-600 to-amber-700 text-white p-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <h2 className="font-bold text-lg">{isRTL ? 'المحادثات' : 'Chats'}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowNewChatDialog(true)
              fetchChatUsers()
            }}
            className="text-white hover:bg-amber-500 gap-1 font-bold text-base px-3 py-2"
          >
            <Plus className="w-5 h-5" />
            {isRTL ? 'محادثة جديدة' : 'New Chat'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-amber-500">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {activeConversation ? (
        /* ============ عرض المحادثة ============ */
        <div className="flex flex-col flex-1 min-h-0">
          {/* هيدر المحادثة */}
          <div className="bg-amber-50 border-b border-amber-200 p-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setActiveConversation(null); setMessages([]) }}
                className="gap-1">
                {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              </Button>
              <span className="text-2xl">{getConversationIcon(activeConversation)}</span>
              <div>
                <h3 className="font-bold text-amber-900">{getConversationName(activeConversation)}</h3>
                <p className="text-xs text-amber-600">
                  {activeConversation.type === 'DIRECT'
                    ? (isRTL ? 'محادثة مباشرة' : 'Direct Chat')
                    : activeConversation.type === 'BROADCAST'
                    ? (isRTL ? 'إعلان عام' : 'Broadcast')
                    : `${activeConversation.participants.length} ${isRTL ? 'مشاركين' : 'participants'}`
                  }
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDeleteAllMessages} className="text-red-500 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* الرسائل */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50 min-h-0">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{isRTL ? 'لا توجد رسائل بعد' : 'No messages yet'}</p>
                <p className="text-sm">{isRTL ? 'ابدأ المحادثة!' : 'Start the conversation!'}</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === currentUser?.id ? (isRTL ? 'justify-start' : 'justify-end') : (isRTL ? 'justify-end' : 'justify-start')}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 relative group ${
                      msg.senderId === currentUser?.id
                        ? 'bg-amber-500 text-white rounded-br-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                    }`}
                  >
                    {/* اسم المرسل في المحادثات الجماعية */}
                    {activeConversation.type !== 'DIRECT' && msg.senderId !== currentUser?.id && (
                      <p className={`text-xs font-bold mb-1 ${msg.senderId === currentUser?.id ? 'text-amber-100' : 'text-amber-600'}`}>
                        {msg.sender.name}
                      </p>
                    )}

                    {/* محتوى الرسالة */}
                    {msg.messageType === 'TEXT' && msg.content && (
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</p>
                    )}

                    {msg.messageType === 'IMAGE' && msg.fileUrl && (
                      <div>
                        <img
                          src={msg.fileUrl}
                          alt="shared"
                          className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                          style={{ maxHeight: '200px' }}
                          onClick={() => window.open(msg.fileUrl!, '_blank')}
                        />
                        {msg.content && <p className="mt-1 text-sm">{msg.content}</p>}
                      </div>
                    )}

                    {msg.messageType === 'FILE' && msg.fileUrl && (
                      <div className={`flex items-center gap-2 p-2 rounded-lg ${
                        msg.senderId === currentUser?.id ? 'bg-amber-400/30' : 'bg-gray-100'
                      }`}>
                        <FileText className="w-8 h-8 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{msg.fileName || 'ملف'}</p>
                          {msg.fileSize && <p className="text-xs opacity-70">{formatFileSize(msg.fileSize)}</p>}
                        </div>
                        <Button variant="ghost" size="sm"
                          onClick={() => handleDownloadFile(msg.fileUrl!, msg.fileName || 'file')}
                          className={msg.senderId === currentUser?.id ? 'text-white hover:bg-amber-400/30' : ''}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {/* الوقت وحالة القراءة */}
                    <div className={`flex items-center gap-1 mt-1 ${msg.senderId === currentUser?.id ? 'justify-start' : 'justify-end'}`}>
                      <span className="text-[10px] opacity-70">{formatMessageTime(msg.createdAt)}</span>
                      {getReadStatus(msg)}
                    </div>

                    {/* خيارات الرسالة */}
                    <div className="absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ [isRTL ? 'left' : 'right']: '-8px' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 bg-white border shadow-sm rounded-full"
                        onClick={() => setShowMessageOptions(showMessageOptions === msg.id ? null : msg.id)}
                      >
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                      {showMessageOptions === msg.id && (
                        <div className="absolute top-8 bg-white border rounded-lg shadow-xl z-50 py-1 min-w-[140px]"
                          style={{ [isRTL ? 'right' : 'left']: 0 }}>
                          {msg.content && (
                            <button
                              onClick={() => handleCopyMessage(msg.content!)}
                              className="w-full text-right px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Copy className="w-3 h-3" /> {isRTL ? 'نسخ' : 'Copy'}
                            </button>
                          )}
                          {msg.fileUrl && (
                            <button
                              onClick={() => handleDownloadFile(msg.fileUrl!, msg.fileName || 'file')}
                              className="w-full text-right px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Download className="w-3 h-3" /> {isRTL ? 'تنزيل' : 'Download'}
                            </button>
                          )}
                          {msg.reads.length > 0 && msg.senderId === currentUser?.id && (
                            <button
                              onClick={() => { setShowReadersDialog(msg); setShowMessageOptions(null) }}
                              className="w-full text-right px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Eye className="w-3 h-3" /> {isRTL ? 'المشاهدين' : 'Viewers'}
                            </button>
                          )}
                          {(msg.senderId === currentUser?.id || currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance') && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="w-full text-right px-3 py-1.5 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                            >
                              <Trash2 className="w-3 h-3" /> {isRTL ? 'حذف' : 'Delete'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* حقل الإدخال */}
          <div className="bg-white border-t border-amber-200 p-3 shrink-0">
            {/* عرض الملف المختار */}
            {selectedFile && (
              <div className="flex items-center gap-2 mb-2 bg-amber-50 p-2 rounded-lg">
                {selectedFile.type.startsWith('image/') ? (
                  <ImageIcon className="w-5 h-5 text-amber-600" />
                ) : (
                  <FileText className="w-5 h-5 text-amber-600" />
                )}
                <span className="text-sm truncate flex-1">{selectedFile.name}</span>
                <span className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)} className="h-6 w-6 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 text-amber-600 hover:bg-amber-50"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder={isRTL ? 'اكتب رسالة...' : 'Type a message...'}
                className="flex-1 border-amber-200 focus:border-amber-400"
              />
              <Button
                onClick={handleSendMessage}
                disabled={uploading || (!newMessage.trim() && !selectedFile)}
                className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white"
                size="sm"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ============ قائمة المحادثات ============ */
        <div className="flex-1 overflow-y-auto min-h-0">
          {conversations.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageCircle className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p className="text-lg mb-1">{isRTL ? 'لا توجد محادثات' : 'No conversations'}</p>
              <p className="text-sm">{isRTL ? 'ابدأ محادثة جديدة!' : 'Start a new chat!'}</p>
              <Button
                onClick={() => {
                  setShowNewChatDialog(true)
                  fetchChatUsers()
                }}
                className="mt-4 bg-amber-500 hover:bg-amber-600 text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                {isRTL ? 'محادثة جديدة' : 'New Chat'}
              </Button>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => {
                  setActiveConversation(conv)
                  fetchMessages(conv.id)
                }}
                className="flex items-center gap-3 p-3 hover:bg-amber-50 cursor-pointer border-b border-gray-100 transition-colors"
              >
                <div className="text-3xl shrink-0">{getConversationIcon(conv)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-900 truncate">{getConversationName(conv)}</h4>
                    <span className="text-[10px] text-gray-400 shrink-0">{getLastMessageTime(conv)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 truncate">
                      {conv.messages && conv.messages.length > 0
                        ? (conv.messages[0].messageType !== 'TEXT'
                          ? (isRTL ? '📎 مرفق' : '📎 Attachment')
                          : conv.messages[0].content?.substring(0, 50) || (isRTL ? 'رسالة' : 'Message'))
                        : (isRTL ? 'لا توجد رسائل' : 'No messages')
                      }
                    </p>
                    {conv.unreadCount > 0 && (
                      <Badge className="bg-amber-500 text-white text-[10px] h-5 min-w-[20px] flex items-center justify-center shrink-0">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* نافذة إنشاء محادثة جديدة */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{isRTL ? 'محادثة جديدة' : 'New Chat'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* نوع المحادثة */}
            <div>
              <label className="text-sm font-medium mb-2 block">{isRTL ? 'نوع المحادثة' : 'Chat Type'}</label>
              <div className="flex gap-2">
                <Button
                  variant={newChatType === 'DIRECT' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewChatType('DIRECT')}
                  className={newChatType === 'DIRECT' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                >
                  👤 {isRTL ? 'مباشرة' : 'Direct'}
                </Button>
                <Button
                  variant={newChatType === 'GROUP' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewChatType('GROUP')}
                  className={newChatType === 'GROUP' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                >
                  👥 {isRTL ? 'مجموعة' : 'Group'}
                </Button>
                <Button
                  variant={newChatType === 'BROADCAST' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewChatType('BROADCAST')}
                  className={newChatType === 'BROADCAST' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                >
                  📢 {isRTL ? 'إعلان' : 'Broadcast'}
                </Button>
              </div>
            </div>

            {/* اسم المحادثة للمجموعة */}
            {newChatType !== 'DIRECT' && (
              <div>
                <label className="text-sm font-medium mb-1 block">{isRTL ? 'اسم المحادثة' : 'Chat Name'}</label>
                <Input
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  placeholder={isRTL ? 'أدخل اسم المحادثة...' : 'Enter chat name...'}
                />
              </div>
            )}

            {/* اختيار المشاركين */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                {isRTL ? 'اختر المشاركين' : 'Select Participants'}
                {selectedUsers.length > 0 && (
                  <span className="text-amber-600 mr-1">({selectedUsers.length})</span>
                )}
              </label>
              <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-1">
                {chatUsers.length === 0 ? (
                  <p className="text-center text-gray-400 py-4">{isRTL ? 'لا يوجد مستخدمون' : 'No users'}</p>
                ) : (
                  chatUsers.map((u) => (
                    <label
                      key={u.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedUsers.includes(u.id) ? 'bg-amber-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <Checkbox
                        checked={selectedUsers.includes(u.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers(prev => [...prev, u.id])
                          } else {
                            setSelectedUsers(prev => prev.filter(id => id !== u.id))
                          }
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.roleLabel}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewChatDialog(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              onClick={handleCreateConversation}
              disabled={selectedUsers.length === 0}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isRTL ? 'إنشاء' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة المشاهدين */}
      <Dialog open={!!showReadersDialog} onOpenChange={() => setShowReadersDialog(null)}>
        <DialogContent className="max-w-sm" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{isRTL ? 'المشاهدون' : 'Viewers'}</DialogTitle>
          </DialogHeader>
          {showReadersDialog && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-2">
                {isRTL ? `${showReadersDialog.reads.length} شخص قرأ الرسالة` : `${showReadersDialog.reads.length} people read this`}
              </p>
              {showReadersDialog.reads.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="font-medium text-sm">{r.user.name}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(r.readAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
