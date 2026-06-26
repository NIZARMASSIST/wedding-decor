'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import dynamic from 'next/dynamic'
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
  FolderOpen, BarChart3, PieChart, LogOut, User, Upload,
  Search, Filter, Box, X, LayoutGrid, List, ImageIcon,
  MapPin, UserCheck, ClipboardList, MessageCircle, HelpCircle, Calculator

} from 'lucide-react'
import MaterialsTab from '@/components/MaterialsTab'
import ChatSidebar from '@/components/ChatSidebar'
import HelpCenter from '@/components/HelpCenter'
import DesignCostCalculator from '@/components/DesignCostCalculator'
import { toast } from 'sonner'
import { translations, Language } from '@/lib/i18n'

// Dynamic import for recharts to avoid SSR issues
const RechartsComponents = dynamic(
  () => import('@/components/ChartsWrapper'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    )
  }
)

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
  projectId?: string
  project?: {
    id: string
    name: string
    nameAr?: string
  }
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

// واجهة المشروع
interface Project {
  id: string
  name: string
  nameAr?: string
  projectDate?: string
  location?: string
  recipient?: string
  executiveManager?: string
  clientName?: string
  description?: string
  image?: string
  status: string
  startDate?: string
  endDate?: string
  deadline?: string
  notes?: string
  notesAuthor?: string
  createdById?: string
  createdBy?: { id: string; name: string; role: string }
  usedMaterials?: any[]
  createdAt: string
  updatedAt: string
}

// واجهة المادة
interface Material {
  id: string
  name: string
  nameAr?: string
  unit: string
  unitAr?: string
  category: string
  categoryAr?: string
  unitPrice: number
  stockQuantity: number
  status: string
  description?: string
  type: string
  createdAt: string
  updatedAt: string
}

// واجهة ارتباط المادة بالمشروع
interface ProjectMaterial {
  id: string
  projectId: string
  materialId: string
  quantity: number
  notes?: string
  material?: Material
}

// واجهة عنصر Checklist
interface ChecklistItem {
  id: string
  stageId: string
  itemName: string
  quantity: number
  completed: boolean
  completedAt?: string
  completedBy?: string
  notes?: string
  order: number
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
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('projects')
  
