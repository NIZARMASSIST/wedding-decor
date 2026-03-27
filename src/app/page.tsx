'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  Plus, Trash2, Calendar, Clock, Package, Users, 
  Settings, Printer, ChevronUp, ChevronDown, Edit,
  Globe, Paperclip, Download, Eye, Play, CheckCircle2,
  FolderOpen, BarChart3, PieChart
} from 'lucide-react'
import { toast } from 'sonner'
import { translations, Language } from '@/lib/i18n'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts'

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
  shift1Start?: string
  shift1End?: string
  shift2Start?: string
  shift2End?: string
  status: string
  startDate?: string
  endDate?: string
  notes?: string
  attachments?: Attachment[]
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

// حالات العنصر
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-500'
    case 'in_progress': return 'bg-blue-500'
    case 'completed': return 'bg-green-500'
    default: return 'bg-gray-500'
  }
}

const getStatusBgColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-50 border-yellow-200'
    case 'in_progress': return 'bg-blue-50 border-blue-200'
    case 'completed': return 'bg-green-50 border-green-200'
    default: return 'bg-gray-50'
  }
}

// تنسيق حجم الملف
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// حساب ساعات العمل الفعلية
const calculateWorkingHours = (shift1Start: string | undefined, shift1End: string | undefined, shift2Start: string | undefined, shift2End: string | undefined) => {
  const calcShiftHours = (start: string | undefined, end: string | undefined) => {
    if (!start || !end) return 0
    const [sh1, sm1] = start.split(':').map(Number)
    const [sh2, sm2] = end.split(':').map(Number)
    let hours = sh2 - sh1 + (sm2 - sm1) / 60
    if (hours < 0) hours += 24 // للشفتات الليلية
    return hours
  }
  return calcShiftHours(shift1Start, shift1End) + calcShiftHours(shift2Start, shift2End)
}

