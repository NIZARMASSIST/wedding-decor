'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Plus, Trash2, Calendar, Clock, Package, Users, 
  Settings, Printer, ChevronUp, ChevronDown,
  Hammer, Scissors, Paintbrush, Box, Settings2, Factory,
  Puzzle, Printer as PrinterIcon, Globe, Paperclip, 
  Image as ImageIcon, FileText, Download, Eye, X, PenTool
} from 'lucide-react'
import { toast } from 'sonner'
import { translations, Language } from '@/lib/i18n'

// أنواع البيانات
interface Attachment {
  id: string
  stageId: string
  fileName: string
  fileType: string
  fileData: string
  fileSize: number
  description?: string
  uploadType: string
  uploadedAt: string
}

interface Department {
  id: string
  name: string
  nameAr: string
  color: string
  icon: string
}

interface Stage {
  id: string
  itemId: string
  departmentId: string
  department?: Department
  stageNumber: number
  timePerUnit: number
  estimatedTime: number
  quantity: number
  shifts: number
  status: string
  startDate?: string
  endDate?: string
  readyForNextAt?: string
  notes?: string
  attachments?: Attachment[]
  calculatedStartDate?: Date
  calculatedEndDate?: Date
}

interface ProductionItem {
  id: string
  name: string
  image?: string
  priority: number
  notes?: string
  status: string
  totalQuantity: number
  deadline?: string
  stages: Stage[]
  createdAt: string
  updatedAt: string
}

// أيقونات الأقسام
const departmentIcons: Record<string, any> = {
  'design': PenTool,
  'cnc': Scissors,
  'carpentry': Hammer,
  'blacksmith': Factory,
  'sewing': Scissors,
  'painting': Paintbrush,
  'foam': Box,
  'assembly': Puzzle,
  'digital_print': PrinterIcon,
  'other': Settings2
}

// حالات العنصر
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-500'
    case 'in_progress': return 'bg-blue-500'
    case 'completed': return 'bg-green-500'
    default: return 'bg-gray-500'
  }
}