  // حالة المستخدم الحالي
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; phone?: string; role: string } | null>(null)
  
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setCurrentUser(null)
      window.location.href = '/login'
    } catch {
      toast.error(t.msg_error)
    }
  }
  
  // جلب بيانات المستخدم الحالي
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  
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
    name: '', nameAr: '', projectDate: '', location: '', recipient: '', executiveManager: '',
    clientName: '', description: '', image: '', notes: '', notesAuthor: '',
    startDate: '', endDate: '', deadline: ''
  })
  
  const [newItem, setNewItem] = useState({
    name: '', image: '', priority: 1, notes: '', totalQuantity: 1, deadline: '', projectId: ''
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

  // حالات المواد للمشاريع
  const [materials, setMaterials] = useState<Material[]>([])
  const [projectMaterialsMap, setProjectMaterialsMap] = useState<Record<string, ProjectMaterial[]>>({})
  const [addMaterialToProjectOpen, setAddMaterialToProjectOpen] = useState(false)
  const [selectedProjectForMaterial, setSelectedProjectForMaterial] = useState<string>('')
  const [selectedMaterialForProject, setSelectedMaterialForProject] = useState<string>('')
  const [newMaterialQuantity, setNewMaterialQuantity] = useState(1)
  const [materialSearchQuery, setMaterialSearchQuery] = useState('')
  const [expandedProjectMaterials, setExpandedProjectMaterials] = useState<string>('')
  const [expandedUsedMaterials, setExpandedUsedMaterials] = useState<string>('')
  const [projectViewMode, setProjectViewMode] = useState<'grid' | 'list' | 'gallery'>('grid')
  const [itemViewMode, setItemViewMode] = useState<'grid' | 'list' | 'gallery'>('grid')
  const [itemProjectFilter, setItemProjectFilter] = useState<string>('all')
  const [itemDepartmentFilter, setItemDepartmentFilter] = useState<string>('all')

  // حالات الإشعارات والمواد المستعملة
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [usedMaterialsMap, setUsedMaterialsMap] = useState<Record<string, any[]>>({})
  const [addUsedMaterialOpen, setAddUsedMaterialOpen] = useState(false)
  const [selectedProjectForUsedMaterial, setSelectedProjectForUsedMaterial] = useState('')
  const [selectedMaterialForUsedMaterial, setSelectedMaterialForUsedMaterial] = useState('')
  const [newUsedMaterialQuantity, setNewUsedMaterialQuantity] = useState(1)
  const [usedMaterialNotes, setUsedMaterialNotes] = useState('')
  const [usedMaterialSearchQuery, setUsedMaterialSearchQuery] = useState('')
  const [editingUserField, setEditingUserField] = useState<{userId: string, field: 'name' | 'phone'} | null>(null)
  const [editUserValue, setEditUserValue] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  // جلب المواد
  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch('/api/materials')
      if (res.ok) {
        const data = await res.json()
        setMaterials(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching materials:', error)
    }
  }, [])

  // جلب مواد مشروع محدد
  const fetchProjectMaterials = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/materials?projectId=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setProjectMaterialsMap(prev => ({
          ...prev,
          [projectId]: data.projectMaterials || []
        }))
      }
    } catch (error) {
      console.error('Error fetching project materials:', error)
    }
  }, [])

  // جلب مواد جميع المشاريع
  const fetchAllProjectMaterials = useCallback(async (projectIds: string[]) => {
    const results = await Promise.allSettled(
      projectIds.map(async (pid) => {
        const res = await fetch(`/api/materials?projectId=${pid}`)
        if (res.ok) {
          const data = await res.json()
          return { pid, pms: data.projectMaterials || [] }
        }
        return { pid, pms: [] }
      })
    )
    const newMap: Record<string, ProjectMaterial[]> = {}
    results.forEach(r => {
      if (r.status === 'fulfilled') {
        newMap[r.value.pid] = r.value.pms
      }
    })
    setProjectMaterialsMap(newMap)
  }, [])

  // إضافة مادة لمشروع
  const handleAddMaterialToProject = async () => {
    if (!selectedProjectForMaterial || !selectedMaterialForProject) {
      toast.error(language === 'ar' ? 'اختر المشروع والمادة' : 'Select project and material')
      return
    }
    try {
      const res = await fetch('/api/materials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addToProject',
          projectId: selectedProjectForMaterial,
          materialId: selectedMaterialForProject,
          quantity: newMaterialQuantity
        })
      })
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم إضافة المادة للمشروع' : 'Material added to project')
        setAddMaterialToProjectOpen(false)
        setSelectedMaterialForProject('')
        setNewMaterialQuantity(1)
        fetchProjectMaterials(selectedProjectForMaterial)
        fetchMaterials()
      } else {
        const errData = await res.json().catch(() => ({}))
        toast.error(errData.error || t.msg_error)
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // حذف مادة من مشروع
  const handleRemoveMaterialFromProject = async (pmId: string, projectId: string) => {
    try {
      const res = await fetch('/api/materials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removeFromProject', id: pmId })
      })
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم إزالة المادة من المشروع' : 'Material removed from project')
        fetchProjectMaterials(projectId)
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // جلب الإشعارات
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadNotifications(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }, [])

  // جلب المواد المستعملة لمشروع
  const fetchUsedMaterials = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/materials?projectId=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setUsedMaterialsMap(prev => ({
          ...prev,
          [projectId]: data.usedMaterials || []
        }))
      }
    } catch (error) {
      console.error('Error fetching used materials:', error)
    }
  }, [])

  // إضافة مادة مستعملة
  const handleAddUsedMaterial = async () => {
    if (!selectedProjectForUsedMaterial || !selectedMaterialForUsedMaterial) {
      toast.error(language === 'ar' ? 'اختر المشروع والمادة' : 'Select project and material')
      return
    }
    try {
      const res = await fetch('/api/materials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addUsedMaterial',
          projectId: selectedProjectForUsedMaterial,
          materialId: selectedMaterialForUsedMaterial,
          quantity: newUsedMaterialQuantity,
          notes: usedMaterialNotes
        })
      })
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم إضافة المادة المستعملة' : 'Used material added')
        setAddUsedMaterialOpen(false)
        setSelectedMaterialForUsedMaterial('')
        setNewUsedMaterialQuantity(1)
        setUsedMaterialNotes('')
        setUsedMaterialSearchQuery('')
        fetchUsedMaterials(selectedProjectForUsedMaterial)
      } else {
        const errData = await res.json().catch(() => ({}))
        toast.error(errData.error || t.msg_error)
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // حذف مادة مستعملة
  const handleRemoveUsedMaterial = async (id: string, projectId: string) => {
    try {
      const res = await fetch('/api/materials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removeUsedMaterial', id })
      })
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم إزالة المادة المستعملة' : 'Used material removed')
        fetchUsedMaterials(projectId)
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // تنزيل المواد المستعملة لمشروع محدد إلى Excel
  const handleExportUsedMaterials = async (projectId: string) => {
    try {
      toast.loading(language === 'ar' ? 'جاري إنشاء الملف...' : 'Generating file...', { id: 'export-um' })
      const res = await fetch(`/api/materials/export-used?projectId=${projectId}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Export failed')
      }
      const blob = await res.blob()
      // استخراج اسم الملف من Content-Disposition
      const cd = res.headers.get('Content-Disposition') || ''
      const match = cd.match(/filename="?([^"]+)"?/)
      const filename = match ? decodeURIComponent(match[1]) : `used-materials-${projectId}.xlsx`

      // تنزيل
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(language === 'ar' ? 'تم تنزيل الملف' : 'File downloaded', { id: 'export-um' })
    } catch (error: any) {
      console.error('export error:', error)
      toast.error(
        error.message === 'No used materials found'
          ? (language === 'ar' ? 'لا توجد مواد مستعملة لهذا المشروع' : 'No used materials for this project')
          : (language === 'ar' ? 'فشل التصدير' : 'Export failed'),
        { id: 'export-um' }
      )
    }
  }

  // جلب البيانات
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      const [projectsRes, itemsRes, deptsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/items'),
        fetch('/api/departments')
      ])
      
      // التحقق من الاستجابات
      if (!projectsRes.ok || !itemsRes.ok || !deptsRes.ok) {
        console.error('API Error:', {
          projects: projectsRes.status,
          items: itemsRes.status,
          depts: deptsRes.status
        })
        throw new Error('Failed to fetch data')
      }
      
      const projectsData = await projectsRes.json()
      const itemsData = await itemsRes.json()
      const deptsData = await deptsRes.json()
      
      console.log('Fetched data:', {
        projects: projectsData?.length || 0,
        items: itemsData?.length || 0,
        departments: deptsData?.length || 0
      })
      
      // جلب المرفقات لكل مرحلة
      let attachmentsData: Attachment[] = []
      let checklistData: ChecklistItem[] = []
      
      try {
        const attachmentsRes = await fetch('/api/attachments')
        if (attachmentsRes.ok) {
          attachmentsData = await attachmentsRes.json()
        }
      } catch (e) {
        console.error('Error fetching attachments:', e)
      }
      
      try {
        const checklistRes = await fetch('/api/checklist')
        if (checklistRes.ok) {
          checklistData = await checklistRes.json()
        }
      } catch (e) {
        console.error('Error fetching checklist:', e)
      }
      
      const itemsWithAttachments = (Array.isArray(itemsData) ? itemsData : []).map((item: ProductionItem) => ({
        ...item,
        stages: item.stages?.map((stage: Stage) => ({
          ...stage,
          attachments: attachmentsData.filter((a: Attachment) => a.stageId === stage.id),
          checklist: checklistData.filter((c: ChecklistItem) => c.stageId === stage.id).sort((a: ChecklistItem, b: ChecklistItem) => a.order - b.order)
        })) || []
      }))
      
      setProjects(Array.isArray(projectsData) ? projectsData : [])
      setItems(itemsWithAttachments)
      setDepartments(Array.isArray(deptsData) ? deptsData : [])

      // جلب المواد
      fetchMaterials()
      const projectIds = (Array.isArray(projectsData) ? projectsData : []).map((p: Project) => p.id)
      if (projectIds.length > 0) {
        fetchAllProjectMaterials(projectIds)
      }

      // جلب الإشعارات
      fetchNotifications()

      // جلب المواد المستعملة لكل مشروع
      if (projectIds.length > 0) {
        const usedResults = await Promise.allSettled(
          projectIds.map(async (pid) => {
            const res = await fetch(`/api/materials?projectId=${pid}`)
            if (res.ok) {
              const data = await res.json()
              return { pid, ums: data.usedMaterials || [] }
            }
            return { pid, ums: [] }
          })
        )
        const newUsedMap: Record<string, any[]> = {}
        usedResults.forEach(r => {
          if (r.status === 'fulfilled') {
            newUsedMap[r.value.pid] = r.value.ums
          }
        })
        setUsedMaterialsMap(newUsedMap)
      }
      
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error(t.msg_error)
      // تعيين قيم فارغة في حالة الخطأ
      setProjects([])
      setItems([])
      setDepartments([])
    } finally {
      setLoading(false)
    }
  }, [t.msg_error])

  // Auth check - fetch current user and redirect if not authenticated
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setCurrentUser({ id: data.user.id, name: data.user.name, email: data.user.email, phone: data.user.phone, role: data.user.role })
          // Fetch users if admin (general_manager or maintenance)
          if (data.user?.role === 'general_manager' || data.user?.role === 'maintenance') {
            try {
              const usersRes = await fetch('/api/users')
              if (usersRes.ok) {
                const usersData = await usersRes.json()
                setUsers(usersData)
              }
            } catch {}
          }
          // Auth confirmed - now fetch app data
          fetchData()
        } else {
          // Not authenticated - redirect to login
          window.location.href = '/login'
          return
        }
      } catch {
        // Error fetching user - redirect to login
        window.location.href = '/login'
        return
      } finally {
        setIsAuthChecking(false)
      }
    }
    fetchUser()
  }, [])

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
    if (!newProject.projectDate && !newProject.name.trim()) {
      toast.error(language === 'ar' ? 'الرجاء إدخال تاريخ المشروع أو اسم المشروع' : 'Please enter project date or name')
      return
    }

    try {
      const projectData = {
        ...newProject,
        notesAuthor: currentUser?.name || ''
      }
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      })
      
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم إضافة المشروع' : 'Project added')
        setAddProjectOpen(false)
        setNewProject({ name: '', nameAr: '', projectDate: '', location: '', recipient: '', executiveManager: '', clientName: '', description: '', image: '', notes: '', notesAuthor: currentUser?.name || '', startDate: '', endDate: '', deadline: '' })
        fetchData()
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('Error response:', errorData)
        toast.error(errorData.error || (language === 'ar' ? 'فشل في إضافة المشروع' : 'Failed to add project'))
      }
    } catch (error) {
      console.error('Error adding project:', error)
      toast.error(t.msg_error)
    }
  }

  const handleEditProject = async () => {
    if (!editingProject) return
    
    try {
      const updateData = {
        ...editingProject,
        notesAuthor: editingProject.notesAuthor || currentUser?.name || ''
      }
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
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
        body: JSON.stringify({ ...newItem, stages: newStages, projectId: newItem.projectId || null })
      })
      
      if (res.ok) {
        toast.success(t.msg_item_added)
        setAddItemOpen(false)
        setNewItem({ name: '', image: '', priority: 1, notes: '', totalQuantity: 1, deadline: '', projectId: '' })
        setNewStages([])
        fetchData()
      } else {
        const errData = await res.json().catch(() => ({}))
        toast.error(errData.error || t.msg_error)
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
          totalQuantity: editingItem.totalQuantity, deadline: editingItem.deadline,
          projectId: editingItem.projectId
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

  // جلب المستخدمين
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleToggleUserRole = async (user: any) => {
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin'
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, role: newRole })
      })
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم تحديث الدور' : 'Role updated')
        fetchUsers()
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  const handleToggleUserStatus = async (user: any) => {
    try {
      const newStatus = user.status === 'suspended' ? 'active' : 'suspended'
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, status: newStatus })
      })
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم تحديث الحالة' : 'Status updated')
        fetchUsers()
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا المستخدم؟' : 'Are you sure you want to delete this user?')) return
    try {
      const res = await fetch(`/api/users?id=${userId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم حذف المستخدم' : 'User deleted')
        fetchUsers()
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
    return d.toLocaleDateString('en-US', {
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

  // اسم عرض المشروع (من التاريخ أو الاسم)
  const getProjectDisplayName = (project: Project) => {
    if (project.projectDate) {
      const d = new Date(project.projectDate)
      return d.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    }
    return project.nameAr || project.name
  }

  // الحرف الأول للمشروع
  const getProjectInitial = (project: Project) => {
    if (project.projectDate) {
      const d = new Date(project.projectDate)
      return String(d.getDate()).padStart(2, '0')
    }
    return project.nameAr?.charAt(0) || project.name.charAt(0)
  }

  // حساب الإحصائيات للجدول الزمني
  const calculateStats = () => {
    const safeItems = Array.isArray(items) ? items : []
    const allStages = safeItems.flatMap(item => Array.isArray(item.stages) ? item.stages : [])
    const totalStages = allStages.length
    const completedStages = allStages.filter(s => s?.status === 'completed').length
    const inProgressStages = allStages.filter(s => s?.status === 'in_progress').length
    const pendingStages = allStages.filter(s => s?.status === 'pending').length
    const totalEstimatedTime = allStages.reduce((sum, s) => sum + (s?.estimatedTime || 0), 0)
    
    return { totalStages, completedStages, inProgressStages, pendingStages, totalEstimatedTime,
      progress: totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0 }
  }

  // Auth check must come FIRST - before any data-dependent rendering
  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-700 font-medium">{language === 'ar' ? 'جاري التحقق...' : 'Authenticating...'}</p>
        </div>
      </div>
    )
  }

  // Data loading check comes after auth
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

  // Safely calculate stats with error handling
  let stats
  try {
    stats = calculateStats()
  } catch (error) {
    console.error('Error calculating stats:', error)
    stats = { totalStages: 0, completedStages: 0, inProgressStages: 0, pendingStages: 0, totalEstimatedTime: 0, progress: 0 }
  }

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
              {currentUser && (
                <div className="flex items-center gap-2">
                  {/* زر الدردشة */}
                  <Button
                    variant={chatOpen ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setChatOpen(!chatOpen)}
                    className={`gap-1 relative ${chatOpen ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'text-amber-700 border-amber-300 hover:bg-amber-50'}`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {language === 'ar' ? 'الدردشة' : 'Chat'}
                  </Button>
                  {/* إشعارات ومساعدة */}
                  <div className="flex items-center gap-2">
                    {/* زر المساعدة */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHelpOpen(true)}
                      className="gap-1 bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white border-blue-600 hover:border-blue-700 shadow-md hover:shadow-lg transition-all duration-200"
                      title={language === 'ar' ? 'مركز المساعدة - ابحث عن أي مشكلة وحلها' : 'Help Center - Search for any problem and solution'}
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span className="font-bold">?</span>
                    </Button>
                    {/* جرس الإشعارات */}
                    {(currentUser.role === 'general_manager' || currentUser.role === 'executive_manager') && (
                      <div className="relative">
                        <Button variant="outline" size="sm" onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) fetchNotifications() }} className="gap-1 relative">
                          🔔
                          {unreadNotifications > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">{unreadNotifications}</span>
                          )}
                        </Button>
                        {showNotifications && (
                          <div className="absolute top-full mt-2 w-80 bg-white border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto" style={{ left: 0 }}>
                            <div className="flex justify-between items-center p-3 border-b">
                              <h3 className="font-bold text-sm">{language === 'ar' ? 'الإشعارات' : 'Notifications'}</h3>
                              <Button variant="ghost" size="sm" onClick={async () => { await fetch('/api/notifications', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'markAllRead'}) }); fetchNotifications() }}>
                                {language === 'ar' ? 'قراءة الكل' : 'Mark all read'}
                              </Button>
                            </div>
                            {notifications.length === 0 ? (
                              <p className="p-4 text-center text-gray-400 text-sm">{language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}</p>
                            ) : notifications.map(n => (
                              <div key={n.id} className={`p-3 border-b hover:bg-gray-50 ${!n.isRead ? 'bg-blue-50' : ''}`}>
                                <p className="font-medium text-sm">{n.title}</p>
                                <p className="text-xs text-gray-500 mt-1">{n.message}</p>
                                <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('en-US')}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg text-sm">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{currentUser.name}</span>
                    <span className="text-xs opacity-70">({currentUser.role === 'general_manager' ? 'مدير عام' : currentUser.role === 'maintenance' ? 'صيانة' : currentUser.role === 'executive_manager' ? 'مسؤول تنفيذي' : currentUser.role === 'store_keeper' ? 'ستور كيبر' : 'مشرف'})</span>
                  </div>
                  <Button onClick={handleLogout} variant="outline" size="sm" className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                    <LogOut className="w-4 h-4" />
                    {language === 'ar' ? 'خروج' : 'Logout'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm p-1 rounded-lg shadow-sm print:hidden flex flex-wrap">
            <TabsTrigger value="projects" className="gap-2"><FolderOpen className="w-4 h-4" /> {language === 'ar' ? 'المشاريع' : 'Projects'}</TabsTrigger>
            <TabsTrigger value="materials" className="gap-2"><Box className="w-4 h-4" /> {t.nav_materials}</TabsTrigger>
            <TabsTrigger value="items" className="gap-2"><Package className="w-4 h-4" /> {t.nav_items}</TabsTrigger>
            <TabsTrigger value="stages" className="gap-2"><Settings className="w-4 h-4" /> {t.nav_stages}</TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2"><Calendar className="w-4 h-4" /> {t.nav_schedule}</TabsTrigger>
            <TabsTrigger value="charts" className="gap-2"><BarChart3 className="w-4 h-4" /> {language === 'ar' ? 'الرسوم البيانية' : 'Charts'}</TabsTrigger>
            <TabsTrigger value="calculator" className="gap-2"><Calculator className="w-4 h-4" /> {language === 'ar' ? 'حاسبة التكلفة' : 'Cost Calculator'}</TabsTrigger>
            <TabsTrigger value="departments" className="gap-2"><Users className="w-4 h-4" /> {t.nav_departments}</TabsTrigger>
            {(currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance') && (
              <TabsTrigger value="users" className="gap-2">
                <Users className="w-4 h-4" /> {language === 'ar' ? 'المستخدمين' : 'Users'}
              </TabsTrigger>
            )}
          </TabsList>

          {/* تبويب المشاريع */}
          <TabsContent value="projects" className="space-y-4">
            <div className="flex justify-between items-center print:hidden">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-amber-900">{language === 'ar' ? 'المشاريع' : 'Projects'} ({projects.length})</h2>
                {/* تبديل وضع العرض */}
                <div className="flex items-center bg-white rounded-lg border border-amber-200 p-0.5">
                  <Button variant={projectViewMode === 'grid' ? 'default' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setProjectViewMode('grid')} title={language === 'ar' ? 'شبكة' : 'Grid'}>
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button variant={projectViewMode === 'list' ? 'default' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setProjectViewMode('list')} title={language === 'ar' ? 'قائمة' : 'List'}>
                    <List className="w-4 h-4" />
                  </Button>
                  <Button variant={projectViewMode === 'gallery' ? 'default' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setProjectViewMode('gallery')} title={language === 'ar' ? 'معرض صور' : 'Gallery'}>
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Dialog open={addProjectOpen} onOpenChange={setAddProjectOpen}>
                {currentUser?.role !== 'store_keeper' && (
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                    <Plus className="w-4 h-4" /> {language === 'ar' ? 'إضافة مشروع' : 'Add Project'}
                  </Button>
                </DialogTrigger>
                )}
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{language === 'ar' ? 'إضافة مشروع جديد' : 'Add New Project'}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    {/* تاريخ المشروع */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-amber-800 font-semibold">{language === 'ar' ? 'تاريخ المشروع' : 'Project Date'} *</Label>
                        <Input type="date" value={newProject.projectDate} onChange={(e) => setNewProject(prev => ({ ...prev, projectDate: e.target.value }))} className="border-amber-300" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-amber-800 font-semibold">{language === 'ar' ? 'مكان المشروع' : 'Project Location'}</Label>
                        <Input value={newProject.location} onChange={(e) => setNewProject(prev => ({ ...prev, location: e.target.value }))} placeholder={language === 'ar' ? 'أدخل مكان المشروع' : 'Enter project location'} className="border-amber-300" />
                      </div>
                    </div>
                    {/* المستقبل والمسؤول التنفيذي */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-amber-800 font-semibold">{language === 'ar' ? 'شخص المستقبل المشروع' : 'Project Recipient'}</Label>
                        <Input value={newProject.recipient} onChange={(e) => setNewProject(prev => ({ ...prev, recipient: e.target.value }))} placeholder={language === 'ar' ? 'اسم مستقبل المشروع' : 'Recipient name'} className="border-amber-300" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-amber-800 font-semibold">{language === 'ar' ? 'المسؤول التنفيذي' : 'Executive Manager'}</Label>
                        <Input value={newProject.executiveManager} onChange={(e) => setNewProject(prev => ({ ...prev, executiveManager: e.target.value }))} placeholder={language === 'ar' ? 'اسم المسؤول التنفيذي' : 'Executive manager name'} className="border-amber-300" />
                      </div>
                    </div>
                    {/* اسم العميل */}
                    <div className="space-y-2">
                      <Label className="text-amber-800">{language === 'ar' ? 'اسم العميل' : 'Client Name'}</Label>
                      <Input value={newProject.clientName} onChange={(e) => setNewProject(prev => ({ ...prev, clientName: e.target.value }))} placeholder={language === 'ar' ? 'اسم العميل' : 'Client name'} />
                    </div>
                    {/* تاريخي التنفيذ */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-blue-800 font-semibold">{language === 'ar' ? 'تاريخ بداية التنفيذ' : 'Execution Start Date'}</Label>
                        <Input type="date" value={newProject.startDate} onChange={(e) => setNewProject(prev => ({ ...prev, startDate: e.target.value }))} className="border-blue-300" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-blue-800 font-semibold">{language === 'ar' ? 'تاريخ نهاية التنفيذ' : 'Execution End Date'}</Label>
                        <Input type="date" value={newProject.endDate} onChange={(e) => setNewProject(prev => ({ ...prev, endDate: e.target.value }))} className="border-blue-300" />
                      </div>
                    </div>
                    {/* الموعد النهائي */}
                    <div className="space-y-2">
                      <Label className="text-amber-800">{language === 'ar' ? 'الموعد النهائي' : 'Deadline'}</Label>
                      <Input type="date" value={newProject.deadline} onChange={(e) => setNewProject(prev => ({ ...prev, deadline: e.target.value }))} />
                    </div>
                    {/* ملاحظات مع كاتب الملاحظات */}
                    <div className="space-y-2">
                      <Label className="text-amber-800">{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                      <Textarea value={newProject.notes} onChange={(e) => setNewProject(prev => ({ ...prev, notes: e.target.value }))} rows={2} placeholder={language === 'ar' ? 'أدخل الملاحظات' : 'Enter notes'} />
                      {currentUser && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {language === 'ar' ? `كاتب الملاحظات: ${currentUser.name}` : `Notes by: ${currentUser.name}`}
                        </p>
                      )}
                    </div>
                    {/* صورة المشروع */}
                    <div className="space-y-2">
                      <Label className="text-amber-800">{language === 'ar' ? 'صورة المشروع' : 'Project Image'}</Label>
                      <Input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            setNewProject(prev => ({ ...prev, image: reader.result as string }))
                          }
                          reader.readAsDataURL(file)
                        }
                      }} />
                      {newProject.image && <img src={newProject.image} alt="preview" className="w-20 h-20 object-cover rounded-lg border mt-2" />}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddProjectOpen(false)}>{t.btn_cancel}</Button>
                    <Button onClick={handleAddProject} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">{t.btn_save}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* قائمة المشاريع */}
            {projectViewMode === 'gallery' ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map(project => {
                  const projectItems = items.filter(i => i.projectId === project.id)
                  const projectProgress = projectItems.length > 0 
                    ? Math.round(projectItems.reduce((sum, item) => {
                        const completedStages = item.stages.filter(s => s.status === 'completed').length
                        return sum + (item.stages.length > 0 ? (completedStages / item.stages.length) * 100 : 0)
                      }, 0) / projectItems.length)
                    : 0
                  const pms = projectMaterialsMap[project.id] || []
                  const totalCost = pms.reduce((sum, pm) => sum + (pm.material?.unitPrice || 0) * pm.quantity, 0)
                  
                  return (
                    <Card key={project.id} className="overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      {/* صورة المشروع الكبيرة */}
                      <div className="relative aspect-[4/3] bg-gradient-to-br from-amber-100 via-orange-50 to-amber-50 overflow-hidden">
                        {project.image ? (
                          <img src={project.image} alt={getProjectDisplayName(project)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                              {getProjectInitial(project)}
                            </div>
                          </div>
                        )}
                        {/* تراكب التدرج */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        {/* شارة الحالة */}
                        <Badge className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} ${project.status === 'active' ? 'bg-green-500' : 'bg-gray-500'} shadow-md`}>
                          {project.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'مكتمل' : 'Completed')}
                        </Badge>
                        {/* معلومات المشروع على الصورة */}
                        <div className="absolute bottom-3 inset-x-3">
                          <h3 className="text-white font-bold text-lg drop-shadow-md">{getProjectDisplayName(project)}</h3>
                          {project.location && <p className="text-white/80 text-sm flex items-center gap-1"><MapPin className="w-3 h-3" />{project.location}</p>}
                          {project.recipient && <p className="text-white/70 text-xs flex items-center gap-1"><UserCheck className="w-3 h-3" />{project.recipient}</p>}
                        </div>
                      </div>
                      <CardContent className="p-4 space-y-3">
                        {/* معلومات المشروع التفصيلية */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {project.executiveManager && (
                            <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 rounded-md px-2 py-1">
                              <User className="w-3 h-3" />
                              <span className="font-medium">{project.executiveManager}</span>
                            </div>
                          )}
                          {project.startDate && (
                            <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 rounded-md px-2 py-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          )}
                          {project.clientName && (
                            <div className="flex items-center gap-1.5 text-gray-600 bg-gray-50 rounded-md px-2 py-1">
                              <Users className="w-3 h-3" />
                              <span>{project.clientName}</span>
                            </div>
                          )}
                          {project.endDate && (
                            <div className="flex items-center gap-1.5 text-green-700 bg-green-50 rounded-md px-2 py-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          )}
                        </div>
                        {/* ملاحظات */}
                        {project.notes && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 text-xs">
                            <p className="text-yellow-800">{project.notes.length > 80 ? project.notes.slice(0, 80) + '...' : project.notes}</p>
                            {project.notesAuthor && <p className="text-yellow-600 mt-1 font-medium">— {project.notesAuthor}</p>}
                          </div>
                        )}
                        {/* شريط التقدم */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">{language === 'ar' ? 'الإنجاز' : 'Progress'}</span>
                            <span className="font-bold text-amber-600">{projectProgress}%</span>
                          </div>
                          <Progress value={projectProgress} className="h-2" />
                        </div>
                        {/* معلومات سريعة */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {projectItems.length} {language === 'ar' ? 'عنصر' : 'items'}</span>
                          <span className="flex items-center gap-1"><Box className="w-3.5 h-3.5" /> {pms.length} {language === 'ar' ? 'مواد' : 'materials'}</span>
                          {totalCost > 0 && <span className="flex items-center gap-1 text-green-600 font-medium">{totalCost.toFixed(0)} {language === 'ar' ? 'ر.ق' : 'QR'}</span>}
                        </div>
                        {/* المواد المستعملة */}
                        {(usedMaterialsMap[project.id] || []).length > 0 && (
                          <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-semibold text-purple-700">{language === 'ar' ? 'المواد المستعملة' : 'Used Materials'}:</p>
                              <button
                                onClick={() => handleExportUsedMaterials(project.id)}
                                className="inline-flex items-center gap-1 text-[10px] text-green-700 hover:text-green-900 hover:bg-green-100 px-1.5 py-0.5 rounded transition-colors"
                                title={language === 'ar' ? 'تنزيل Excel' : 'Export Excel'}
                              >
                                <Download className="w-3 h-3" />
                                Excel
                              </button>
                            </div>
                            <div className="space-y-1">
                              {(usedMaterialsMap[project.id] || []).map((um: any) => (
                                <div key={um.id} className="flex items-center justify-between text-xs">
                                  <span className="text-purple-800">{um.material?.nameAr || um.material?.name}</span>
                                  <span className="text-purple-600 font-medium">{um.quantity} {um.material?.unitAr || um.material?.unit}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* أزرار */}
                        <div className="flex gap-2 pt-2 border-t print:hidden">
                          {currentUser?.role !== 'store_keeper' && (
                            <Button variant="outline" size="sm" className="gap-1 flex-1 h-8 text-xs" onClick={() => { setEditingProject(project); setEditProjectOpen(true) }}
                              disabled={currentUser?.role === 'executive_manager' && project.createdById !== currentUser?.id}>
                              <Edit className="w-3.5 h-3.5" /> {t.btn_edit}
                            </Button>
                          )}
                          {(project.createdById === currentUser?.id || currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance') && currentUser?.role !== 'store_keeper' && (
                            <Button variant="outline" size="sm" className="gap-1 h-8 text-xs" onClick={() => {
                              setSelectedProjectForMaterial(project.id)
                              setSelectedMaterialForProject('')
                              setNewMaterialQuantity(1)
                              setAddMaterialToProjectOpen(true)
                            }}>
                              <Plus className="w-3.5 h-3.5" /> {language === 'ar' ? 'مواد مطلوبة' : 'Materials'}
                            </Button>
                          )}
                          {(currentUser?.role === 'store_keeper' || currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance') && (
                            <Button variant="outline" size="sm" className="gap-1 h-8 text-xs bg-purple-50 border-purple-300 text-purple-700" onClick={() => {
                              setSelectedProjectForUsedMaterial(project.id)
                              setSelectedMaterialForUsedMaterial('')
                              setNewUsedMaterialQuantity(1)
                              setUsedMaterialNotes('')
                              setUsedMaterialSearchQuery('')
                              setAddUsedMaterialOpen(true)
                            }}>
                              <Plus className="w-3.5 h-3.5" /> {language === 'ar' ? 'مواد مستعملة' : 'Used'}
                            </Button>
                          )}
                          {((currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance') || (currentUser?.role === 'executive_manager' && project.createdById === currentUser?.id)) && (
                            <Button variant="outline" size="sm" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteProject(project.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : projectViewMode === 'list' ? (
              <div className="space-y-2">
                {projects.map(project => {
                  const projectItems = items.filter(i => i.projectId === project.id)
                  const projectProgress = projectItems.length > 0 
                    ? Math.round(projectItems.reduce((sum, item) => {
                        const completedStages = item.stages.filter(s => s.status === 'completed').length
                        return sum + (item.stages.length > 0 ? (completedStages / item.stages.length) * 100 : 0)
                      }, 0) / projectItems.length)
                    : 0
                  const pms = projectMaterialsMap[project.id] || []
                  const totalCost = pms.reduce((sum, pm) => sum + (pm.material?.unitPrice || 0) * pm.quantity, 0)
                  
                  return (
                    <Card key={project.id} className="hover:shadow-md transition-shadow overflow-hidden">
                      <div className="flex items-center gap-4 p-4">
                        {/* صورة مصغرة */}
                        <div className="flex-shrink-0">
                          {project.image ? (
                            <img src={project.image} alt={getProjectDisplayName(project)} className="w-16 h-16 rounded-xl object-cover shadow-sm" />
                          ) : (
                            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                              {getProjectInitial(project)}
                            </div>
                          )}
                        </div>
                        {/* معلومات المشروع */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-amber-900 truncate">{getProjectDisplayName(project)}</h3>
                            <Badge className={`flex-shrink-0 ${project.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}>
                              {project.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'مكتمل' : 'Completed')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mb-1 flex-wrap">
                            {project.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{project.location}</span>}
                            {project.recipient && <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" />{project.recipient}</span>}
                            {project.executiveManager && <span className="flex items-center gap-1"><User className="w-3 h-3" />{project.executiveManager}</span>}
                            <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {projectItems.length}</span>
                            <span className="flex items-center gap-1"><Box className="w-3 h-3" /> {pms.length}</span>
                            {totalCost > 0 && <span className="text-green-600 font-medium">{totalCost.toFixed(0)} {language === 'ar' ? 'ر.ق' : 'QR'}</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <Progress value={projectProgress} className="h-1.5 flex-1 max-w-[200px]" />
                            <span className="text-xs font-bold text-amber-600">{projectProgress}%</span>
                            {project.startDate && (
                              <span className="text-xs text-blue-600">{new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {project.endDate ? new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '?'}</span>
                            )}
                          </div>
                          {project.notes && (
                            <p className="text-xs text-gray-400 mt-1 truncate">{project.notes}{project.notesAuthor ? ` — ${project.notesAuthor}` : ''}</p>
                          )}
                        </div>
                        {/* أزرار */}
                        <div className="flex items-center gap-1 print:hidden flex-shrink-0">
                          {currentUser?.role !== 'store_keeper' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingProject(project); setEditProjectOpen(true) }} disabled={currentUser?.role === 'executive_manager' && project.createdById !== currentUser?.id}><Edit className="w-4 h-4 text-blue-500" /></Button>
                          )}
                          {(project.createdById === currentUser?.id || currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance') && currentUser?.role !== 'store_keeper' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                              setSelectedProjectForMaterial(project.id)
                              setSelectedMaterialForProject('')
                              setNewMaterialQuantity(1)
                              setAddMaterialToProjectOpen(true)
                            }}><Box className="w-4 h-4 text-amber-600" /></Button>
                          )}
                          {(currentUser?.role === 'store_keeper' || currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance') && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                              setSelectedProjectForUsedMaterial(project.id)
                              setSelectedMaterialForUsedMaterial('')
                              setNewUsedMaterialQuantity(1)
                              setUsedMaterialNotes('')
                              setUsedMaterialSearchQuery('')
                              setAddUsedMaterialOpen(true)
                            }}><Box className="w-4 h-4 text-purple-600" /></Button>
                          )}
                          {((currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance') || (currentUser?.role === 'executive_manager' && project.createdById === currentUser?.id)) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteProject(project.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map(project => {
                  const projectItems = items.filter(i => i.projectId === project.id)
                  const projectProgress = projectItems.length > 0 
                    ? Math.round(projectItems.reduce((sum, item) => {
                        const completedStages = item.stages.filter(s => s.status === 'completed').length
                        return sum + (item.stages.length > 0 ? (completedStages / item.stages.length) * 100 : 0)
                      }, 0) / projectItems.length)
                    : 0
                  const pms = projectMaterialsMap[project.id] || []
                  const totalCost = pms.reduce((sum, pm) => sum + (pm.material?.unitPrice || 0) * pm.quantity, 0)
                  
                  return (
                    <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
                      <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500" />
                      {project.image && (
                        <div className="relative aspect-[3/1] bg-gray-100 overflow-hidden">
                          <img src={project.image} alt={getProjectDisplayName(project)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                          <Badge className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} ${project.status === 'active' ? 'bg-green-500' : 'bg-gray-500'} shadow`}>
                            {project.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'مكتمل' : 'Completed')}
                          </Badge>
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            {!project.image && (
                              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                                {getProjectInitial(project)}
                              </div>
                            )}
                            <div>
                              <CardTitle className="text-lg">{getProjectDisplayName(project)}</CardTitle>
                              <CardDescription className="flex items-center gap-2 flex-wrap">
                                {project.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{project.location}</span>}
                                {project.recipient && <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" />{project.recipient}</span>}
                                <span className="text-xs">• {projectItems.length} {language === 'ar' ? 'عنصر' : 'items'}</span>
                                {pms.length > 0 && <span className="text-xs">• {pms.length} {language === 'ar' ? 'مواد' : 'materials'}</span>}
                              </CardDescription>
                            </div>
                          </div>
                          {!project.image && (
                            <Badge className={project.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                              {project.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'مكتمل' : 'Completed')}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        {/* معلومات التنفيذ */}
                        {(project.executiveManager || project.startDate || project.endDate) && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {project.executiveManager && (
                              <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 rounded-md px-2 py-1">
                                <User className="w-3 h-3" />
                                <span className="font-medium">{project.executiveManager}</span>
                              </div>
                            )}
                            {project.startDate && (
                              <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 rounded-md px-2 py-1">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              </div>
                            )}
                            {project.clientName && (
                              <div className="flex items-center gap-1.5 text-gray-600 bg-gray-50 rounded-md px-2 py-1">
                                <Users className="w-3 h-3" />
                                <span>{project.clientName}</span>
                              </div>
                            )}
                            {project.endDate && (
                              <div className="flex items-center gap-1.5 text-green-700 bg-green-50 rounded-md px-2 py-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {/* ملاحظات */}
                        {project.notes && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 text-xs">
                            <p className="text-yellow-800">{project.notes.length > 100 ? project.notes.slice(0, 100) + '...' : project.notes}</p>
                            {project.notesAuthor && <p className="text-yellow-600 mt-1 font-medium">— {project.notesAuthor}</p>}
                          </div>
                        )}
                        <Progress value={projectProgress} className="h-2" />
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">{language === 'ar' ? 'نسبة الإنجاز' : 'Progress'}</span>
                          <span className="font-bold text-amber-600">{projectProgress}%</span>
                        </div>
                        {totalCost > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">{language === 'ar' ? 'تكلفة المواد' : 'Materials Cost'}</span>
                            <span className="font-bold text-green-600">{totalCost.toFixed(2)} {language === 'ar' ? 'ر.ق' : 'QR'}</span>
                          </div>
                        )}
                        {project.deadline && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>{language === 'ar' ? 'الموعد النهائي' : 'Deadline'}: {formatDate(project.deadline)}</span>
                          </div>
                        )}
                        {/* مواد المشروع */}
                        {(() => {
                          return (
                            <div className="border-t pt-2">
                              <div
                                className="flex items-center justify-between cursor-pointer hover:bg-amber-50/50 rounded px-1 py-1 transition-colors"
                                onClick={() => {
                                  const newVal = expandedProjectMaterials === project.id ? '' : project.id
                                  setExpandedProjectMaterials(newVal)
                                  if (newVal) fetchProjectMaterials(project.id)
                                }}
                              >
                                <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                                  <Box className="w-4 h-4" />
                                  <span>{language === 'ar' ? 'المواد المطلوبة' : 'Required Materials'}</span>
                                  <Badge variant="outline" className="text-xs">{pms.length}</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  {totalCost > 0 && (
                                    <span className="text-xs font-bold text-green-600">{totalCost.toFixed(2)} {language === 'ar' ? 'ر.ق' : 'QR'}</span>
                                  )}
                                  {expandedProjectMaterials === project.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              </div>

                              {expandedProjectMaterials === project.id && (
                                <div className="mt-2 space-y-2">
                                  {pms.length > 0 ? (
                                    <>
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="text-xs py-1">{language === 'ar' ? 'المادة' : 'Material'}</TableHead>
                                            <TableHead className="text-xs py-1">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                                            <TableHead className="text-xs py-1">{language === 'ar' ? 'السعر' : 'Price'}</TableHead>
                                            <TableHead className="text-xs py-1">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                                            <TableHead className="text-xs py-1 w-8"></TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {pms.map((pm) => (
                                            <TableRow key={pm.id}>
                                              <TableCell className="text-xs py-1 font-medium">{pm.material?.name || '-'} {pm.material?.nameAr && pm.material.nameAr !== '-' ? `(${pm.material.nameAr})` : ''}</TableCell>
                                              <TableCell className="text-xs py-1">{pm.quantity} {pm.material?.unit || ''}</TableCell>
                                              <TableCell className="text-xs py-1">{(pm.material?.unitPrice || 0).toFixed(2)}</TableCell>
                                              <TableCell className="text-xs py-1 font-bold">{((pm.material?.unitPrice || 0) * pm.quantity).toFixed(2)}</TableCell>
                                              <TableCell className="text-xs py-1">
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveMaterialFromProject(pm.id, project.id)}>
                                                  <X className="w-3 h-3 text-red-500" />
                                                </Button>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                        <tfoot>
                                          <TableRow className="bg-amber-50">
                                            <TableCell colSpan={3} className="text-xs py-1 font-bold">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableCell>
                                            <TableCell className="text-xs py-1 font-bold text-green-700">{totalCost.toFixed(2)} {language === 'ar' ? 'ر.ق' : 'QR'}</TableCell>
                                            <TableCell></TableCell>
                                          </TableRow>
                                        </tfoot>
                                      </Table>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1 w-full text-xs"
                                        onClick={() => {
                                          setSelectedProjectForMaterial(project.id)
                                          setSelectedMaterialForProject('')
                                          setNewMaterialQuantity(1)
                                          setAddMaterialToProjectOpen(true)
                                        }}
                                      >
                                        <Plus className="w-3 h-3" /> {language === 'ar' ? 'إضافة مادة' : 'Add Material'}
                                      </Button>
                                    </>
                                  ) : (
                                    <div className="text-center py-3">
                                      <p className="text-xs text-gray-400 mb-2">{language === 'ar' ? 'لا توجد مواد مضافة لهذا المشروع' : 'No materials added to this project'}</p>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1 text-xs"
                                        onClick={() => {
                                          setSelectedProjectForMaterial(project.id)
                                          setSelectedMaterialForProject('')
                                          setNewMaterialQuantity(1)
                                          setAddMaterialToProjectOpen(true)
                                        }}
                                      >
                                        <Plus className="w-3 h-3" /> {language === 'ar' ? 'إضافة مادة أولى' : 'Add First Material'}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })()}

                        {/* المواد المستعملة — تحت المواد المطلوبة مباشرة */}
                        {(() => {
                          const ums = usedMaterialsMap[project.id] || []
                          const canManageUsed =
                            currentUser?.role === 'store_keeper' ||
                            currentUser?.role === 'general_manager' ||
                            currentUser?.role === 'maintenance'
                          const totalUsedCost = ums.reduce((sum: number, um: any) =>
                            sum + ((um.material?.unitPrice ?? 0) * um.quantity), 0)

                          return (
                            <div className="border-t pt-2">
                              <div
                                className="flex items-center justify-between cursor-pointer hover:bg-purple-50/50 rounded px-1 py-1 transition-colors"
                                onClick={() => {
                                  const newVal = expandedUsedMaterials === project.id ? '' : project.id
                                  setExpandedUsedMaterials(newVal)
                                  if (newVal) fetchUsedMaterials(project.id)
                                }}
                              >
                                <div className="flex items-center gap-2 text-sm font-medium text-purple-800">
                                  <Package className="w-4 h-4" />
                                  <span>{language === 'ar' ? 'المواد المستعملة' : 'Used Materials'}</span>
                                  <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">{ums.length}</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  {totalUsedCost > 0 && (
                                    <span className="text-xs font-bold text-purple-700">
                                      {totalUsedCost.toFixed(2)} {language === 'ar' ? 'ر.ق' : 'QR'}
                                    </span>
                                  )}
                                  {expandedUsedMaterials === project.id
                                    ? <ChevronUp className="w-4 h-4" />
                                    : <ChevronDown className="w-4 h-4" />}
                                </div>
                              </div>

                              {expandedUsedMaterials === project.id && (
                                <div className="mt-2 space-y-2">
                                  {ums.length > 0 ? (
                                    <>
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="bg-purple-50">
                                            <TableHead className="text-xs py-1">{language === 'ar' ? 'المادة' : 'Material'}</TableHead>
                                            <TableHead className="text-xs py-1">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                                            <TableHead className="text-xs py-1">{language === 'ar' ? 'السعر' : 'Price'}</TableHead>
                                            <TableHead className="text-xs py-1">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                                            <TableHead className="text-xs py-1">{language === 'ar' ? 'أضيفت بواسطة' : 'Added By'}</TableHead>
                                            <TableHead className="text-xs py-1 w-8"></TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {ums.map((um: any) => (
                                            <TableRow key={um.id}>
                                              <TableCell className="text-xs py-1 font-medium">
                                                {um.material?.nameAr || um.material?.name || '-'}
                                                {um.notes && (
                                                  <p className="text-[10px] text-gray-400 italic mt-0.5">{um.notes}</p>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-xs py-1">
                                                {um.quantity} {um.material?.unitAr || um.material?.unit || ''}
                                              </TableCell>
                                              <TableCell className="text-xs py-1">{(um.material?.unitPrice || 0).toFixed(2)}</TableCell>
                                              <TableCell className="text-xs py-1 font-bold text-purple-700">
                                                {((um.material?.unitPrice || 0) * um.quantity).toFixed(2)}
                                              </TableCell>
                                              <TableCell className="text-xs py-1 text-gray-500">
                                                {um.addedBy?.name || '-'}
                                              </TableCell>
                                              <TableCell className="text-xs py-1">
                                                {canManageUsed && (
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => handleRemoveUsedMaterial(um.id, project.id)}
                                                  >
                                                    <X className="w-3 h-3 text-red-500" />
                                                  </Button>
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                        <tfoot>
                                          <TableRow className="bg-purple-50">
                                            <TableCell colSpan={3} className="text-xs py-1 font-bold">
                                              {language === 'ar' ? 'الإجمالي' : 'Total'}
                                            </TableCell>
                                            <TableCell className="text-xs py-1 font-bold text-purple-700">
                                              {totalUsedCost.toFixed(2)} {language === 'ar' ? 'ر.ق' : 'QR'}
                                            </TableCell>
                                            <TableCell colSpan={2}></TableCell>
                                          </TableRow>
                                        </tfoot>
                                      </Table>

                                      <div className="flex gap-2 flex-wrap">
                                        {canManageUsed && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1 flex-1 text-xs bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
                                            onClick={() => {
                                              setSelectedProjectForUsedMaterial(project.id)
                                              setSelectedMaterialForUsedMaterial('')
                                              setNewUsedMaterialQuantity(1)
                                              setUsedMaterialNotes('')
                                              setUsedMaterialSearchQuery('')
                                              setAddUsedMaterialOpen(true)
                                            }}
                                          >
                                            <Plus className="w-3 h-3" />
                                            {language === 'ar' ? 'إضافة مادة مستعملة' : 'Add Used Material'}
                                          </Button>
                                        )}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="gap-1 text-xs bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                                          onClick={() => handleExportUsedMaterials(project.id)}
                                          title={language === 'ar' ? 'تنزيل Excel' : 'Download Excel'}
                                        >
                                          <Download className="w-3 h-3" />
                                          {language === 'ar' ? 'تنزيل Excel' : 'Export Excel'}
                                        </Button>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-center py-3 space-y-2">
                                      <p className="text-xs text-gray-400">
                                        {language === 'ar' ? 'لا توجد مواد مستعملة مسجلة' : 'No used materials recorded'}
                                      </p>
                                      {canManageUsed && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="gap-1 text-xs bg-purple-50 border-purple-300 text-purple-700"
                                          onClick={() => {
                                            setSelectedProjectForUsedMaterial(project.id)
                                            setSelectedMaterialForUsedMaterial('')
                                            setNewUsedMaterialQuantity(1)
                                            setUsedMaterialNotes('')
                                            setUsedMaterialSearchQuery('')
                                            setAddUsedMaterialOpen(true)
                                          }}
                                        >
                                          <Plus className="w-3 h-3" />
                                          {language === 'ar' ? 'تسجيل أول مادة مستعملة' : 'Record First Used Material'}
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })()}

                        <div className="flex gap-2 pt-2 border-t print:hidden">
                          {currentUser?.role !== 'store_keeper' && (
                            <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={() => { setEditingProject(project); setEditProjectOpen(true) }} disabled={currentUser?.role === 'executive_manager' && project.createdById !== currentUser?.id}>
                              <Edit className="w-4 h-4" /> {t.btn_edit}
                            </Button>
                          )}
                          {(currentUser?.role === 'store_keeper' || currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance') && (
                            <Button variant="outline" size="sm" className="gap-1 bg-purple-50 border-purple-300 text-purple-700" onClick={() => {
                              setSelectedProjectForUsedMaterial(project.id)
                              setSelectedMaterialForUsedMaterial('')
                              setNewUsedMaterialQuantity(1)
                              setUsedMaterialNotes('')
                              setUsedMaterialSearchQuery('')
                              setAddUsedMaterialOpen(true)
                            }}>
                              <Plus className="w-4 h-4" /> {language === 'ar' ? 'مواد مستعملة' : 'Used'}
                            </Button>
                          )}
                          {((currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance') || (currentUser?.role === 'executive_manager' && project.createdById === currentUser?.id)) && (
                            <Button variant="outline" size="sm" className="gap-1 text-red-600 hover:text-red-700" onClick={() => handleDeleteProject(project.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
            {projects.length === 0 && (
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">{language === 'ar' ? 'لا توجد مشاريع' : 'No projects yet'}</p>
              </div>
            )}
          </TabsContent>

          {/* تبويب المواد الأولية */}
          <MaterialsTab projects={projects} language={language} t={t} isRTL={isRTL} currentUser={currentUser} />

          {/* تبويب العناصر */}
          <TabsContent value="items" className="space-y-4">
            <div className="flex flex-col gap-3 print:hidden">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-amber-900">{t.items_list} ({items.filter(item => {
                    if (itemProjectFilter !== 'all' && item.projectId !== itemProjectFilter) return false
                    if (itemDepartmentFilter !== 'all' && !item.stages.some(s => s.departmentId === itemDepartmentFilter)) return false
                    return true
                  }).length}/{items.length})</h2>
                  {/* تبديل وضع العرض */}
                  <div className="flex items-center bg-white rounded-lg border border-amber-200 p-0.5">
                    <Button variant={itemViewMode === 'grid' ? 'default' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setItemViewMode('grid')} title={language === 'ar' ? 'شبكة' : 'Grid'}>
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button variant={itemViewMode === 'list' ? 'default' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setItemViewMode('list')} title={language === 'ar' ? 'قائمة' : 'List'}>
                      <List className="w-4 h-4" />
                    </Button>
                    <Button variant={itemViewMode === 'gallery' ? 'default' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setItemViewMode('gallery')} title={language === 'ar' ? 'معرض صور' : 'Gallery'}>
                      <ImageIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              {/* فلاتر العناصر */}
              <div className="flex flex-wrap items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200 p-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">{language === 'ar' ? 'تصفية:' : 'Filter:'}</span>
                </div>
                <Select value={itemProjectFilter} onValueChange={setItemProjectFilter}>
                  <SelectTrigger className="w-[200px] h-8 text-xs">
                    <SelectValue placeholder={language === 'ar' ? 'كل المشاريع' : 'All Projects'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'كل المشاريع' : 'All Projects'}</SelectItem>
                    <SelectItem value="_none_">{language === 'ar' ? 'بدون مشروع' : 'No Project'}</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{getProjectDisplayName(p)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={itemDepartmentFilter} onValueChange={setItemDepartmentFilter}>
                  <SelectTrigger className="w-[200px] h-8 text-xs">
                    <SelectValue placeholder={language === 'ar' ? 'كل الأقسام' : 'All Departments'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'كل الأقسام' : 'All Departments'}</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                          <span>{getDepartmentName(d)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(itemProjectFilter !== 'all' || itemDepartmentFilter !== 'all') && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-gray-500 hover:text-gray-700" onClick={() => { setItemProjectFilter('all'); setItemDepartmentFilter('all') }}>
                    <X className="w-3.5 h-3.5" />
                    {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
                  </Button>
                )}
                <div className="flex-1" />
                <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 h-8 text-xs">
                      <Plus className="w-4 h-4" /> {t.btn_add_item}
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{t.btn_add_item}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    {/* اختيار المشروع */}
                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'المشروع' : 'Project'}</Label>
                      <Select value={newItem.projectId || '_none'} onValueChange={(val) => setNewItem(prev => ({ ...prev, projectId: val === '_none' ? '' : val }))}>
                        <SelectTrigger>
                          <SelectValue placeholder={language === 'ar' ? 'اختر المشروع (اختياري)' : 'Select Project (optional)'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">{language === 'ar' ? 'بدون مشروع' : 'No Project'}</SelectItem>
                          {projects.map(project => (
                            <SelectItem key={project.id} value={project.id}>
                              {getProjectDisplayName(project)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
            </div>

            {/* قائمة العناصر */}
            {(() => {
              const filteredItems = items.filter(item => {
                if (itemProjectFilter !== 'all') {
                  if (itemProjectFilter === '_none_' && item.projectId) return false
                  if (itemProjectFilter !== '_none_' && item.projectId !== itemProjectFilter) return false
                }
                if (itemDepartmentFilter !== 'all' && !item.stages.some(s => s.departmentId === itemDepartmentFilter)) return false
                return true
              })
              return <>
            {itemViewMode === 'gallery' ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {filteredItems.map(item => {
                  const itemProgress = item.stages.length > 0 ? (item.stages.filter(s => s.status === 'completed').length / item.stages.length) * 100 : 0
                  const projectName = item.project ? (item.project.nameAr || item.project.name) : null
                  return (
                    <Card key={item.id} className="overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="relative aspect-square bg-gradient-to-br from-amber-50 via-orange-25 to-amber-100 overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                              {item.name.charAt(0)}
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <Badge className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} ${getStatusColor(item.status)} shadow`}>{getStatusLabel(item.status)}</Badge>
                        <div className="absolute bottom-2 inset-x-2">
                          <h3 className="text-white font-bold text-sm drop-shadow-md truncate">{item.name}</h3>
                          {projectName && <p className="text-white/70 text-xs truncate">{projectName}</p>}
                        </div>
                      </div>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Progress value={itemProgress} className="h-1.5 flex-1" />
                          <span className="text-xs font-bold text-amber-600">{Math.round(itemProgress)}%</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{t.item_quantity}: {item.totalQuantity}</span>
                          <span>{item.stages.filter(s => s.status === 'completed').length}/{item.stages.length}</span>
                        </div>
                        <div className="flex gap-1 print:hidden">
                          <Select value={item.status} onValueChange={(val) => handleUpdateItemStatus(item.id, val)}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">{t.status_pending}</SelectItem>
                              <SelectItem value="in_progress">{t.status_in_progress}</SelectItem>
                              <SelectItem value="completed">{t.status_completed}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingItem(item); setEditItemOpen(true) }}><Edit className="w-3.5 h-3.5 text-blue-500" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteItem(item.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : itemViewMode === 'list' ? (
              <div className="space-y-2">
                {filteredItems.map(item => {
                  const itemProgress = item.stages.length > 0 ? (item.stages.filter(s => s.status === 'completed').length / item.stages.length) * 100 : 0
                  const projectName = item.project ? (item.project.nameAr || item.project.name) : null
                  return (
                    <Card key={item.id} className="hover:shadow-md transition-shadow overflow-hidden">
                      <div className="flex items-center gap-4 p-3">
                        <div className="flex-shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-14 h-14 rounded-xl object-cover shadow-sm" />
                          ) : (
                            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-sm">
                              {item.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-bold text-amber-900 truncate text-sm">{item.name}</h3>
                            <Badge className={`flex-shrink-0 ${getStatusColor(item.status)} text-xs`}>{getStatusLabel(item.status)}</Badge>
                            {projectName && <span className="text-xs text-gray-400 truncate">({projectName})</span>}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-1">
                            <span>{t.item_quantity}: {item.totalQuantity}</span>
                            <span>{t.item_priority}: {item.priority}</span>
                            <span>{item.stages.filter(s => s.status === 'completed').length}/{item.stages.length} {t.stages}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Progress value={itemProgress} className="h-1.5 flex-1 max-w-[180px]" />
                            <span className="text-xs font-bold text-amber-600">{Math.round(itemProgress)}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 print:hidden flex-shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdatePriority(item.id, 'up')}><ChevronUp className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdatePriority(item.id, 'down')}><ChevronDown className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingItem(item); setEditItemOpen(true) }}><Edit className="w-4 h-4 text-blue-500" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedItemId(item.id); setAddStageOpen(true) }}><Plus className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteItem(item.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map(item => {
                  const itemProgress = item.stages.length > 0 ? (item.stages.filter(s => s.status === 'completed').length / item.stages.length) * 100 : 0
                  return (
                    <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
                      {item.image && (
                        <div className="aspect-video bg-gray-100 relative overflow-hidden">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                          <Badge className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} ${getStatusColor(item.status)} shadow`}>{getStatusLabel(item.status)}</Badge>
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            {!item.image && (
                              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                                {item.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <CardTitle className="text-lg">{item.name}</CardTitle>
                              <CardDescription className="flex items-center gap-2 flex-wrap">
                                <span>{t.item_priority}: {item.priority}</span>
                                <span>• {t.item_quantity}: {item.totalQuantity}</span>
                                {item.project && <span>• {item.project.nameAr || item.project.name}</span>}
                              </CardDescription>
                            </div>
                          </div>
                          {!item.image && (
                            <div className="flex gap-1 print:hidden">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleUpdatePriority(item.id, 'up')}><ChevronUp className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleUpdatePriority(item.id, 'down')}><ChevronDown className="w-3.5 h-3.5" /></Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{t.schedule_progress}</span>
                            <span>{item.stages.filter(s => s.status === 'completed').length}/{item.stages.length} {t.stages}</span>
                          </div>
                          <Progress value={itemProgress} className="h-2" />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.stages.map(stage => (
                            <Badge key={stage.id} variant="outline" style={{ borderColor: stage.department?.color }}
                              className={`cursor-pointer text-xs ${stage.status === 'completed' ? 'bg-green-100' : stage.status === 'in_progress' ? 'bg-blue-100' : ''}`}
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
                  )
                })}
              </div>
            )}

            {filteredItems.length === 0 && items.length > 0 && (
              <div className="text-center py-12">
                <Filter className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-600">{language === 'ar' ? 'لا توجد عناصر مطابقة للفلاتر' : 'No items match the filters'}</h3>
                <p className="text-gray-500">{language === 'ar' ? 'جرب تغيير خيارات التصفية' : 'Try changing the filter options'}</p>
              </div>
            )}
            {items.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-600">{t.no_items}</h3>
                <p className="text-gray-500">{t.no_items_desc}</p>
              </div>
            )}
            </>
            })()}
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

            {/* Dynamic Charts - loaded client-side only to avoid SSR issues */}
            <Suspense fallback={
              <div className="grid gap-6 md:grid-cols-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-80 bg-gray-50 rounded-xl animate-pulse" />
                ))}
              </div>
            }>
              <RechartsComponents 
                projects={projects} 
                items={items} 
                departments={departments} 
                stats={stats} 
                language={language} 
                t={t} 
              />
            </Suspense>

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
                          <p className="font-medium">{getProjectDisplayName(project)}</p>
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

          {/* تبويب حاسبة التكلفة */}
          <TabsContent value="calculator" className="space-y-4">
            <DesignCostCalculator language={language} />
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

          {(currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance') && (
            <TabsContent value="users" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-amber-900">{language === 'ar' ? 'إدارة المستخدمين' : 'User Management'} ({users.length})</h2>
              </div>
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                        <TableHead>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الهاتف' : 'Phone'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الدور' : 'Role'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                        <TableHead>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map(user => {
                        const roleLabels: Record<string, string> = {
                          general_manager: 'مدير عام',
                          maintenance: 'صيانة',
                          executive_manager: 'مسؤول تنفيذي',
                          supervisor: 'مشرف',
                          store_keeper: 'ستور كيبر',
                        }
                        const roleColors: Record<string, string> = {
                          general_manager: 'bg-red-100 text-red-800',
                          maintenance: 'bg-orange-100 text-orange-800',
                          executive_manager: 'bg-blue-100 text-blue-800',
                          supervisor: 'bg-green-100 text-green-800',
                          store_keeper: 'bg-purple-100 text-purple-800',
                        }
                        return (
                          <TableRow key={user.id}>
                            <TableCell>
                              {editingUserField?.userId === user.id && editingUserField?.field === 'name' ? (
                                <div className="flex gap-1">
                                  <Input value={editUserValue} onChange={(e) => setEditUserValue(e.target.value)} className="h-7 text-xs w-24" />
                                  <Button size="sm" className="h-7 px-2" onClick={async () => {
                                    await fetch('/api/users', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id: user.id, name: editUserValue }) })
                                    setEditingUserField(null)
                                    fetchUsers()
                                  }}>✓</Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingUserField(null)}>✗</Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">{user.name}</span>
                                  <button onClick={() => { setEditingUserField({userId: user.id, field: 'name'}); setEditUserValue(user.name) }} className="text-gray-400 hover:text-amber-600"><Edit className="w-3 h-3" /></button>
                                </div>
                              )}
                            </TableCell>
                            <TableCell dir="ltr" className="text-xs">{user.email}</TableCell>
                            <TableCell>
                              {editingUserField?.userId === user.id && editingUserField?.field === 'phone' ? (
                                <div className="flex gap-1">
                                  <Input value={editUserValue} onChange={(e) => setEditUserValue(e.target.value)} className="h-7 text-xs w-24" placeholder="05xxxxxxxx" />
                                  <Button size="sm" className="h-7 px-2" onClick={async () => {
                                    await fetch('/api/users', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id: user.id, phone: editUserValue }) })
                                    setEditingUserField(null)
                                    fetchUsers()
                                  }}>✓</Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingUserField(null)}>✗</Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs">{user.phone || '-'}</span>
                                  <button onClick={() => { setEditingUserField({userId: user.id, field: 'phone'}); setEditUserValue(user.phone || '') }} className="text-gray-400 hover:text-amber-600"><Edit className="w-3 h-3" /></button>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select value={user.role} onValueChange={async (newRole) => {
                                const res = await fetch('/api/users', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id: user.id, role: newRole }) })
                                if (res.ok) { fetchUsers() } else { const err = await res.json(); toast.error(err.error) }
                              }}>
                                <SelectTrigger className="h-7 w-32">
                                  <Badge className={`${roleColors[user.role] || 'bg-gray-100'} text-xs`}>
                                    {roleLabels[user.role] || user.role}
                                  </Badge>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="general_manager">مدير عام</SelectItem>
                                  <SelectItem value="maintenance">صيانة</SelectItem>
                                  <SelectItem value="executive_manager">مسؤول تنفيذي</SelectItem>
                                  <SelectItem value="supervisor">مشرف</SelectItem>
                                  <SelectItem value="store_keeper">ستور كيبر</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.status === 'active' ? 'default' : user.status === 'suspended' ? 'destructive' : 'outline'}>
                                {user.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') : user.status === 'suspended' ? (language === 'ar' ? 'معلق' : 'Suspended') : (language === 'ar' ? 'قيد المراجعة' : 'Under Review')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleToggleUserStatus(user)}>
                                  {user.status === 'suspended' ? (language === 'ar' ? 'تفعيل' : 'Activate') : (language === 'ar' ? 'تعليق' : 'Suspend')}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id)} disabled={user.role === 'general_manager' || user.role === 'maintenance'}>
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
          )}
        </Tabs>
      </main>

      {/* نافذة تعديل المشروع */}
      <Dialog open={editProjectOpen} onOpenChange={setEditProjectOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{language === 'ar' ? 'تعديل المشروع' : 'Edit Project'}</DialogTitle></DialogHeader>
          {editingProject && (
            <div className="space-y-4">
              {/* تاريخ المشروع ومكانه */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-amber-800 font-semibold">{language === 'ar' ? 'تاريخ المشروع' : 'Project Date'} *</Label>
                  <Input type="date" value={editingProject.projectDate ? (typeof editingProject.projectDate === 'string' ? editingProject.projectDate.slice(0, 10) : new Date(editingProject.projectDate).toISOString().slice(0, 10)) : ''} onChange={(e) => setEditingProject(prev => prev ? ({ ...prev, projectDate: e.target.value }) : prev)} className="border-amber-300" />
                </div>
                <div className="space-y-2">
                  <Label className="text-amber-800 font-semibold">{language === 'ar' ? 'مكان المشروع' : 'Project Location'}</Label>
                  <Input value={editingProject.location || ''} onChange={(e) => setEditingProject(prev => prev ? ({ ...prev, location: e.target.value }) : prev)} className="border-amber-300" />
                </div>
              </div>
              {/* المستقبل والمسؤول التنفيذي */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-amber-800 font-semibold">{language === 'ar' ? 'شخص المستقبل المشروع' : 'Project Recipient'}</Label>
                  <Input value={editingProject.recipient || ''} onChange={(e) => setEditingProject(prev => prev ? ({ ...prev, recipient: e.target.value }) : prev)} className="border-amber-300" />
                </div>
                <div className="space-y-2">
                  <Label className="text-amber-800 font-semibold">{language === 'ar' ? 'المسؤول التنفيذي' : 'Executive Manager'}</Label>
                  <Input value={editingProject.executiveManager || ''} onChange={(e) => setEditingProject(prev => prev ? ({ ...prev, executiveManager: e.target.value }) : prev)} className="border-amber-300" />
                </div>
              </div>
              {/* اسم العميل */}
              <div className="space-y-2">
                <Label className="text-amber-800">{language === 'ar' ? 'اسم العميل' : 'Client Name'}</Label>
                <Input value={editingProject.clientName || ''} onChange={(e) => setEditingProject(prev => prev ? ({ ...prev, clientName: e.target.value }) : prev)} />
              </div>
              {/* تاريخي التنفيذ */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-blue-800 font-semibold">{language === 'ar' ? 'تاريخ بداية التنفيذ' : 'Execution Start Date'}</Label>
                  <Input type="date" value={editingProject.startDate ? (typeof editingProject.startDate === 'string' ? editingProject.startDate.slice(0, 10) : new Date(editingProject.startDate).toISOString().slice(0, 10)) : ''} onChange={(e) => setEditingProject(prev => prev ? ({ ...prev, startDate: e.target.value }) : prev)} className="border-blue-300" />
                </div>
                <div className="space-y-2">
                  <Label className="text-blue-800 font-semibold">{language === 'ar' ? 'تاريخ نهاية التنفيذ' : 'Execution End Date'}</Label>
                  <Input type="date" value={editingProject.endDate ? (typeof editingProject.endDate === 'string' ? editingProject.endDate.slice(0, 10) : new Date(editingProject.endDate).toISOString().slice(0, 10)) : ''} onChange={(e) => setEditingProject(prev => prev ? ({ ...prev, endDate: e.target.value }) : prev)} className="border-blue-300" />
                </div>
              </div>
              {/* الموعد النهائي */}
              <div className="space-y-2">
                <Label className="text-amber-800">{language === 'ar' ? 'الموعد النهائي' : 'Deadline'}</Label>
                <Input type="date" value={editingProject.deadline ? (typeof editingProject.deadline === 'string' ? editingProject.deadline.slice(0, 10) : new Date(editingProject.deadline).toISOString().slice(0, 10)) : ''} onChange={(e) => setEditingProject(prev => prev ? ({ ...prev, deadline: e.target.value }) : prev)} />
              </div>
              {/* ملاحظات مع كاتب الملاحظات */}
              <div className="space-y-2">
                <Label className="text-amber-800">{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                <Textarea value={editingProject.notes || ''} onChange={(e) => setEditingProject(prev => prev ? ({ ...prev, notes: e.target.value }) : prev)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label className="text-amber-800">{language === 'ar' ? 'كاتب الملاحظات' : 'Notes Author'}</Label>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{editingProject.notesAuthor || (currentUser?.name || '-')}</span>
                  <span className="text-xs text-gray-400">({language === 'ar' ? 'تلقائي' : 'Auto'})</span>
                </div>
              </div>
              {/* صورة المشروع */}
              <div className="space-y-2">
                <Label className="text-amber-800">{language === 'ar' ? 'صورة المشروع' : 'Project Image'}</Label>
                <Input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setEditingProject(prev => prev ? ({ ...prev, image: reader.result as string }) : prev)
                    }
                    reader.readAsDataURL(file)
                  }
                }} />
                {editingProject?.image && <img src={editingProject.image} alt="preview" className="w-20 h-20 object-cover rounded-lg border mt-2" />}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProjectOpen(false)}>{t.btn_cancel}</Button>
            <Button onClick={handleEditProject} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">{t.btn_save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تعديل العنصر */}
      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{language === 'ar' ? 'تعديل العنصر' : 'Edit Item'}</DialogTitle></DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              {/* اختيار المشروع */}
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'المشروع' : 'Project'}</Label>
                <Select value={editingItem.projectId || '_none'} onValueChange={(val) => setEditingItem({ ...editingItem, projectId: val === '_none' ? undefined : val })}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر المشروع (اختياري)' : 'Select Project (optional)'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{language === 'ar' ? 'بدون مشروع' : 'No Project'}</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {getProjectDisplayName(project)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

      {/* نافذة إضافة مادة للمشروع */}
      <Dialog open={addMaterialToProjectOpen} onOpenChange={(open) => { setAddMaterialToProjectOpen(open); if (!open) setMaterialSearchQuery('') }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'إضافة مادة للمشروع' : 'Add Material to Project'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المشروع' : 'Project'}</Label>
              <Select value={selectedProjectForMaterial} onValueChange={setSelectedProjectForMaterial}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر المشروع' : 'Select Project'} /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nameAr || p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المادة' : 'Material'}</Label>
              {/* محرك بحث المواد */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={materialSearchQuery}
                  onChange={(e) => { setMaterialSearchQuery(e.target.value); setSelectedMaterialForProject('') }}
                  placeholder={language === 'ar' ? 'ابحث بالأحرف عن المادة...' : 'Search material by characters...'}
                  className="pl-9 pr-3 border-amber-300 focus:border-amber-500"
                />
              </div>
              {/* قائمة المواد المفلترة */}
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {materials
                  .filter(m => {
                    if (!materialSearchQuery.trim()) return true
                    const q = materialSearchQuery.trim().toLowerCase()
                    return (
                      m.name.toLowerCase().includes(q) ||
                      (m.nameAr && m.nameAr.toLowerCase().includes(q)) ||
                      (m.category && m.category.toLowerCase().includes(q)) ||
                      (m.categoryAr && m.categoryAr.toLowerCase().includes(q))
                    )
                  })
                  .map(m => (
                    <div
                      key={m.id}
                      onClick={() => { setSelectedMaterialForProject(m.id); setMaterialSearchQuery(m.nameAr || m.name) }}
                      className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-amber-50 transition-colors ${selectedMaterialForProject === m.id ? 'bg-amber-100 border-r-2 border-amber-500' : ''}`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{m.name}</span>
                        {m.nameAr && m.nameAr !== '-' && <span className="text-xs text-gray-500">{m.nameAr}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded">{m.unit}</span>
                        <span className="font-medium text-green-700">{(m.unitPrice || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                }
                {materials.filter(m => {
                  if (!materialSearchQuery.trim()) return true
                  const q = materialSearchQuery.trim().toLowerCase()
                  return (
                    m.name.toLowerCase().includes(q) ||
                    (m.nameAr && m.nameAr.toLowerCase().includes(q)) ||
                    (m.category && m.category.toLowerCase().includes(q)) ||
                    (m.categoryAr && m.categoryAr.toLowerCase().includes(q))
                  )
                }).length === 0 && (
                  <div className="px-3 py-4 text-center text-sm text-gray-400">
                    {language === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching results'}
                  </div>
                )}
              </div>
              {materials.length === 0 && (
                <p className="text-xs text-amber-600">{language === 'ar' ? 'لا توجد مواد مضافة بعد. أضف مواد من تبويب "المواد الأولية" أولاً.' : 'No materials added yet. Add materials from the "Materials" tab first.'}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الكمية' : 'Quantity'}</Label>
              <Input type="number" min="1" value={newMaterialQuantity} onChange={(e) => setNewMaterialQuantity(parseInt(e.target.value) || 1)} />
            </div>
            {selectedMaterialForProject && (
              <div className="bg-amber-50 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}:</span>
                  <span className="font-medium">{(materials.find(m => m.id === selectedMaterialForProject)?.unitPrice || 0).toFixed(2)} {language === 'ar' ? 'ر.ق' : 'QR'}</span>
                </div>
                <div className="flex justify-between text-sm font-bold mt-1">
                  <span>{language === 'ar' ? 'الإجمالي' : 'Total'}:</span>
                  <span className="text-green-700">{((materials.find(m => m.id === selectedMaterialForProject)?.unitPrice || 0) * newMaterialQuantity).toFixed(2)} {language === 'ar' ? 'ر.ق' : 'QR'}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddMaterialToProjectOpen(false); setMaterialSearchQuery('') }}>{t.btn_cancel}</Button>
            <Button onClick={handleAddMaterialToProject} disabled={!selectedMaterialForProject || !selectedProjectForMaterial}>{t.btn_save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة إضافة مادة مستعملة */}
      <Dialog open={addUsedMaterialOpen} onOpenChange={(open) => { setAddUsedMaterialOpen(open); if (!open) setUsedMaterialSearchQuery('') }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'إضافة مادة مستعملة' : 'Add Used Material'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المشروع' : 'Project'}</Label>
              <Select value={selectedProjectForUsedMaterial} onValueChange={setSelectedProjectForUsedMaterial}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر المشروع' : 'Select Project'} /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nameAr || p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المادة' : 'Material'}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={usedMaterialSearchQuery} onChange={(e) => { setUsedMaterialSearchQuery(e.target.value); setSelectedMaterialForUsedMaterial('') }} placeholder={language === 'ar' ? 'ابحث عن المادة...' : 'Search material...'} className="pl-9 pr-3" />
              </div>
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {materials.filter(m => {
                  if (!usedMaterialSearchQuery.trim()) return true
                  const q = usedMaterialSearchQuery.trim().toLowerCase()
                  return m.name.toLowerCase().includes(q) || (m.nameAr && m.nameAr.toLowerCase().includes(q))
                }).map(m => (
                  <div key={m.id} onClick={() => { setSelectedMaterialForUsedMaterial(m.id); setUsedMaterialSearchQuery(m.nameAr || m.name) }}
                    className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-purple-50 transition-colors ${selectedMaterialForUsedMaterial === m.id ? 'bg-purple-100 border-r-2 border-purple-500' : ''}`}>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{m.name}</span>
                      {m.nameAr && m.nameAr !== '-' && <span className="text-xs text-gray-500">{m.nameAr}</span>}
                    </div>
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{m.unit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الكمية' : 'Quantity'}</Label>
                <Input type="number" min="1" value={newUsedMaterialQuantity} onChange={(e) => setNewUsedMaterialQuantity(parseInt(e.target.value) || 1)} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                <Input value={usedMaterialNotes} onChange={(e) => setUsedMaterialNotes(e.target.value)} placeholder={language === 'ar' ? 'ملاحظات اختيارية' : 'Optional notes'} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddUsedMaterialOpen(false); setUsedMaterialSearchQuery('') }}>{t.btn_cancel}</Button>
            <Button onClick={handleAddUsedMaterial} disabled={!selectedMaterialForUsedMaterial || !selectedProjectForUsedMaterial} className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700">{t.btn_save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* شريط الدردشة الجانبي */}
      <ChatSidebar
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        currentUser={currentUser}
        language={language}
      />

      {/* مركز المساعدة */}
      <HelpCenter
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        language={language}
      />


    </div>
  )
}