export default function Home() {
  const [language, setLanguage] = useState<Language>('ar')
  const t = translations[language]
  const isRTL = language === 'ar'
  
  const [projects, setProjects] = useState<Project[]>([])
  const [items, setItems] = useState<ProductionItem[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('projects')
  
  // حالات النوافذ
  const [addProjectOpen, setAddProjectOpen] = useState(false)
  const [editProjectOpen, setEditProjectOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [editItemOpen, setEditItemOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ProductionItem | null>(null)
  const [addStageOpen, setAddStageOpen] = useState(false)
  const [editStageOpen, setEditStageOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<Stage | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [addDeptOpen, setAddDeptOpen] = useState(false)
  const [editDeptOpen, setEditDeptOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false)
  const [selectedStageId, setSelectedStageId] = useState<string>('')
  const [viewAttachmentsOpen, setViewAttachmentsOpen] = useState(false)
  const [viewingStage, setViewingStage] = useState<Stage | null>(null)
  
  // نافذة Checklist
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false)
  const [viewingStageChecklist, setViewingStageChecklist] = useState<Stage | null>(null)

  // حالات العناصر الجديدة
  const [newProject, setNewProject] = useState({
    name: '', nameAr: '', clientName: '', description: '', notes: '',
    startDate: '', deadline: ''
  })
  
  const [newItem, setNewItem] = useState({
    name: '', image: '', priority: 1, notes: '', totalQuantity: 1, deadline: ''
  })
  const [newStages, setNewStages] = useState<any[]>([])
  
  const [newStage, setNewStage] = useState({
    departmentId: '', timePerUnit: 0, quantity: 1, shifts: 1, notes: '',
    shift1Start: '08:00', shift1End: '16:00', shift2Start: '', shift2End: ''
  })
  
  const [newDept, setNewDept] = useState({ name: '', nameAr: '', color: '#6B7280', icon: 'settings' })
  
  // حالة رفع الملف
  const [uploadingFile, setUploadingFile] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileDescription, setFileDescription] = useState('')
  const [uploadType, setUploadType] = useState('work')

  // جلب البيانات
  const fetchData = useCallback(async () => {
    try {
      const [projectsRes, itemsRes, deptsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/items'),
        fetch('/api/departments')
      ])
      
      const projectsData = await projectsRes.json()
      const itemsData = await itemsRes.json()
      const deptsData = await deptsRes.json()
      
      // جلب المرفقات لكل مرحلة
      const attachmentsRes = await fetch('/api/attachments')
      const attachmentsData = await attachmentsRes.json()
      
      // جلب checklist لكل مرحلة
      const checklistRes = await fetch('/api/checklist')
      const checklistData = await checklistRes.json()
      
      const itemsWithAttachments = itemsData.map((item: ProductionItem) => ({
        ...item,
        stages: item.stages.map((stage: Stage) => ({
          ...stage,
          attachments: attachmentsData.filter((a: Attachment) => a.stageId === stage.id),
          checklist: checklistData.filter((c: ChecklistItem) => c.stageId === stage.id).sort((a: ChecklistItem, b: ChecklistItem) => a.order - b.order)
        }))
      }))
      
      setProjects(Array.isArray(projectsData) ? projectsData : [])
      setItems(itemsWithAttachments)
      setDepartments(deptsData)
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

  // رفع الصورة
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (isEdit && editingItem) {
          setEditingItem({ ...editingItem, image: reader.result as string })
        } else {
          setNewItem(prev => ({ ...prev, image: reader.result as string }))
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // اختيار ملف للمرفق
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t.msg_file_too_large)
      return
    }
    
    const isImage = file.type.startsWith('image/')
    const isPDF = file.type === 'application/pdf'
    
    if (!isImage && !isPDF) {
      toast.error(t.msg_invalid_file_type)
      return
    }
    
    setSelectedFile(file)
  }

  // رفع المرفق
  const handleUploadAttachment = async () => {
    if (!selectedFile || !selectedStageId) {
      toast.error(t.msg_select_file)
      return
    }

    setUploadingFile(true)
    
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const fileType = selectedFile.type.startsWith('image/') ? 'image' : 'pdf'
        
        const res = await fetch('/api/attachments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stageId: selectedStageId,
            fileName: selectedFile.name,
            fileType,
            fileData: reader.result as string,
            fileSize: selectedFile.size,
            description: fileDescription,
            uploadType: uploadType
          })
        })
        
        if (res.ok) {
          toast.success(t.msg_attachment_added)
          setAttachmentDialogOpen(false)
          setSelectedFile(null)
          setFileDescription('')
          setUploadType('work')
          setFileInputKey(prev => prev + 1)
          fetchData()
        } else {
          toast.error(t.msg_error)
        }
        setUploadingFile(false)
      }
      reader.readAsDataURL(selectedFile)
    } catch (error) {
      toast.error(t.msg_error)
      setUploadingFile(false)
    }
  }

  // حذف مرفق
  const handleDeleteAttachment = async (id: string) => {
    if (!confirm(t.msg_confirm_delete_attachment)) return
    
    try {
      const res = await fetch(`/api/attachments?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(t.msg_attachment_deleted)
        fetchData()
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

  // ===== إدارة المشاريع =====
  const handleAddProject = async () => {
    if (!newProject.name.trim()) {
      toast.error(language === 'ar' ? 'الرجاء إدخال اسم المشروع' : 'Please enter project name')
      return
    }

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      })
      
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم إضافة المشروع' : 'Project added')
        setAddProjectOpen(false)
        setNewProject({ name: '', nameAr: '', clientName: '', description: '', notes: '', startDate: '', deadline: '' })
        fetchData()
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  const handleEditProject = async () => {
    if (!editingProject) return
    
    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProject)
      })
      
      if (res.ok) {
        toast.success(t.msg_item_updated)
        setEditProjectOpen(false)
        setEditingProject(null)
        fetchData()
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  const handleDeleteProject = async (id: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا المشروع؟ سيتم حذف جميع العناصر المرتبطة به.' : 'Delete this project and all its items?')) return
    
    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم حذف المشروع' : 'Project deleted')
        fetchData()
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // إضافة عنصر
  const handleAddItem = async () => {
    if (!newItem.name.trim()) {
      toast.error(t.msg_enter_name)
      return
    }

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newItem, stages: newStages })
      })
      
      if (res.ok) {
        toast.success(t.msg_item_added)
        setAddItemOpen(false)
        setNewItem({ name: '', image: '', priority: 1, notes: '', totalQuantity: 1, deadline: '' })
        setNewStages([])
        fetchData()
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // تعديل عنصر
  const handleEditItem = async () => {
    if (!editingItem) return
    
    try {
      const res = await fetch('/api/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id, name: editingItem.name, image: editingItem.image,
          priority: editingItem.priority, notes: editingItem.notes,
          totalQuantity: editingItem.totalQuantity, deadline: editingItem.deadline
        })
      })
      
      if (res.ok) {
        toast.success(t.msg_item_updated)
        setEditItemOpen(false)
        setEditingItem(null)
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
      const res = await fetch(`/api/items?id=${id}`, { method: 'DELETE' })
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
    
    const newPriority = direction === 'up' ? Math.max(1, item.priority - 1) : item.priority + 1
    
    try {
      const res = await fetch('/api/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, priority: newPriority })
      })
      if (res.ok) fetchData()
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // إضافة مرحلة
  const handleAddStage = async () => {
    if (!selectedItemId || !newStage.departmentId) {
      toast.error(t.msg_select_department)
      return
    }

    try {
      const res = await fetch('/api/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: selectedItemId, ...newStage })
      })
      
      if (res.ok) {
        toast.success(t.msg_stage_added)
        setAddStageOpen(false)
        setNewStage({
          departmentId: '', timePerUnit: 0, quantity: 1, shifts: 1, notes: '',
          shift1Start: '08:00', shift1End: '16:00', shift2Start: '', shift2End: ''
        })
        fetchData()
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // تعديل مرحلة
  const handleEditStage = async () => {
    if (!editingStage) return
    
    try {
      const res = await fetch('/api/stages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingStage.id, departmentId: editingStage.departmentId,
          timePerUnit: editingStage.timePerUnit, quantity: editingStage.quantity,
          estimatedTime: editingStage.estimatedTime, shifts: editingStage.shifts,
          shift1Start: editingStage.shift1Start, shift1End: editingStage.shift1End,
          shift2Start: editingStage.shift2Start, shift2End: editingStage.shift2End,
          notes: editingStage.notes, startDate: editingStage.startDate, endDate: editingStage.endDate
        })
      })
      
      if (res.ok) {
        toast.success(t.msg_item_updated)
        setEditStageOpen(false)
        setEditingStage(null)
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
      const res = await fetch(`/api/stages?id=${id}`, { method: 'DELETE' })
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

  // إضافة قسم
  const handleAddDepartment = async () => {
    if (!newDept.name || !newDept.nameAr) {
      toast.error(language === 'ar' ? 'الرجاء إدخال اسم القسم' : 'Please enter department name')
      return
    }

    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDept)
      })
      
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم إضافة القسم' : 'Department added')
        setAddDeptOpen(false)
        setNewDept({ name: '', nameAr: '', color: '#6B7280', icon: 'settings' })
        fetchData()
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // تعديل قسم
  const handleEditDepartment = async () => {
    if (!editingDept) return
    
    try {
      const res = await fetch('/api/departments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingDept)
      })
      
      if (res.ok) {
        toast.success(t.msg_item_updated)
        setEditDeptOpen(false)
        setEditingDept(null)
        fetchData()
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // حذف قسم
  const handleDeleteDepartment = async (id: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا القسم؟' : 'Are you sure?')) return
    
    try {
      const res = await fetch(`/api/departments?id=${id}`, { method: 'DELETE' })
      
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم حذف القسم' : 'Department deleted')
        fetchData()
      } else {
        const data = await res.json()
        if (data.stagesCount) {
          toast.error(language === 'ar' 
            ? `لا يمكن حذف القسم - يوجد ${data.stagesCount} مرحلة مرتبطة` 
            : `Cannot delete - ${data.stagesCount} stages linked`)
        }
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // تصدير Excel أو PDF (عام أو حسب المشروع)
  const handleExport = async (projectId?: string, format: 'xlsx' | 'html' = 'xlsx') => {
    try {
      let url = '/api/export'
      const params = new URLSearchParams()
      if (projectId) params.append('projectId', projectId)
      if (format === 'html') params.append('format', 'pdf')
      if (params.toString()) url += `?${params.toString()}`
      
      const res = await fetch(url)
      if (res.ok) {
        const blob = await res.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        
        // استخراج اسم الملف من header
        const contentDisposition = res.headers.get('Content-Disposition')
        const defaultFilename = format === 'html' 
          ? `alwan-al-khaleej-report-${new Date().toISOString().split('T')[0]}.html`
          : `alwan-al-khaleej-report-${new Date().toISOString().split('T')[0]}.xlsx`
        let filename = defaultFilename
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;'"{}]+)/i)
          if (filenameMatch && filenameMatch[1]) {
            filename = decodeURIComponent(filenameMatch[1])
          }
        }
        
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(downloadUrl)
        const formatName = format === 'html' ? 'PDF (English)' : 'Excel'
        toast.success(language === 'ar' ? `تم تصدير البيانات كـ ${formatName}` : `Data exported as ${formatName}`)
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
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  // الحصول على اسم القسم
  const getDepartmentName = (dept: Department) => language === 'ar' ? dept.nameAr : dept.name

  // تسميات الحالة
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return t.status_pending
      case 'in_progress': return t.status_in_progress
      case 'completed': return t.status_completed
      default: return status
    }
  }

  // حساب الإحصائيات للجدول الزمني
  const calculateStats = () => {
    const allStages = items.flatMap(item => item.stages)
    const totalStages = allStages.length
    const completedStages = allStages.filter(s => s.status === 'completed').length
    const inProgressStages = allStages.filter(s => s.status === 'in_progress').length
    const pendingStages = allStages.filter(s => s.status === 'pending').length
    const totalEstimatedTime = allStages.reduce((sum, s) => sum + (s.estimatedTime || 0), 0)
    
    return { totalStages, completedStages, inProgressStages, pendingStages, totalEstimatedTime,
      progress: totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0 }
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

  const stats = calculateStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* الهيدر */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200 sticky top-0 z-50 print:hidden">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="الوان الخليج" className="w-12 h-12 rounded-xl object-contain" />
              <div>
                <h1 className="text-2xl font-bold text-amber-900">الوان الخليج</h1>
                <p className="text-sm text-amber-700">{language === 'ar' ? 'نظام إدارة تصنيع ديكور الأعراس' : 'Wedding Decor Management System'} <span className="text-xs bg-amber-200 px-2 py-0.5 rounded">v3.0</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-white rounded-lg border p-1">
                <Button variant={language === 'ar' ? 'default' : 'ghost'} size="sm"
                  onClick={() => setLanguage('ar')}
                  className={`gap-1 ${language === 'ar' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}>
                  <Globe className="w-4 h-4" /> عربي
                </Button>
                <Button variant={language === 'en' ? 'default' : 'ghost'} size="sm"
                  onClick={() => setLanguage('en')}
                  className={`gap-1 ${language === 'en' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}>
                  <Globe className="w-4 h-4" /> EN
                </Button>
              </div>
              <Button onClick={() => handleExport(undefined, 'xlsx')} variant="outline" className="gap-2 bg-green-50 hover:bg-green-100 border-green-300 text-green-700">
                <Download className="w-4 h-4" /> {language === 'ar' ? 'تصدير Excel' : 'Export Excel'}
              </Button>
              <Button onClick={() => handleExport(undefined, 'html')} variant="outline" className="gap-2 bg-red-50 hover:bg-red-100 border-red-300 text-red-700">
                <Download className="w-4 h-4" /> PDF
              </Button>
              <Button onClick={() => window.print()} variant="outline" className="gap-2">
                <Printer className="w-4 h-4" /> {t.btn_print}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm p-1 rounded-lg shadow-sm print:hidden flex flex-wrap">
            <TabsTrigger value="projects" className="gap-2"><FolderOpen className="w-4 h-4" /> {language === 'ar' ? 'المشاريع' : 'Projects'}</TabsTrigger>
            <TabsTrigger value="items" className="gap-2"><Package className="w-4 h-4" /> {t.nav_items}</TabsTrigger>
            <TabsTrigger value="stages" className="gap-2"><Settings className="w-4 h-4" /> {t.nav_stages}</TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2"><Calendar className="w-4 h-4" /> {t.nav_schedule}</TabsTrigger>
            <TabsTrigger value="charts" className="gap-2"><BarChart3 className="w-4 h-4" /> {language === 'ar' ? 'الرسوم البيانية' : 'Charts'}</TabsTrigger>
            <TabsTrigger value="departments" className="gap-2"><Users className="w-4 h-4" /> {t.nav_departments}</TabsTrigger>
          </TabsList>

          {/* تبويب المشاريع */}
          <TabsContent value="projects" className="space-y-4">
            <div className="flex justify-between items-center print:hidden">
              <h2 className="text-xl font-bold text-amber-900">{language === 'ar' ? 'المشاريع' : 'Projects'} ({projects.length})</h2>
              <Dialog open={addProjectOpen} onOpenChange={setAddProjectOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                    <Plus className="w-4 h-4" /> {language === 'ar' ? 'إضافة مشروع' : 'Add Project'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>{language === 'ar' ? 'إضافة مشروع جديد' : 'Add New Project'}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{language === 'ar' ? 'اسم المشروع (إنجليزي)' : 'Name (English)'}</Label>
                        <Input value={newProject.name} onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                        <Input value={newProject.nameAr} onChange={(e) => setNewProject(prev => ({ ...prev, nameAr: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'اسم العميل' : 'Client Name'}</Label>
                      <Input value={newProject.clientName} onChange={(e) => setNewProject(prev => ({ ...prev, clientName: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{language === 'ar' ? 'تاريخ البداية' : 'Start Date'}</Label>
                        <Input type="date" value={newProject.startDate} onChange={(e) => setNewProject(prev => ({ ...prev, startDate: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === 'ar' ? 'الموعد النهائي' : 'Deadline'}</Label>
                        <Input type="date" value={newProject.deadline} onChange={(e) => setNewProject(prev => ({ ...prev, deadline: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
                      <Textarea value={newProject.description} onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))} rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                      <Textarea value={newProject.notes} onChange={(e) => setNewProject(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddProjectOpen(false)}>{t.btn_cancel}</Button>
                    <Button onClick={handleAddProject}>{t.btn_save}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* قائمة المشاريع */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map(project => {
                const projectItems = items.filter(i => i.projectId === project.id)
                const projectProgress = projectItems.length > 0 
                  ? Math.round(projectItems.reduce((sum, item) => {
                      const completedStages = item.stages.filter(s => s.status === 'completed').length
                      return sum + (item.stages.length > 0 ? (completedStages / item.stages.length) * 100 : 0)
                    }, 0) / projectItems.length)
                  : 0
                
                return (
                  <Card key={project.id} className="overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500" />
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold">
                            {project.nameAr?.charAt(0) || project.name.charAt(0)}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{project.nameAr || project.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2 flex-wrap">
                              {project.clientName && <span>{project.clientName}</span>}
                              <span className="text-xs">• {projectItems.length} {language === 'ar' ? 'عنصر' : 'items'}</span>
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className={project.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                          {project.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'مكتمل' : 'Completed')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <Progress value={projectProgress} className="h-2" />
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{language === 'ar' ? 'نسبة الإنجاز' : 'Progress'}</span>
                        <span className="font-bold text-amber-600">{projectProgress}%</span>
                      </div>
                      {project.deadline && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          <span>{language === 'ar' ? 'الموعد النهائي' : 'Deadline'}: {formatDate(project.deadline)}</span>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2 border-t print:hidden">
                        <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={() => { setEditingProject(project); setEditProjectOpen(true) }}>
                          <Edit className="w-4 h-4" /> {t.btn_edit}
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1 text-red-600 hover:text-red-700" onClick={() => handleDeleteProject(project.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              {projects.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <FolderOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">{language === 'ar' ? 'لا توجد مشاريع' : 'No projects yet'}</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* تبويب العناصر */}
          <TabsContent value="items" className="space-y-4">
            <div className="flex justify-between items-center print:hidden">
              <h2 className="text-xl font-bold text-amber-900">{t.items_list} ({items.length})</h2>
              <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                    <Plus className="w-4 h-4" /> {t.btn_add_item}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{t.btn_add_item}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t.item_name} {t.required}</Label>
                        <Input value={newItem.name} onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))} placeholder={t.item_name_placeholder} />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.item_priority}</Label>
                        <Input type="number" min="1" value={newItem.priority} onChange={(e) => setNewItem(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t.item_quantity}</Label>
                        <Input type="number" min="1" value={newItem.totalQuantity} onChange={(e) => setNewItem(prev => ({ ...prev, totalQuantity: parseInt(e.target.value) || 1 }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.item_deadline}</Label>
                        <Input type="datetime-local" value={newItem.deadline} onChange={(e) => setNewItem(prev => ({ ...prev, deadline: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.item_image}</Label>
                      <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} />
                      {newItem.image && <img src={newItem.image} alt="preview" className="w-20 h-20 object-cover rounded-lg border mt-2" />}
                    </div>
                    <div className="space-y-2">
                      <Label>{t.item_notes}</Label>
                      <Textarea value={newItem.notes} onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))} placeholder={t.item_notes_placeholder} rows={2} />
                    </div>
                    
                    <Separator />
                    
                    {/* المراحل */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label>{t.stages} ({newStages.length})</Label>
                        <Button type="button" variant="outline" size="sm" onClick={() => setNewStages(prev => [...prev, {
                          departmentId: '', timePerUnit: 0, quantity: 1, shifts: 1, notes: '',
                          shift1Start: '08:00', shift1End: '16:00', shift2Start: '', shift2End: ''
                        }])}>
                          <Plus className="w-4 h-4 ml-1" /> {t.btn_add_stage}
                        </Button>
                      </div>
                      
                      {newStages.map((stage, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <Badge variant="outline">{t.stage_number} {index + 1}</Badge>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setNewStages(prev => prev.filter((_, i) => i !== index))}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">{t.stage_department}</Label>
                              <Select value={stage.departmentId} onValueChange={(val) => {
                                const updated = [...newStages]; updated[index].departmentId = val; setNewStages(updated)
                              }}>
                                <SelectTrigger><SelectValue placeholder={t.stage_select_department} /></SelectTrigger>
                                <SelectContent>
                                  {departments.map(dept => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
                                        {getDepartmentName(dept)}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{t.stage_time_per_unit}</Label>
                              <Input type="number" step="0.5" min="0" value={stage.timePerUnit}
                                onChange={(e) => { const updated = [...newStages]; updated[index].timePerUnit = parseFloat(e.target.value) || 0; setNewStages(updated) }} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{t.stage_quantity}</Label>
                              <Input type="number" min="1" value={stage.quantity}
                                onChange={(e) => { const updated = [...newStages]; updated[index].quantity = parseInt(e.target.value) || 1; setNewStages(updated) }} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{t.stage_shifts}</Label>
                              <Select value={stage.shifts?.toString() || '1'} onValueChange={(val) => {
                                const updated = [...newStages]; updated[index].shifts = parseInt(val); setNewStages(updated)
                              }}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">{t.stage_single_shift}</SelectItem>
                                  <SelectItem value="2">{t.stage_double_shift}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {stage.shifts === 2 && (
                            <div className="grid grid-cols-2 gap-3 mt-3">
                              <div className="space-y-1">
                                <Label className="text-xs">{language === 'ar' ? 'بداية الشفت 1' : 'Shift 1 Start'}</Label>
                                <Input type="time" value={stage.shift1Start || ''} onChange={(e) => {
                                  const updated = [...newStages]; updated[index].shift1Start = e.target.value; setNewStages(updated)
                                }} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{language === 'ar' ? 'نهاية الشفت 1' : 'Shift 1 End'}</Label>
                                <Input type="time" value={stage.shift1End || ''} onChange={(e) => {
                                  const updated = [...newStages]; updated[index].shift1End = e.target.value; setNewStages(updated)
                                }} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{language === 'ar' ? 'بداية الشفت 2' : 'Shift 2 Start'}</Label>
                                <Input type="time" value={stage.shift2Start || ''} onChange={(e) => {
                                  const updated = [...newStages]; updated[index].shift2Start = e.target.value; setNewStages(updated)
                                }} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{language === 'ar' ? 'نهاية الشفت 2' : 'Shift 2 End'}</Label>
                                <Input type="time" value={stage.shift2End || ''} onChange={(e) => {
                                  const updated = [...newStages]; updated[index].shift2End = e.target.value; setNewStages(updated)
                                }} />
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                  <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={() => setAddItemOpen(false)}>{t.btn_cancel}</Button>
                    <Button onClick={handleAddItem} className="gap-2"><Plus className="w-4 h-4" /> {t.btn_save}</Button>
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
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      <Badge className={`absolute top-2 left-2 ${getStatusColor(item.status)}`}>{getStatusLabel(item.status)}</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <CardDescription>{t.item_priority}: {item.priority} | {t.item_quantity}: {item.totalQuantity}</CardDescription>
                      </div>
                      <div className="flex gap-1 print:hidden">
                        <Button variant="ghost" size="icon" onClick={() => handleUpdatePriority(item.id, 'up')}><ChevronUp className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleUpdatePriority(item.id, 'down')}><ChevronDown className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* شريط التقدم */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{t.schedule_progress}</span>
                        <span>{item.stages.filter(s => s.status === 'completed').length}/{item.stages.length} {t.stages}</span>
                      </div>
                      <Progress value={item.stages.length > 0 ? (item.stages.filter(s => s.status === 'completed').length / item.stages.length) * 100 : 0} className="h-2" />
                    </div>

                    {/* المراحل */}
                    <div className="flex flex-wrap gap-1">
                      {item.stages.map(stage => (
                        <Badge key={stage.id} variant="outline" style={{ borderColor: stage.department?.color }}
                          className={`cursor-pointer ${stage.status === 'completed' ? 'bg-green-100' : stage.status === 'in_progress' ? 'bg-blue-100' : ''}`}
                          onClick={() => { setViewingStage(stage); setViewAttachmentsOpen(true) }}>
                          {stage.stageNumber}. {stage.department ? getDepartmentName(stage.department) : '-'}
                          {stage.attachments && stage.attachments.length > 0 && <Paperclip className="w-3 h-3 ml-1" />}
                        </Badge>
                      ))}
                    </div>

                    {item.deadline && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{t.item_deadline}: {formatDate(item.deadline)}</span>
                      </div>
                    )}

                    {/* أزرار الإجراءات */}
                    <div className="flex justify-between items-center pt-2 border-t print:hidden">
                      <Select value={item.status} onValueChange={(val) => handleUpdateItemStatus(item.id, val)}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{t.status_pending}</SelectItem>
                          <SelectItem value="in_progress">{t.status_in_progress}</SelectItem>
                          <SelectItem value="completed">{t.status_completed}</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setEditItemOpen(true) }}>
                          <Edit className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedItemId(item.id); setAddStageOpen(true) }}>
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
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
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>{t.btn_add_stage}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t.nav_items}</Label>
                      <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                        <SelectTrigger><SelectValue placeholder={t.stage_select_item} /></SelectTrigger>
                        <SelectContent>
                          {items.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.stage_department}</Label>
                      <Select value={newStage.departmentId} onValueChange={(val) => setNewStage(prev => ({ ...prev, departmentId: val }))}>
                        <SelectTrigger><SelectValue placeholder={t.stage_select_department} /></SelectTrigger>
                        <SelectContent>
                          {departments.map(dept => (
                            <SelectItem key={dept.id} value={dept.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
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
                        <Input type="number" step="0.5" min="0" value={newStage.timePerUnit}
                          onChange={(e) => setNewStage(prev => ({ ...prev, timePerUnit: parseFloat(e.target.value) || 0 }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.stage_quantity}</Label>
                        <Input type="number" min="1" value={newStage.quantity}
                          onChange={(e) => setNewStage(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.stage_shifts}</Label>
                        <Select value={newStage.shifts?.toString() || '1'} onValueChange={(val) => setNewStage(prev => ({ ...prev, shifts: parseInt(val) }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">{t.stage_single_shift}</SelectItem>
                            <SelectItem value="2">{t.stage_double_shift}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* أوقات الشفتات */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">{language === 'ar' ? 'بداية الشفت 1' : 'Shift 1 Start'}</Label>
                        <Input type="time" value={newStage.shift1Start} onChange={(e) => setNewStage(prev => ({ ...prev, shift1Start: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">{language === 'ar' ? 'نهاية الشفت 1' : 'Shift 1 End'}</Label>
                        <Input type="time" value={newStage.shift1End} onChange={(e) => setNewStage(prev => ({ ...prev, shift1End: e.target.value }))} />
                      </div>
                    </div>
                    {newStage.shifts === 2 && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">{language === 'ar' ? 'بداية الشفت 2' : 'Shift 2 Start'}</Label>
                          <Input type="time" value={newStage.shift2Start} onChange={(e) => setNewStage(prev => ({ ...prev, shift2Start: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">{language === 'ar' ? 'نهاية الشفت 2' : 'Shift 2 End'}</Label>
                          <Input type="time" value={newStage.shift2End} onChange={(e) => setNewStage(prev => ({ ...prev, shift2End: e.target.value }))} />
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label>{t.stage_notes}</Label>
                      <Textarea value={newStage.notes} onChange={(e) => setNewStage(prev => ({ ...prev, notes: e.target.value }))} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddStageOpen(false)}>{t.btn_cancel}</Button>
                    <Button onClick={handleAddStage}>{t.btn_save}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* جدول المراحل */}
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'العنصر' : 'Item'}</TableHead>
                      <TableHead>#</TableHead>
                      <TableHead>{language === 'ar' ? 'القسم' : 'Department'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الوقت/وحدة' : 'Time/Unit'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الوقت الإجمالي' : 'Total Time'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الشفتات' : 'Shifts'}</TableHead>
                      <TableHead>{language === 'ar' ? 'ساعات العمل' : 'Work Hours'}</TableHead>
                      <TableHead>{language === 'ar' ? 'تاريخ البداية' : 'Start Date'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead className="print:hidden">{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.flatMap(item => item.stages).map(stage => {
                      const workingHours = calculateWorkingHours(stage.shift1Start, stage.shift1End, stage.shift2Start, stage.shift2End)
                      return (
                        <TableRow key={stage.id}>
                          <TableCell>{items.find(i => i.id === stage.itemId)?.name}</TableCell>
                          <TableCell>{stage.stageNumber}</TableCell>
                          <TableCell>
                            <Badge style={{ backgroundColor: stage.department?.color, color: 'white' }}>
                              {stage.department ? getDepartmentName(stage.department) : '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>{stage.timePerUnit} {t.stage_time_hours}</TableCell>
                          <TableCell>{stage.quantity}</TableCell>
                          <TableCell>{stage.estimatedTime} {t.stage_time_hours}</TableCell>
                          <TableCell>{stage.shifts}</TableCell>
                          <TableCell className="text-sm">
                            {workingHours > 0 ? `${workingHours} ${language === 'ar' ? 'ساعة/يوم' : 'hrs/day'}` : '-'}
                            {stage.shift1Start && stage.shift1End && (
                              <div className="text-xs text-gray-500">{stage.shift1Start} - {stage.shift1End}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {stage.startDate ? formatDate(stage.startDate) : 
                              (stage.status === 'in_progress' ? <span className="text-blue-500 text-xs">{language === 'ar' ? 'تلقائي' : 'Auto'}</span> : '-')}
                          </TableCell>
                          <TableCell>
                            <Select value={stage.status} onValueChange={(val) => handleUpdateStageStatus(stage.id, val)}>
                              <SelectTrigger className="w-28">
                                <Badge className={getStatusColor(stage.status)}>{getStatusLabel(stage.status)}</Badge>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">{t.status_pending}</SelectItem>
                                <SelectItem value="in_progress">{t.status_in_progress}</SelectItem>
                                <SelectItem value="completed">{t.status_completed}</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="print:hidden">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingStage(stage); setEditStageOpen(true) }} title={language === 'ar' ? 'تعديل' : 'Edit'}>
                                <Edit className="w-4 h-4 text-blue-500" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => { setSelectedStageId(stage.id); setAttachmentDialogOpen(true) }} title={language === 'ar' ? 'إضافة مرفق' : 'Add Attachment'}>
                                <Paperclip className="w-4 h-4 text-green-500" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteStage(stage.id)} title={language === 'ar' ? 'حذف' : 'Delete'}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب الجدول الزمني */}
          <TabsContent value="schedule" className="space-y-4">
            <h2 className="text-xl font-bold text-amber-900">{t.nav_schedule}</h2>
            
            {/* إحصائيات عامة */}
            <div className="grid gap-4 md:grid-cols-5">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-amber-600">{stats.totalStages}</div>
                    <div className="text-sm text-gray-500">{language === 'ar' ? 'إجمالي المراحل' : 'Total Stages'}</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{stats.completedStages}</div>
                    <div className="text-sm text-gray-500">{language === 'ar' ? 'مكتملة' : 'Completed'}</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{stats.inProgressStages}</div>
                    <div className="text-sm text-gray-500">{language === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">{stats.pendingStages}</div>
                    <div className="text-sm text-gray-500">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{stats.totalEstimatedTime.toFixed(1)}</div>
                    <div className="text-sm text-gray-500">{language === 'ar' ? 'إجمالي الساعات' : 'Total Hours'}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* شريط التقدم العام */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{language === 'ar' ? 'نسبة الإنجاز الكلية' : 'Overall Progress'}</span>
                  <span className="text-4xl font-bold text-green-600">{stats.progress}%</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={stats.progress} className="h-6" />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{stats.completedStages} {language === 'ar' ? 'مكتمل' : 'completed'}</span>
                    <span>{stats.totalStages} {language === 'ar' ? 'إجمالي' : 'total'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* جدول زمني مفصل لكل عنصر */}
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'الجدول الزمني التفصيلي' : 'Detailed Schedule'}</CardTitle>
                <CardDescription>{language === 'ar' ? 'توزيع الوقت والنسب المئوية لكل عنصر مع ساعات العمل' : 'Time distribution and percentages for each item with work hours'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {items.map(item => {
                    const itemCompleted = item.stages.filter(s => s.status === 'completed').length
                    const itemTotal = item.stages.length
                    const itemProgress = itemTotal > 0 ? Math.round((itemCompleted / itemTotal) * 100) : 0
                    const totalEstTime = item.stages.reduce((sum, s) => sum + (s.estimatedTime || 0), 0)
                    
                    return (
                      <div key={item.id} className={`p-4 rounded-lg border-2 ${getStatusBgColor(item.status)}`}>
                        {/* رأس العنصر مع النسبة المئوية */}
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-3">
                            {item.image && <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />}
                            <div>
                              <h3 className="font-bold text-xl">{item.name}</h3>
                              <p className="text-sm text-gray-500">
                                {language === 'ar' ? 'الكمية' : 'Qty'}: {item.totalQuantity} | 
                                {language === 'ar' ? ' الوقت المقدر' : ' Est. Time'}: {totalEstTime.toFixed(1)} {language === 'ar' ? 'ساعة' : 'hrs'}
                              </p>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-4xl font-bold" style={{ color: itemProgress === 100 ? '#16a34a' : itemProgress > 0 ? '#2563eb' : '#ca8a04' }}>
                              {itemProgress}%
                            </div>
                            <div className="text-sm text-gray-500">{itemCompleted}/{itemTotal} {language === 'ar' ? 'مرحلة' : 'stages'}</div>
                          </div>
                        </div>
                        
                        {/* شريط التقدم الكبير */}
                        <div className="relative mb-4">
                          <Progress value={itemProgress} className="h-4" />
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
                            {itemProgress}%
                          </div>
                        </div>
                        
                        {/* شريط المراحل الزمني */}
                        <div className="h-8 rounded-lg overflow-hidden flex mb-4 bg-gray-200">
                          {item.stages.map((stage, idx) => {
                            const widthPercent = totalEstTime > 0 ? (stage.estimatedTime / totalEstTime) * 100 : 0
                            const bgColor = stage.status === 'completed' ? 'bg-green-500' : stage.status === 'in_progress' ? 'bg-blue-500' : ''
                            return (
                              <div 
                                key={stage.id}
                                className={`h-full flex items-center justify-center text-xs text-white font-medium ${bgColor}`}
                                style={{ width: `${widthPercent}%`, backgroundColor: bgColor ? undefined : stage.department?.color }}
                                title={`${stage.department?.nameAr || stage.department?.name}: ${widthPercent.toFixed(1)}%`}
                              >
                                {widthPercent >= 10 && `${widthPercent.toFixed(0)}%`}
                              </div>
                            )
                          })}
                        </div>
                        
                        {/* تفاصيل المراحل */}
                        <div className="grid gap-2">
                          {item.stages.map((stage, idx) => {
                            const stagePercent = totalEstTime > 0 ? ((stage.estimatedTime / totalEstTime) * 100).toFixed(1) : 0
                            const workingHours = calculateWorkingHours(stage.shift1Start, stage.shift1End, stage.shift2Start, stage.shift2End)
                            const daysNeeded = workingHours > 0 ? Math.ceil(stage.estimatedTime / workingHours) : null
                            
                            return (
                              <div key={stage.id} className={`flex items-center gap-3 p-3 rounded-lg border ${stage.status === 'completed' ? 'bg-green-50 border-green-300' : stage.status === 'in_progress' ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
                                {/* رقم المرحلة */}
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md"
                                  style={{ backgroundColor: stage.department?.color }}>
                                  {stage.stageNumber}
                                </div>
                                
                                {/* معلومات المرحلة */}
                                <div className="flex-1">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold">{stage.department ? getDepartmentName(stage.department) : '-'}</span>
                                    <Badge className={getStatusColor(stage.status)}>{getStatusLabel(stage.status)}</Badge>
                                  </div>
                                  
                                  {/* شريط النسبة المئوية للمرحلة */}
                                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                    <div 
                                      className="h-2 rounded-full transition-all" 
                                      style={{ 
                                        width: `${stagePercent}%`,
                                        backgroundColor: stage.department?.color 
                                      }}
                                    />
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-3 text-sm">
                                    <span className="font-medium text-gray-700">{stagePercent}%</span>
                                    <span className="text-gray-500">|</span>
                                    <span>{stage.estimatedTime} {language === 'ar' ? 'ساعة' : 'hrs'}</span>
                                    {workingHours > 0 && (
                                      <>
                                        <span className="text-gray-500">|</span>
                                        <span>{workingHours} {language === 'ar' ? 'ساعة/يوم' : 'hrs/day'}</span>
                                      </>
                                    )}
                                    {daysNeeded && (
                                      <>
                                        <span className="text-gray-500">|</span>
                                        <span className="font-medium text-blue-600">~{daysNeeded} {language === 'ar' ? 'يوم' : 'days'}</span>
                                      </>
                                    )}
                                  </div>
                                  
                                  {/* أوقات الشفتات */}
                                  {(stage.shift1Start || stage.shift2Start) && (
                                    <div className="flex gap-4 mt-2 text-xs text-gray-600">
                                      {stage.shift1Start && stage.shift1End && (
                                        <span className="bg-white px-2 py-1 rounded border">
                                          {language === 'ar' ? 'شفت 1' : 'Shift 1'}: {stage.shift1Start} - {stage.shift1End}
                                        </span>
                                      )}
                                      {stage.shift2Start && stage.shift2End && (
                                        <span className="bg-white px-2 py-1 rounded border">
                                          {language === 'ar' ? 'شفت 2' : 'Shift 2'}: {stage.shift2Start} - {stage.shift2End}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* تواريخ البداية والنهاية */}
                                  {stage.status === 'in_progress' && stage.startDate && (
                                    <div className="text-sm text-blue-600 mt-2">
                                      <Play className="w-4 h-4 inline mr-1" />
                                      {language === 'ar' ? 'بدأ في' : 'Started'}: {formatDate(stage.startDate)}
                                    </div>
                                  )}
                                  {stage.status === 'completed' && stage.endDate && (
                                    <div className="text-sm text-green-600 mt-2">
                                      <CheckCircle2 className="w-4 h-4 inline mr-1" />
                                      {language === 'ar' ? 'انتهى في' : 'Completed'}: {formatDate(stage.endDate)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                  
                  {items.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {language === 'ar' ? 'لا توجد عناصر لعرضها' : 'No items to display'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب الرسوم البيانية */}
          <TabsContent value="charts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-amber-900">{language === 'ar' ? 'الرسوم البيانية والتقارير' : 'Charts & Reports'}</h2>
              <div className="flex gap-2">
                <Button onClick={() => handleExport(undefined, 'xlsx')} variant="outline" className="gap-2 bg-green-50 hover:bg-green-100 border-green-300 text-green-700">
                  <Download className="w-4 h-4" /> Excel {language === 'ar' ? 'مع رسوم بيانية' : 'with Charts'}
                </Button>
                <Button onClick={() => handleExport(undefined, 'html')} variant="outline" className="gap-2 bg-red-50 hover:bg-red-100 border-red-300 text-red-700">
                  <Download className="w-4 h-4" /> PDF
                </Button>
              </div>
            </div>

            {/* إحصائيات سريعة */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-gradient-to-br from-amber-50 to-orange-100">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-amber-600">{projects.length}</div>
                    <div className="text-sm text-gray-600">{language === 'ar' ? 'المشاريع' : 'Projects'}</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-100">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600">{items.length}</div>
                    <div className="text-sm text-gray-600">{language === 'ar' ? 'العناصر' : 'Items'}</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-emerald-100">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600">{stats.completedStages}</div>
                    <div className="text-sm text-gray-600">{language === 'ar' ? 'مراحل مكتملة' : 'Completed Stages'}</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-violet-100">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-purple-600">{stats.progress}%</div>
                    <div className="text-sm text-gray-600">{language === 'ar' ? 'نسبة الإنجاز' : 'Progress'}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* رسم بياني - تقدم المشاريع */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-amber-600" />
                    {language === 'ar' ? 'تقدم المشاريع' : 'Projects Progress'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={projects.map(p => {
                        const projectItems = items.filter(i => i.projectId === p.id)
                        const totalStages = projectItems.reduce((sum, i) => sum + i.stages.length, 0)
                        const completedStages = projectItems.reduce((sum, i) => 
                          sum + i.stages.filter(s => s.status === 'completed').length, 0)
                        return {
                          name: (p.nameAr || p.name).substring(0, 10),
                          completed: completedStages,
                          total: totalStages,
                          progress: totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0
                        }
                      })}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="completed" name={language === 'ar' ? 'مكتمل' : 'Completed'} fill="#22c55e" />
                        <Bar dataKey="total" name={language === 'ar' ? 'الإجمالي' : 'Total'} fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* رسم بياني - توزيع المراحل حسب الأقسام */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-blue-600" />
                    {language === 'ar' ? 'توزيع المراحل حسب الأقسام' : 'Stages by Department'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={departments.map(d => {
                            const deptStages = items.flatMap(i => i.stages).filter(s => s.departmentId === d.id)
                            return { name: d.nameAr || d.name, value: deptStages.length, color: d.color }
                          }).filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {departments.map((d, index) => (
                            <Cell key={`cell-${index}`} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* رسم بياني - حالة العناصر */}
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'حالة العناصر' : 'Items Status'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: language === 'ar' ? 'مكتمل' : 'Completed', value: stats.completedStages, color: '#22c55e' },
                        { name: language === 'ar' ? 'قيد التنفيذ' : 'In Progress', value: stats.inProgressStages, color: '#3b82f6' },
                        { name: language === 'ar' ? 'قيد الانتظار' : 'Pending', value: stats.pendingStages, color: '#f59e0b' }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#f59e0b">
                          <Cell fill="#22c55e" />
                          <Cell fill="#3b82f6" />
                          <Cell fill="#f59e0b" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* رسم بياني - تقدم Checklist */}
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'تقدم الكميات (Checklist)' : 'Quantity Progress'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={items.slice(0, 10).map(item => {
                        const totalChecklist = item.stages.reduce((sum, s) => sum + (s.checklist?.length || 0), 0)
                        const completedChecklist = item.stages.reduce((sum, s) => 
                          sum + (s.checklist?.filter(c => c.completed).length || 0), 0)
                        return {
                          name: item.name.substring(0, 10),
                          total: totalChecklist,
                          completed: completedChecklist,
                          progress: totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0
                        }
                      })}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="completed" name={language === 'ar' ? 'مكتمل' : 'Completed'} stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                        <Area type="monotone" dataKey="total" name={language === 'ar' ? 'الإجمالي' : 'Total'} stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* قائمة المشاريع مع زر تصدير */}
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'تصدير حسب المشروع' : 'Export by Project'}</CardTitle>
                <CardDescription>{language === 'ar' ? 'اختر مشروعاً لتصدير تقريره مع الرسوم البيانية' : 'Select a project to export its report with charts'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {projects.map(project => {
                    const projectItems = items.filter(i => i.projectId === project.id)
                    const progress = projectItems.length > 0 
                      ? Math.round(projectItems.reduce((sum, item) => {
                          const completed = item.stages.filter(s => s.status === 'completed').length
                          return sum + (item.stages.length > 0 ? (completed / item.stages.length) * 100 : 0)
                        }, 0) / projectItems.length)
                      : 0
                    return (
                      <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div>
                          <p className="font-medium">{project.nameAr || project.name}</p>
                          <p className="text-sm text-gray-500">{projectItems.length} {language === 'ar' ? 'عنصر' : 'items'} • {progress}%</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleExport(project.id, 'xlsx')} className="gap-1 bg-green-50 hover:bg-green-100 border-green-300 text-green-700">
                            <Download className="w-3 h-3" /> Excel
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExport(project.id, 'html')} className="gap-1 bg-red-50 hover:bg-red-100 border-red-300 text-red-700">
                            <Download className="w-3 h-3" /> PDF
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  {projects.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      {language === 'ar' ? 'لا توجد مشاريع' : 'No projects'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب الأقسام */}
          <TabsContent value="departments" className="space-y-4">
            <div className="flex justify-between items-center print:hidden">
              <h2 className="text-xl font-bold text-amber-900">{t.departments_title}</h2>
              <Dialog open={addDeptOpen} onOpenChange={setAddDeptOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="w-4 h-4" /> {language === 'ar' ? 'إضافة قسم' : 'Add Department'}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{language === 'ar' ? 'إضافة قسم جديد' : 'Add New Department'}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                        <Input value={newDept.name} onChange={(e) => setNewDept(prev => ({ ...prev, name: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                        <Input value={newDept.nameAr} onChange={(e) => setNewDept(prev => ({ ...prev, nameAr: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{language === 'ar' ? 'اللون' : 'Color'}</Label>
                        <Input type="color" value={newDept.color} onChange={(e) => setNewDept(prev => ({ ...prev, color: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === 'ar' ? 'الأيقونة' : 'Icon'}</Label>
                        <Input value={newDept.icon} onChange={(e) => setNewDept(prev => ({ ...prev, icon: e.target.value }))} placeholder="hammer, scissors..." />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddDeptOpen(false)}>{t.btn_cancel}</Button>
                    <Button onClick={handleAddDepartment}>{t.btn_save}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {departments.map(dept => (
                <Card key={dept.id} className="overflow-hidden">
                  <div className="h-2" style={{ backgroundColor: dept.color }} />
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: dept.color }} />
                      {getDepartmentName(dept)}
                    </CardTitle>
                    <CardDescription>{dept.name} | {dept.nameAr}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 print:hidden">
                      <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={() => { setEditingDept(dept); setEditDeptOpen(true) }}>
                        <Edit className="w-4 h-4" /> {t.btn_edit}
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 text-red-600 hover:text-red-700" onClick={() => handleDeleteDepartment(dept.id)}>
                        <Trash2 className="w-4 h-4" /> {t.btn_delete}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* نافذة تعديل العنصر */}
      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{language === 'ar' ? 'تعديل العنصر' : 'Edit Item'}</DialogTitle></DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t.item_name}</Label>
                <Input value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.item_priority}</Label>
                  <Input type="number" min="1" value={editingItem.priority} onChange={(e) => setEditingItem({ ...editingItem, priority: parseInt(e.target.value) || 1 })} />
                </div>
                <div className="space-y-2">
                  <Label>{t.item_quantity}</Label>
                  <Input type="number" min="1" value={editingItem.totalQuantity} onChange={(e) => setEditingItem({ ...editingItem, totalQuantity: parseInt(e.target.value) || 1 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.item_deadline}</Label>
                <Input type="datetime-local" value={editingItem.deadline ? editingItem.deadline.slice(0, 16) : ''} onChange={(e) => setEditingItem({ ...editingItem, deadline: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t.item_notes}</Label>
                <Textarea value={editingItem.notes || ''} onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItemOpen(false)}>{t.btn_cancel}</Button>
            <Button onClick={handleEditItem}>{t.btn_save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تعديل المرحلة */}
      <Dialog open={editStageOpen} onOpenChange={setEditStageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{language === 'ar' ? 'تعديل المرحلة' : 'Edit Stage'}</DialogTitle></DialogHeader>
          {editingStage && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t.stage_department}</Label>
                <Select value={editingStage.departmentId} onValueChange={(val) => setEditingStage({ ...editingStage, departmentId: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
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
                  <Input type="number" step="0.5" value={editingStage.timePerUnit} onChange={(e) => setEditingStage({ ...editingStage, timePerUnit: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>{t.stage_quantity}</Label>
                  <Input type="number" min="1" value={editingStage.quantity} onChange={(e) => setEditingStage({ ...editingStage, quantity: parseInt(e.target.value) || 1 })} />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الوقت الإجمالي' : 'Est. Time'}</Label>
                  <Input type="number" step="0.5" value={editingStage.estimatedTime} onChange={(e) => setEditingStage({ ...editingStage, estimatedTime: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              
              {/* أوقات الشفتات */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">{language === 'ar' ? 'بداية الشفت 1' : 'Shift 1 Start'}</Label>
                  <Input type="time" value={editingStage.shift1Start || ''} onChange={(e) => setEditingStage({ ...editingStage, shift1Start: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{language === 'ar' ? 'نهاية الشفت 1' : 'Shift 1 End'}</Label>
                  <Input type="time" value={editingStage.shift1End || ''} onChange={(e) => setEditingStage({ ...editingStage, shift1End: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">{language === 'ar' ? 'بداية الشفت 2' : 'Shift 2 Start'}</Label>
                  <Input type="time" value={editingStage.shift2Start || ''} onChange={(e) => setEditingStage({ ...editingStage, shift2Start: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{language === 'ar' ? 'نهاية الشفت 2' : 'Shift 2 End'}</Label>
                  <Input type="time" value={editingStage.shift2End || ''} onChange={(e) => setEditingStage({ ...editingStage, shift2End: e.target.value })} />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>{t.stage_notes}</Label>
                <Textarea value={editingStage.notes || ''} onChange={(e) => setEditingStage({ ...editingStage, notes: e.target.value })} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStageOpen(false)}>{t.btn_cancel}</Button>
            <Button onClick={handleEditStage}>{t.btn_save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تعديل القسم */}
      <Dialog open={editDeptOpen} onOpenChange={setEditDeptOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{language === 'ar' ? 'تعديل القسم' : 'Edit Department'}</DialogTitle></DialogHeader>
          {editingDept && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                  <Input value={editingDept.name} onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                  <Input value={editingDept.nameAr} onChange={(e) => setEditingDept({ ...editingDept, nameAr: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'اللون' : 'Color'}</Label>
                  <Input type="color" value={editingDept.color} onChange={(e) => setEditingDept({ ...editingDept, color: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الأيقونة' : 'Icon'}</Label>
                  <Input value={editingDept.icon} onChange={(e) => setEditingDept({ ...editingDept, icon: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDeptOpen(false)}>{t.btn_cancel}</Button>
            <Button onClick={handleEditDepartment}>{t.btn_save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة عرض المرفقات */}
      <Dialog open={viewAttachmentsOpen} onOpenChange={setViewAttachmentsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{t.stage_details}</DialogTitle></DialogHeader>
          {viewingStage && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge style={{ backgroundColor: viewingStage.department?.color, color: 'white' }}>
                  {viewingStage.department ? getDepartmentName(viewingStage.department) : '-'}
                </Badge>
                <Badge className={getStatusColor(viewingStage.status)}>{getStatusLabel(viewingStage.status)}</Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>{t.stage_time_per_unit}: {viewingStage.timePerUnit} {t.stage_time_hours}</div>
                <div>{t.stage_quantity}: {viewingStage.quantity}</div>
                <div>{language === 'ar' ? 'الوقت الإجمالي' : 'Total'}: {viewingStage.estimatedTime} {t.stage_time_hours}</div>
              </div>
              
              {viewingStage.startDate && (
                <div className="text-sm text-gray-600"><Clock className="w-4 h-4 inline mr-1" />{language === 'ar' ? 'بدأ في' : 'Started'}: {formatDate(viewingStage.startDate)}</div>
              )}
              
              {viewingStage.notes && <div className="text-sm bg-gray-50 p-2 rounded">{viewingStage.notes}</div>}
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>{t.attachments}</Label>
                  <Button size="sm" variant="outline" onClick={() => {
                    setSelectedStageId(viewingStage.id)
                    setViewAttachmentsOpen(false)
                    setTimeout(() => setAttachmentDialogOpen(true), 100)
                  }}>
                    <Plus className="w-4 h-4 mr-1" /> {t.btn_add_attachment}
                  </Button>
                </div>
                
                {viewingStage.attachments && viewingStage.attachments.length > 0 ? (
                  <div className="grid gap-2">
                    {viewingStage.attachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{att.fileName}</span>
                          <span className="text-xs text-gray-400">{formatFileSize(att.fileSize)}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => window.open(att.fileData, '_blank')}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteAttachment(att.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">{t.attachment_no_files}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* نافذة إضافة مرفق */}
      <Dialog open={attachmentDialogOpen} onOpenChange={setAttachmentDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.attachment_title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.attachment_file}</Label>
              <Input key={fileInputKey} type="file" accept="image/*,.pdf" onChange={handleFileSelect} />
              {selectedFile && (
                <div className="text-sm text-gray-600 mt-1">
                  {language === 'ar' ? 'الملف المحدد' : 'Selected'}: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t.attachment_description}</Label>
              <Input value={fileDescription} onChange={(e) => setFileDescription(e.target.value)} placeholder={t.attachment_description_placeholder} />
            </div>
            <div className="space-y-2">
              <Label>{t.attachment_type}</Label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="work">{t.attachment_work}</SelectItem>
                  <SelectItem value="completion">{t.attachment_completion}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAttachmentDialogOpen(false); setSelectedFile(null) }}>{t.btn_cancel}</Button>
            <Button onClick={handleUploadAttachment} disabled={!selectedFile || uploadingFile}>
              {uploadingFile ? (language === 'ar' ? 'جاري الرفع...' : 'Uploading...') : t.btn_upload}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