// تنسيق حجم الملف
const formatFileSize = (bytes: number, t: typeof translations.ar) => {
  if (bytes < 1024) return `${bytes} ${t.bytes}`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t.kb}`
  return `${(bytes / (1024 * 1024)).toFixed(1)} ${t.mb}`
}

export default function Home() {
  // حالة اللغة
  const [language, setLanguage] = useState<Language>('ar')
  const t = translations[language]
  const isRTL = language === 'ar'
  
  const [items, setItems] = useState<ProductionItem[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('items')
  
  // حالة نافذة إضافة عنصر
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [newItem, setNewItem] = useState({
    name: '',
    image: '',
    priority: 1,
    notes: '',
    totalQuantity: 1,
    deadline: ''
  })
  const [newStages, setNewStages] = useState<any[]>([])
  
  // حالة نافذة إضافة مرحلة
  const [addStageOpen, setAddStageOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [newStage, setNewStage] = useState({
    departmentId: '',
    timePerUnit: 0,
    quantity: 1,
    shifts: 1,
    notes: ''
  })

  // حالة نافذة المرفقات
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false)
  const [selectedStageId, setSelectedStageId] = useState<string>('')
  const [selectedStageItem, setSelectedStageItem] = useState<string>('')
  const [newAttachment, setNewAttachment] = useState({
    file: null as File | null,
    description: '',
    uploadType: 'work'
  })
  
  // حالة عرض المرفقات
  const [viewAttachmentsOpen, setViewAttachmentsOpen] = useState(false)
  const [viewingStage, setViewingStage] = useState<Stage | null>(null)

  // حالة الجدول الزمني
  const [schedule, setSchedule] = useState<any>(null)

  // جلب البيانات
  const fetchData = useCallback(async () => {
    try {
      const [itemsRes, deptsRes, scheduleRes, attachmentsRes] = await Promise.all([
        fetch('/api/items'),
        fetch('/api/departments'),
        fetch('/api/schedule'),
        fetch('/api/attachments')
      ])
      
      const itemsData = await itemsRes.json()
      const deptsData = await deptsRes.json()
      const scheduleData = await scheduleRes.json()
      const attachmentsData = await attachmentsRes.json()
      
      // دمج المرفقات مع المراحل
      const itemsWithAttachments = itemsData.map((item: ProductionItem) => ({
        ...item,
        stages: item.stages.map((stage: Stage) => ({
          ...stage,
          attachments: attachmentsData.filter((a: Attachment) => a.stageId === stage.id)
        }))
      }))
      
      setItems(itemsWithAttachments)
      setDepartments(deptsData)
      setSchedule(scheduleData)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error(t.msg_error)
    } finally {
      setLoading(false)
    }
  }, [t.msg_error])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // تحويل الصورة إلى base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewItem(prev => ({ ...prev, image: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  // إضافة عنصر جديد
  const handleAddItem = async () => {
    if (!newItem.name.trim()) {
      toast.error(t.msg_enter_name)
      return
    }

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItem,
          stages: newStages
        })
      })
      
      if (res.ok) {
        toast.success(t.msg_item_added)
        setAddItemOpen(false)
        setNewItem({
          name: '',
          image: '',
          priority: 1,
          notes: '',
          totalQuantity: 1,
          deadline: ''
        })
        setNewStages([])
        fetchData()
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // حذف عنصر
  const handleDeleteItem = async (id: string) => {
    if (!confirm(t.msg_confirm_delete)) return
    
    try {
      const res = await fetch(`/api/items?id=${id}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        toast.success(t.msg_item_deleted)
        fetchData()
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // تحديث حالة العنصر
  const handleUpdateItemStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })
      
      if (res.ok) {
        toast.success(t.msg_item_updated)
        fetchData()
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // تحديث أولوية العنصر
  const handleUpdatePriority = async (id: string, direction: 'up' | 'down') => {
    const item = items.find(i => i.id === id)
    if (!item) return
    
    const newPriority = direction === 'up' 
      ? Math.max(1, item.priority - 1)
      : item.priority + 1
    
    try {
      const res = await fetch('/api/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, priority: newPriority })
      })
      
      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // إضافة مرحلة جديدة
  const handleAddStage = async () => {
    if (!selectedItemId || !newStage.departmentId) {
      toast.error(t.msg_select_department)
      return
    }

    try {
      const res = await fetch('/api/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItemId,
          ...newStage
        })
      })
      
      if (res.ok) {
        toast.success(t.msg_stage_added)
        setAddStageOpen(false)
        setNewStage({
          departmentId: '',
          timePerUnit: 0,
          quantity: 1,
          shifts: 1,
          notes: ''
        })
        fetchData()
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // حذف مرحلة
  const handleDeleteStage = async (id: string) => {
    if (!confirm(t.msg_confirm_delete_stage)) return
    
    try {
      const res = await fetch(`/api/stages?id=${id}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        toast.success(t.msg_stage_deleted)
        fetchData()
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // تحديث حالة المرحلة
  const handleUpdateStageStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/stages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })
      
      if (res.ok) {
        toast.success(t.msg_item_updated)
        fetchData()
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // رفع مرفق
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // التحقق من حجم الملف (10 ميجابايت كحد أقصى)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t.msg_file_too_large)
      return
    }
    
    // التحقق من نوع الملف
    const isImage = file.type.startsWith('image/')
    const isPDF = file.type === 'application/pdf'
    
    if (!isImage && !isPDF) {
      toast.error(t.msg_invalid_file_type)
      return
    }
    
    setNewAttachment(prev => ({ ...prev, file }))
  }

  // إضافة مرفق
  const handleAddAttachment = async () => {
    if (!newAttachment.file || !selectedStageId) {
      toast.error(t.msg_select_file)
      return
    }

    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const fileType = newAttachment.file!.type.startsWith('image/') ? 'image' : 'pdf'
        
        const res = await fetch('/api/attachments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stageId: selectedStageId,
            fileName: newAttachment.file!.name,
            fileType,
            fileData: reader.result as string,
            fileSize: newAttachment.file!.size,
            description: newAttachment.description,
            uploadType: newAttachment.uploadType
          })
        })
        
        if (res.ok) {
          toast.success(t.msg_attachment_added)
          setAttachmentDialogOpen(false)
          setNewAttachment({
            file: null,
            description: '',
            uploadType: 'work'
          })
          fetchData()
        }
      }
      reader.readAsDataURL(newAttachment.file)
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // حذف مرفق
  const handleDeleteAttachment = async (id: string) => {
    if (!confirm(t.msg_confirm_delete_attachment)) return
    
    try {
      const res = await fetch(`/api/attachments?id=${id}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        toast.success(t.msg_attachment_deleted)
        fetchData()
        
        // تحديث قائمة المرفقات المعروضة
        if (viewingStage) {
          setViewingStage({
            ...viewingStage,
            attachments: viewingStage.attachments?.filter(a => a.id !== id) || []
          })
        }
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // طباعة الجدول الزمني
  const handlePrint = () => {
    window.print()
  }

  // تصدير إلى Excel
  const handleExport = async () => {
    try {
      const res = await fetch('/api/export')
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `wedding-decor-report-${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success(language === 'ar' ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully')
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // تنسيق التاريخ
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-'
    const d = new Date(date)
    return d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // الحصول على اسم القسم باللغة المناسبة
  const getDepartmentName = (dept: Department) => {
    return language === 'ar' ? dept.nameAr : dept.name
  }

  // تسميات الحالة
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return t.status_pending
      case 'in_progress': return t.status_in_progress
      case 'completed': return t.status_completed
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-800 font-medium">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* الهيدر */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200 sticky top-0 z-50 print:hidden">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-amber-900">{t.title}</h1>
                <p className="text-sm text-amber-700">{t.subtitle} <span className="text-xs bg-amber-200 px-2 py-0.5 rounded">v2.0</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* مبدّل اللغة */}
              <div className="flex items-center gap-1 bg-white rounded-lg border p-1">
                <Button
                  variant={language === 'ar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLanguage('ar')}
                  className={`gap-1 ${language === 'ar' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                >
                  <Globe className="w-4 h-4" />
                  عربي
                </Button>
                <Button
                  variant={language === 'en' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLanguage('en')}
                  className={`gap-1 ${language === 'en' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                >
                  <Globe className="w-4 h-4" />
                  EN
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleExport} variant="outline" className="gap-2 bg-green-50 hover:bg-green-100 border-green-300 text-green-700">
                  <Download className="w-4 h-4" />
                  {t.btn_export || 'تصدير Excel'}
                </Button>
                <Button onClick={handlePrint} variant="outline" className="gap-2">
                  <Printer className="w-4 h-4" />
                  {t.btn_print}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm p-1 rounded-lg shadow-sm print:hidden">
            <TabsTrigger value="items" className="gap-2">
              <Package className="w-4 h-4" />
              {t.nav_items}
            </TabsTrigger>
            <TabsTrigger value="stages" className="gap-2">
              <Settings className="w-4 h-4" />
              {t.nav_stages}
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="w-4 h-4" />
              {t.nav_schedule}
            </TabsTrigger>
            <TabsTrigger value="departments" className="gap-2">
              <Users className="w-4 h-4" />
              {t.nav_departments}
            </TabsTrigger>
          </TabsList>

          {/* تبويب العناصر */}
          <TabsContent value="items" className="space-y-4">
            <div className="flex justify-between items-center print:hidden">
              <h2 className="text-xl font-bold text-amber-900">{t.items_list} ({items.length})</h2>
              <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                    <Plus className="w-4 h-4" />
                    {t.btn_add_item}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t.btn_add_item}</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* معلومات أساسية */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t.item_name} {t.required}</Label>
                        <Input
                          id="name"
                          value={newItem.name}
                          onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                          placeholder={t.item_name_placeholder}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="priority">{t.item_priority}</Label>
                        <Input
                          id="priority"
                          type="number"
                          min="1"
                          value={newItem.priority}
                          onChange={(e) => setNewItem(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity">{t.item_quantity}</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={newItem.totalQuantity}
                          onChange={(e) => setNewItem(prev => ({ ...prev, totalQuantity: parseInt(e.target.value) || 1 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deadline">{t.item_deadline}</Label>
                        <Input
                          id="deadline"
                          type="datetime-local"
                          value={newItem.deadline}
                          onChange={(e) => setNewItem(prev => ({ ...prev, deadline: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="image">{t.item_image}</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          id="image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="flex-1"
                        />
                        {newItem.image && (
                          <img
                            src={newItem.image}
                            alt={t.preview}
                            className="w-20 h-20 object-cover rounded-lg border"
                          />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">{t.item_notes}</Label>
                      <Textarea
                        id="notes"
                        value={newItem.notes}
                        onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder={t.item_notes_placeholder}
                        rows={2}
                      />
                    </div>

                    <Separator />

                    {/* المراحل */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label>{t.stages} ({newStages.length})</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setNewStages(prev => [...prev, {
                            departmentId: '',
                            timePerUnit: 0,
                            quantity: 1,
                            shifts: 1,
                            notes: ''
                          }])}
                        >
                          <Plus className="w-4 h-4 ml-1" />
                          {t.btn_add_stage}
                        </Button>
                      </div>

                      {newStages.map((stage, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <Badge variant="outline">{t.stage_number} {index + 1}</Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setNewStages(prev => prev.filter((_, i) => i !== index))}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">{t.stage_department}</Label>
                              <Select
                                value={stage.departmentId}
                                onValueChange={(val) => {
                                  const updated = [...newStages]
                                  updated[index].departmentId = val
                                  setNewStages(updated)
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t.stage_select_department} />
                                </SelectTrigger>
                                <SelectContent>
                                  {departments.map(dept => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-3 h-3 rounded-full"
                                          style={{ backgroundColor: dept.color }}
                                        />
                                        {getDepartmentName(dept)}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{t.stage_time_per_unit}</Label>
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                value={stage.timePerUnit}
                                onChange={(e) => {
                                  const updated = [...newStages]
                                  updated[index].timePerUnit = parseFloat(e.target.value) || 0
                                  setNewStages(updated)
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{t.stage_quantity}</Label>
                              <Input
                                type="number"
                                min="1"
                                value={stage.quantity}
                                onChange={(e) => {
                                  const updated = [...newStages]
                                  updated[index].quantity = parseInt(e.target.value) || 1
                                  setNewStages(updated)
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{t.stage_shifts}</Label>
                              <Select
                                value={stage.shifts?.toString() || '1'}
                                onValueChange={(val) => {
                                  const updated = [...newStages]
                                  updated[index].shifts = parseInt(val)
                                  setNewStages(updated)
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">{t.stage_single_shift}</SelectItem>
                                  <SelectItem value="2">{t.stage_double_shift}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                            {t.stage_total_time}: <span className="font-bold">{((stage.timePerUnit || 0) * (stage.quantity || 1)).toFixed(1)} {t.stage_time_hours}</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={() => setAddItemOpen(false)}>
                      {t.btn_cancel}
                    </Button>
                    <Button onClick={handleAddItem} className="gap-2">
                      <Plus className="w-4 h-4" />
                      {t.btn_save}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* قائمة العناصر */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map(item => (
                <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {item.image && (
                    <div className="aspect-video bg-gray-100 relative">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <Badge
                        className={`absolute top-2 ${isRTL ? 'left-2' : 'left-2'} ${getStatusColor(item.status)}`}
                      >
                        {getStatusLabel(item.status)}
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <CardDescription>
                          {t.item_priority}: {item.priority} | {t.item_quantity}: {item.totalQuantity}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1 print:hidden">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdatePriority(item.id, 'up')}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdatePriority(item.id, 'down')}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* شريط التقدم */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{t.schedule_progress}</span>
                        <span>
                          {item.stages.filter(s => s.status === 'completed').length}/{item.stages.length} {t.stages}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
                          style={{
                            width: `${item.stages.length > 0
                              ? (item.stages.filter(s => s.status === 'completed').length / item.stages.length) * 100
                              : 0}%`
                          }}
                        />
                      </div>
                    </div>

                    {/* المراحل */}
                    <div className="flex flex-wrap gap-1">
                      {item.stages.map(stage => {
                        const hasAttachments = stage.attachments && stage.attachments.length > 0
                        return (
                          <Badge
                            key={stage.id}
                            variant="outline"
                            style={{ borderColor: stage.department?.color }}
                            className={`cursor-pointer ${stage.status === 'completed' ? 'bg-green-100' : stage.status === 'in_progress' ? 'bg-blue-100' : ''} ${hasAttachments ? 'ring-2 ring-offset-1' : ''}`}
                            onClick={() => {
                              setViewingStage(stage)
                              setViewAttachmentsOpen(true)
                            }}
                          >
                            {stage.stageNumber}. {stage.department ? getDepartmentName(stage.department) : ''}
                            {hasAttachments && (
                              <Paperclip className="w-3 h-3 ml-1" />
                            )}
                          </Badge>
                        )
                      })}
                    </div>

                    {item.deadline && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{t.item_deadline}: {formatDate(item.deadline)}</span>
                      </div>
                    )}

                    {/* أزرار الإجراءات */}
                    <div className="flex justify-between items-center pt-2 border-t print:hidden">
                      <Select
                        value={item.status}
                        onValueChange={(val) => handleUpdateItemStatus(item.id, val)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{t.status_pending}</SelectItem>
                          <SelectItem value="in_progress">{t.status_in_progress}</SelectItem>
                          <SelectItem value="completed">{t.status_completed}</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedItemId(item.id)
                            setAddStageOpen(true)
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {items.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-600">{t.no_items}</h3>
                <p className="text-gray-500">{t.no_items_desc}</p>
              </div>
            )}
          </TabsContent>

          {/* تبويب المراحل */}
          <TabsContent value="stages" className="space-y-4">
            <div className="flex justify-between items-center print:hidden">
              <h2 className="text-xl font-bold text-amber-900">{t.nav_stages}</h2>
              <Dialog open={addStageOpen} onOpenChange={setAddStageOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t.btn_add_stage}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t.nav_items}</Label>
                      <Select
                        value={selectedItemId}
                        onValueChange={setSelectedItemId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t.stage_select_item} />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.stage_department}</Label>
                      <Select
                        value={newStage.departmentId}
                        onValueChange={(val) => setNewStage(prev => ({ ...prev, departmentId: val }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t.stage_select_department} />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map(dept => (
                            <SelectItem key={dept.id} value={dept.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: dept.color }}
                                />
                                {getDepartmentName(dept)}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>{t.stage_time_per_unit}</Label>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          value={newStage.timePerUnit}
                          onChange={(e) => setNewStage(prev => ({ ...prev, timePerUnit: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.stage_quantity}</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newStage.quantity}
                          onChange={(e) => setNewStage(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.stage_shifts}</Label>
                        <Select
                          value={newStage.shifts?.toString() || '1'}
                          onValueChange={(val) => setNewStage(prev => ({ ...prev, shifts: parseInt(val) }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">{t.stage_single_shift}</SelectItem>
                            <SelectItem value="2">{t.stage_double_shift}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {/* عرض الوقت الإجمالي المحسوب */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-amber-800 font-medium">{t.stage_total_time}:</span>
                        <span className="text-lg font-bold text-amber-900">
                          {(newStage.timePerUnit * newStage.quantity).toFixed(1)} {t.stage_time_hours}
                        </span>
                      </div>
                      <div className="text-sm text-amber-600 mt-1">
                        {newStage.timePerUnit} {t.stage_time_hours} × {newStage.quantity} = {(newStage.timePerUnit * newStage.quantity).toFixed(1)} {t.stage_time_hours}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.stage_notes}</Label>
                      <Textarea
                        value={newStage.notes}
                        onChange={(e) => setNewStage(prev => ({ ...prev, notes: e.target.value }))}
                        rows={2}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddStageOpen(false)}>
                      {t.btn_cancel}
                    </Button>
                    <Button onClick={handleAddStage}>{t.btn_save}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* جدول المراحل */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.nav_items}</TableHead>
                      <TableHead>{t.stage_number}</TableHead>
                      <TableHead>{t.stage_department}</TableHead>
                      <TableHead>{t.stage_time_per_unit}</TableHead>
                      <TableHead>{t.stage_quantity}</TableHead>
                      <TableHead>{t.stage_total_time}</TableHead>
                      <TableHead>{t.stage_shifts}</TableHead>
                      <TableHead>{t.item_status}</TableHead>
                      <TableHead>{t.attachments}</TableHead>
                      <TableHead className="print:hidden">{t.btn_edit}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(item => 
                      item.stages.map((stage, index) => (
                        <TableRow key={stage.id}>
                          <TableCell className="font-medium">
                            {index === 0 ? item.name : ''}
                          </TableCell>
                          <TableCell>{stage.stageNumber}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: stage.department?.color }}
                              />
                              {stage.department ? getDepartmentName(stage.department) : ''}
                            </div>
                          </TableCell>
                          <TableCell>{stage.timePerUnit} {t.stage_time_hours}</TableCell>
                          <TableCell>{stage.quantity}</TableCell>
                          <TableCell className="font-semibold text-amber-700">{stage.estimatedTime} {t.stage_time_hours}</TableCell>
                          <TableCell>
                            <Badge variant={stage.shifts === 1 ? 'default' : 'secondary'}>
                              {stage.shifts === 1 ? t.stage_single_shift : t.stage_double_shift}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={stage.status}
                              onValueChange={(val) => handleUpdateStageStatus(stage.id, val)}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">{t.status_pending}</SelectItem>
                                <SelectItem value="in_progress">{t.status_in_progress}</SelectItem>
                                <SelectItem value="completed">{t.status_completed}</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="gap-1">
                                <Paperclip className="w-3 h-3" />
                                {stage.attachments?.length || 0}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedStageId(stage.id)
                                  setSelectedStageItem(item.name)
                                  setAttachmentDialogOpen(true)
                                }}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setViewingStage(stage)
                                  setViewAttachmentsOpen(true)
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="print:hidden">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteStage(stage.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب الجدول الزمني */}
          <TabsContent value="schedule" className="space-y-4">
            <div className="flex justify-between items-center print:hidden">
              <h2 className="text-xl font-bold text-amber-900">{t.schedule_title}</h2>
              <Button onClick={handlePrint} variant="outline" className="gap-2">
                <Printer className="w-4 h-4" />
                {t.btn_print}
              </Button>
            </div>

            {/* جدول زمني للطباعة A3 */}
            <Card className="print:shadow-none print:border-0" id="printable-schedule">
              <CardHeader>
                <CardTitle className="text-center text-2xl">{t.print_schedule}</CardTitle>
                <CardDescription className="text-center">
                  {t.schedule_issue_date}: {formatDate(new Date())}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="border">
                    <TableHeader>
                      <TableRow className="bg-amber-100">
                        <TableHead className="border font-bold">#</TableHead>
                        <TableHead className="border font-bold">{t.nav_items}</TableHead>
                        <TableHead className="border font-bold">{t.item_priority}</TableHead>
                        <TableHead className="border font-bold">{t.stages}</TableHead>
                        <TableHead className="border font-bold">{t.schedule_total_time}</TableHead>
                        <TableHead className="border font-bold">{t.item_status}</TableHead>
                        <TableHead className="border font-bold">{t.item_deadline}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => {
                        const totalTime = item.stages.reduce((sum, s) => sum + s.estimatedTime, 0)
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="border">{index + 1}</TableCell>
                            <TableCell className="border font-medium">{item.name}</TableCell>
                            <TableCell className="border text-center">{item.priority}</TableCell>
                            <TableCell className="border">
                              <div className="flex flex-wrap gap-1">
                                {item.stages.map(stage => (
                                  <Badge
                                    key={stage.id}
                                    variant="outline"
                                    style={{ 
                                      borderColor: stage.department?.color,
                                      backgroundColor: stage.status === 'completed' ? '#dcfce7' : 
                                        stage.status === 'in_progress' ? '#dbeafe' : 'transparent'
                                    }}
                                  >
                                    {stage.stageNumber}. {stage.department ? getDepartmentName(stage.department) : ''}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="border text-center">{totalTime} {t.stage_time_hours}</TableCell>
                            <TableCell className="border">
                              <Badge className={getStatusColor(item.status)}>
                                {getStatusLabel(item.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="border">
                              {item.deadline ? formatDate(item.deadline) : '-'}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* ملخص الأقسام */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {departments.map(dept => {
                    const stagesCount = items.reduce((count, item) => 
                      count + item.stages.filter(s => s.departmentId === dept.id).length, 0
                    )
                    return (
                      <Card key={dept.id} className="text-center">
                        <CardContent className="pt-4">
                          <div
                            className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
                            style={{ backgroundColor: dept.color + '20' }}
                          >
                            {(() => {
                              const Icon = departmentIcons[dept.id] || Settings2
                              return <Icon className="w-5 h-5" style={{ color: dept.color }} />
                            })()}
                          </div>
                          <p className="font-medium text-sm">{getDepartmentName(dept)}</p>
                          <p className="text-2xl font-bold" style={{ color: dept.color }}>
                            {stagesCount}
                          </p>
                          <p className="text-xs text-gray-500">{t.departments_stage}</p>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب الأقسام */}
          <TabsContent value="departments" className="space-y-4">
            <h2 className="text-xl font-bold text-amber-900">{t.departments_title}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {departments.map(dept => {
                // حساب عدد المرفقات لكل قسم
                const deptAttachments = items.reduce((count, item) => {
                  return count + item.stages
                    .filter(s => s.departmentId === dept.id)
                    .reduce((c, s) => c + (s.attachments?.length || 0), 0)
                }, 0)
                
                return (
                  <Card key={dept.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: dept.color + '20' }}
                        >
                          {(() => {
                            const Icon = departmentIcons[dept.id] || Settings2
                            return <Icon className="w-7 h-7" style={{ color: dept.color }} />
                          })()}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{getDepartmentName(dept)}</h3>
                          <p className="text-sm text-gray-500">{language === 'ar' ? dept.name : dept.nameAr}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="gap-1">
                              <Paperclip className="w-3 h-3" />
                              {deptAttachments} {t.attachments}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* نافذة إضافة مرفق */}
      <Dialog open={attachmentDialogOpen} onOpenChange={setAttachmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.attachment_title}</DialogTitle>
            <DialogDescription>
              {selectedStageItem} - {t.stage_attachments}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.attachment_file}</Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
              />
              <p className="text-xs text-gray-500">
                {language === 'ar' ? 'الأنواع المدعومة: صور (JPG, PNG, GIF) و PDF - الحد الأقصى 10 ميجابايت' : 'Supported: Images (JPG, PNG, GIF) and PDF - Max 10MB'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t.attachment_description}</Label>
              <Textarea
                value={newAttachment.description}
                onChange={(e) => setNewAttachment(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t.attachment_description_placeholder}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.attachment_type}</Label>
              <Select
                value={newAttachment.uploadType}
                onValueChange={(val) => setNewAttachment(prev => ({ ...prev, uploadType: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work">{t.attachment_work}</SelectItem>
                  <SelectItem value="completion">{t.attachment_completion}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachmentDialogOpen(false)}>
              {t.btn_cancel}
            </Button>
            <Button onClick={handleAddAttachment} className="gap-2">
              <Paperclip className="w-4 h-4" />
              {t.btn_upload}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة عرض المرفقات */}
      <Dialog open={viewAttachmentsOpen} onOpenChange={setViewAttachmentsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t.stage_details}</DialogTitle>
            <DialogDescription>
              {viewingStage?.department ? getDepartmentName(viewingStage.department) : ''} - {t.stage_attachments}
            </DialogDescription>
          </DialogHeader>
          
          {viewingStage && (
            <div className="space-y-4">
              {/* معلومات المرحلة */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">{t.item_status}</p>
                  <Badge className={getStatusColor(viewingStage.status)}>
                    {getStatusLabel(viewingStage.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t.stage_time}</p>
                  <p className="font-medium">{viewingStage.estimatedTime} {t.stage_time_hours}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t.stage_quantity}</p>
                  <p className="font-medium">{viewingStage.quantity}</p>
                </div>
              </div>

              {/* قائمة المرفقات */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>{t.attachments} ({viewingStage.attachments?.length || 0})</Label>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedStageId(viewingStage.id)
                      setAttachmentDialogOpen(true)
                    }}
                  >
                    <Plus className="w-4 h-4 ml-1" />
                    {t.btn_add_attachment}
                  </Button>
                </div>

                {viewingStage.attachments && viewingStage.attachments.length > 0 ? (
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {viewingStage.attachments.map(att => (
                        <Card key={att.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {att.fileType === 'image' ? (
                                <ImageIcon className="w-8 h-8 text-blue-500" />
                              ) : (
                                <FileText className="w-8 h-8 text-red-500" />
                              )}
                              <div>
                                <p className="font-medium text-sm">{att.fileName}</p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(att.fileSize, t)} • 
                                  {att.uploadType === 'work' ? ` ${t.attachment_work}` : ` ${t.attachment_completion}`}
                                </p>
                                {att.description && (
                                  <p className="text-xs text-gray-600 mt-1">{att.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // عرض الملف
                                  const win = window.open()
                                  if (win) {
                                    win.document.write(`
                                      <html>
                                        <head><title>${att.fileName}</title></head>
                                        <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;">
                                          ${att.fileType === 'image' 
                                            ? `<img src="${att.fileData}" style="max-width:100%;max-height:100vh;" />`
                                            : `<embed src="${att.fileData}" style="width:100%;height:100vh;" />`
                                          }
                                        </body>
                                      </html>
                                    `)
                                  }
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement('a')
                                  link.href = att.fileData
                                  link.download = att.fileName
                                  link.click()
                                }}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAttachment(att.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Paperclip className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{t.attachment_no_files}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setViewAttachmentsOpen(false)}>
              {t.btn_close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نمط الطباعة A3 */}
      <style jsx global>{`
        @media print {
          @page {
            size: A3 landscape;
            margin: 1cm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:border-0 {
            border: none !important;
          }
        }
      `}</style>
    </div>
  )
}
