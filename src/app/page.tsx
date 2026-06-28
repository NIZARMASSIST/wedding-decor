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
  Settings, Printer, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Edit,
  Globe, Paperclip, Download, Eye, Play, CheckCircle2,
  FolderOpen, BarChart3, PieChart, LogOut, User, Upload,
  Search, Filter, Box, X, LayoutGrid, List, ImageIcon,
  MapPin, UserCheck, ClipboardList, MessageCircle, HelpCircle, Calculator,
  KeyRound, EyeOff, ShieldAlert, Copy, Boxes, Layers, FolderTree,
  ZoomIn, ZoomOut, RotateCcw, RotateCw, Maximize2

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
  unitId?: string
  unit?: {
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

// واجهة الوحدة
type UnitStatus = 'active' | 'completed' | 'cancelled'
interface Unit {
  id: string
  projectId: string
  project?: { id: string; name: string; nameAr?: string }
  name: string
  nameAr?: string
  description?: string
  mainImage?: string | null  // الصورة الرئيسية (data URL)
  subImages?: string[]       // صور فرعية (مصفوفة data URLs)
  order: number
  status: UnitStatus | string
  items?: ProductionItem[]
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
  units?: Unit[]
  usedMaterials?: any[]
  createdAt: string
  updatedAt: string
}

// واجهة المادة
interface Material {
  id: string
  name: string
  nameAr?: string
  itemCode?: string | null
  unit: string
  unitAr?: string
  category: string
  categoryAr?: string
  department?: string | null
  unitPrice: number
  stockQuantity: number
  minStockLevel?: number | null
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
  const [newUsedMaterialPrice, setNewUsedMaterialPrice] = useState<number | ''>('')
  const [newUsedMaterialDepartment, setNewUsedMaterialDepartment] = useState('')
  const [usedMaterialNotes, setUsedMaterialNotes] = useState('')
  const [usedMaterialSearchQuery, setUsedMaterialSearchQuery] = useState('')
  // حالات حركات المخزون
  const [stockTransactions, setStockTransactions] = useState<any[]>([])
  const [stockTxnSearch, setStockTxnSearch] = useState('')
  const [stockTxnTypeFilter, setStockTxnTypeFilter] = useState('')
  const [stockTxnDeptFilter, setStockTxnDeptFilter] = useState('')
  const [stockTxnProjectFilter, setStockTxnProjectFilter] = useState('all')
  const [addStockTxnOpen, setAddStockTxnOpen] = useState(false)
  const [newStockTxn, setNewStockTxn] = useState<{
    materialId: string; type: string; quantity: number; price: number | '';
    department: string; date: string; notes: string; reference: string; projectId: string
  }>({
    materialId: '', type: 'delivery', quantity: 0, price: '', department: '',
    date: new Date().toISOString().split('T')[0], notes: '', reference: '', projectId: ''
  })
  const [stockTxnMaterialSearch, setStockTxnMaterialSearch] = useState('')
  const [editingUserField, setEditingUserField] = useState<{userId: string, field: 'name' | 'phone'} | null>(null)
  const [editUserValue, setEditUserValue] = useState('')
  // إعادة تعيين كلمة المرور من حساب الصيانة
  const [resetPasswordUser, setResetPasswordUser] = useState<{id: string, name: string, email: string, role: string} | null>(null)
  const [newPasswordValue, setNewPasswordValue] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false)
  // عرض كلمة المرور من حساب الصيانة/المدير العام
  const [viewPasswordUser, setViewPasswordUser] = useState<{id: string, name: string, email: string, role: string} | null>(null)
  const [viewedPassword, setViewedPassword] = useState<string | null>(null)
  const [viewPasswordLoading, setViewPasswordLoading] = useState(false)
  const [viewPasswordOpen, setViewPasswordOpen] = useState(false)
  const [viewPasswordError, setViewPasswordError] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  // ============= حالات الوحدات =============
  const [units, setUnits] = useState<Unit[]>([])
  // فلتر الوحدات حسب المشروع: 'all' أو معرّف مشروع
  const [unitsProjectFilter, setUnitsProjectFilter] = useState<string>('all')
  // الوحدات المفتوحة (لإظهار عناصرها)
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({})
  // نافذة إضافة وحدة
  const [addUnitOpen, setAddUnitOpen] = useState(false)
  const [newUnit, setNewUnit] = useState<{
    projectId: string; name: string; nameAr: string; description: string;
    mainImage: string | null; subImages: string[]
  }>({
    projectId: '', name: '', nameAr: '', description: '', mainImage: null, subImages: []
  })
  const [uploadingUnitImage, setUploadingUnitImage] = useState(false)
  // نافذة تعديل وحدة
  const [editUnitOpen, setEditUnitOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  // نافذة عرض الصورة بزوم
  const [unitImageViewer, setUnitImageViewer] = useState<{ images: string[]; index: number } | null>(null)
  const [unitImageZoom, setUnitImageZoom] = useState(1)
  const [unitImageRotation, setUnitImageRotation] = useState(0)
  // نافذة ربط عنصر بالوحدة
  const [linkItemToUnitOpen, setLinkItemToUnitOpen] = useState(false)
  const [linkTargetUnit, setLinkTargetUnit] = useState<Unit | null>(null)
  const [linkItemId, setLinkItemId] = useState<string>('')
  // فلاتر العناصر داخل الوحدة
  const [unitItemSearchQuery, setUnitItemSearchQuery] = useState('')

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
          price: newUsedMaterialPrice === '' ? undefined : newUsedMaterialPrice,
          department: newUsedMaterialDepartment || undefined,
          notes: usedMaterialNotes
        })
      })
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم إضافة المادة المستعملة' : 'Used material added')
        setAddUsedMaterialOpen(false)
        setSelectedMaterialForUsedMaterial('')
        setNewUsedMaterialQuantity(1)
        setNewUsedMaterialPrice('')
        setNewUsedMaterialDepartment('')
        setUsedMaterialNotes('')
        setUsedMaterialSearchQuery('')
        // فتح القسم تلقائياً ليرى المستخدم النتيجة فوراً
        setExpandedUsedMaterials(selectedProjectForUsedMaterial)
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

  // جلب حركات المخزون
  const fetchStockTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (stockTxnProjectFilter !== 'all') params.set('projectId', stockTxnProjectFilter)
      if (stockTxnTypeFilter) params.set('type', stockTxnTypeFilter)
      if (stockTxnDeptFilter) params.set('department', stockTxnDeptFilter)
      if (stockTxnSearch) params.set('search', stockTxnSearch)
      params.set('limit', '500')
      const res = await fetch(`/api/stock-transactions?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setStockTransactions(data.transactions || [])
      } else {
        setStockTransactions([])
      }
    } catch (error) {
      console.error('Error fetching stock transactions:', error)
      setStockTransactions([])
    }
  }, [stockTxnProjectFilter, stockTxnTypeFilter, stockTxnDeptFilter, stockTxnSearch])

  // إضافة حركة مخزون يدوياً
  const handleAddStockTxn = async () => {
    if (!newStockTxn.materialId) {
      toast.error(language === 'ar' ? 'اختر المادة' : 'Select material')
      return
    }
    if (!newStockTxn.quantity || newStockTxn.quantity <= 0) {
      toast.error(language === 'ar' ? 'أدخل كمية صحيحة' : 'Enter valid quantity')
      return
    }
    try {
      const res = await fetch('/api/stock-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId: newStockTxn.materialId,
          projectId: newStockTxn.projectId || undefined,
          type: newStockTxn.type,
          deliveryQty: newStockTxn.quantity,
          price: newStockTxn.price === '' ? undefined : newStockTxn.price,
          department: newStockTxn.department || undefined,
          date: newStockTxn.date,
          notes: newStockTxn.notes,
          reference: newStockTxn.reference
        })
      })
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم تسجيل الحركة' : 'Transaction recorded')
        setAddStockTxnOpen(false)
        setNewStockTxn({
          materialId: '', type: 'delivery', quantity: 0, price: '', department: '',
          date: new Date().toISOString().split('T')[0], notes: '', reference: '', projectId: ''
        })
        setStockTxnMaterialSearch('')
        fetchStockTransactions()
        fetchMaterials()
      } else {
        const errData = await res.json().catch(() => ({}))
        toast.error(errData.error || t.msg_error)
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // حذف حركة مخزون
  const handleDeleteStockTxn = async (id: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه الحركة؟ سيتم عكس تأثيرها على الرصيد.' : 'Delete this transaction? Stock balance will be reversed.')) return
    try {
      const res = await fetch(`/api/stock-transactions?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم حذف الحركة' : 'Transaction deleted')
        fetchStockTransactions()
        fetchMaterials()
      } else {
        const errData = await res.json().catch(() => ({}))
        toast.error(errData.error || t.msg_error)
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  // تحميل حركات المخزون عند فتح التبويب
  useEffect(() => {
    if (activeTab === 'stock') {
      fetchStockTransactions()
    }
  }, [activeTab, fetchStockTransactions])

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

      // جلب الوحدات
      fetchUnits()

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
        // فتح قسم المواد المستعملة تلقائياً لأول مشروع يحتوي على مواد مستعملة
        // حتى يراها المستخدم مباشرة دون الحاجة للنقر
        const firstProjectWithUsed = projectIds.find((pid: string) => (newUsedMap[pid] || []).length > 0)
        if (firstProjectWithUsed) {
          setExpandedUsedMaterials(firstProjectWithUsed)
        }
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

  // ============= دوال الوحدات =============
  const fetchUnits = useCallback(async () => {
    try {
      const res = await fetch('/api/units')
      if (res.ok) {
        const data = await res.json()
        setUnits(Array.isArray(data) ? data : [])
      } else {
        // إذا فشل الجلب (مثلاً الجدول لم يُهاجر بعد) نضع قائمة فارغة بدون خطأ
        setUnits([])
      }
    } catch (error) {
      console.error('Error fetching units:', error)
      setUnits([])
    }
  }, [])

  // رفع صورة للوحدة (رئيسية أو فرعية)
  const handleUploadUnitImage = async (file: File, type: 'main' | 'sub'): Promise<string | null> => {
    try {
      setUploadingUnitImage(true)
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/units/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || (language === 'ar' ? 'فشل رفع الصورة' : 'Failed to upload image'))
        return null
      }
      const data = await res.json()
      return data.url as string
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error(language === 'ar' ? 'فشل رفع الصورة' : 'Failed to upload image')
      return null
    } finally {
      setUploadingUnitImage(false)
    }
  }

  // اختيار الصورة الرئيسية للوحدة الجديدة
  const onPickNewUnitMainImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await handleUploadUnitImage(file, 'main')
    if (url) setNewUnit(prev => ({ ...prev, mainImage: url }))
    e.target.value = ''
  }

  // إضافة صورة فرعية للوحدة الجديدة
  const onPickNewUnitSubImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const uploaded: string[] = []
    for (const file of files) {
      const url = await handleUploadUnitImage(file, 'sub')
      if (url) uploaded.push(url)
    }
    if (uploaded.length > 0) {
      setNewUnit(prev => ({ ...prev, subImages: [...prev.subImages, ...uploaded] }))
    }
    e.target.value = ''
  }

  // اختيار الصورة الرئيسية للوحدة المُحرّرة
  const onPickEditingUnitMainImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editingUnit) return
    const url = await handleUploadUnitImage(file, 'main')
    if (url) setEditingUnit(prev => prev ? { ...prev, mainImage: url } : prev)
    e.target.value = ''
  }

  // إضافة صورة فرعية للوحدة المُحرّرة
  const onPickEditingUnitSubImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0 || !editingUnit) return
    const uploaded: string[] = []
    for (const file of files) {
      const url = await handleUploadUnitImage(file, 'sub')
      if (url) uploaded.push(url)
    }
    if (uploaded.length > 0) {
      setEditingUnit(prev => prev ? { ...prev, subImages: [...(prev.subImages || []), ...uploaded] } : prev)
    }
    e.target.value = ''
  }

  // إنشاء وحدة جديدة
  const handleAddUnit = async () => {
    if (!newUnit.projectId) {
      toast.error(language === 'ar' ? 'الرجاء اختيار المشروع' : 'Please select a project')
      return
    }
    if (!newUnit.name.trim()) {
      toast.error(language === 'ar' ? 'الرجاء إدخال اسم الوحدة' : 'Please enter unit name')
      return
    }
    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: newUnit.projectId,
          name: newUnit.name.trim(),
          nameAr: newUnit.nameAr.trim() || undefined,
          description: newUnit.description.trim() || undefined,
          mainImage: newUnit.mainImage,
          subImages: newUnit.subImages
        })
      })
      if (res.ok) {
        toast.success(language === 'ar' ? 'تمت إضافة الوحدة بنجاح' : 'Unit added successfully')
        setAddUnitOpen(false)
        setNewUnit({ projectId: '', name: '', nameAr: '', description: '', mainImage: null, subImages: [] })
        fetchUnits()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || (language === 'ar' ? 'فشل إضافة الوحدة' : 'Failed to add unit'))
      }
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل إضافة الوحدة' : 'Failed to add unit')
    }
  }

  // تعديل وحدة
  const handleEditUnit = async () => {
    if (!editingUnit) return
    if (!editingUnit.name.trim()) {
      toast.error(language === 'ar' ? 'الرجاء إدخال اسم الوحدة' : 'Please enter unit name')
      return
    }
    try {
      const res = await fetch('/api/units', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUnit.id,
          name: editingUnit.name.trim(),
          nameAr: editingUnit.nameAr?.trim() || null,
          description: editingUnit.description?.trim() || null,
          status: editingUnit.status,
          mainImage: editingUnit.mainImage || null,
          subImages: editingUnit.subImages || []
        })
      })
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم تحديث الوحدة بنجاح' : 'Unit updated successfully')
        setEditUnitOpen(false)
        setEditingUnit(null)
        fetchUnits()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || (language === 'ar' ? 'فشل تحديث الوحدة' : 'Failed to update unit'))
      }
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل تحديث الوحدة' : 'Failed to update unit')
    }
  }

  // حذف وحدة
  const handleDeleteUnit = async (id: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه الوحدة؟ سيتم فك ارتباط العناصر بها (لن تُحذف العناصر).' : 'Are you sure? Items will be unlinked, not deleted.')) return
    try {
      const res = await fetch(`/api/units?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم حذف الوحدة' : 'Unit deleted')
        fetchUnits()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || (language === 'ar' ? 'فشل حذف الوحدة' : 'Failed to delete unit'))
      }
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل حذف الوحدة' : 'Failed to delete unit')
    }
  }

  // ربط عنصر موجود بوحدة (أو فك ارتباطه إذا unitId فارغ)
  const handleLinkItemToUnit = async () => {
    if (!linkTargetUnit || !linkItemId) {
      toast.error(language === 'ar' ? 'اختر العنصر أولاً' : 'Select an item first')
      return
    }
    try {
      const res = await fetch('/api/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: linkItemId, unitId: linkTargetUnit.id })
      })
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم ربط العنصر بالوحدة' : 'Item linked to unit')
        setLinkItemToUnitOpen(false)
        setLinkItemId('')
        setLinkTargetUnit(null)
        fetchUnits()
        fetchData()
      } else {
        toast.error(language === 'ar' ? 'فشل ربط العنصر' : 'Failed to link item')
      }
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل ربط العنصر' : 'Failed to link item')
    }
  }

  // فك ارتباط عنصر عن وحدته
  const handleUnlinkItemFromUnit = async (itemId: string) => {
    if (!confirm(language === 'ar' ? 'فك ارتباط هذا العنصر بالوحدة؟' : 'Unlink this item from its unit?')) return
    try {
      const res = await fetch('/api/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, unitId: null })
      })
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم فك الارتباط' : 'Item unlinked')
        fetchUnits()
        fetchData()
      } else {
        toast.error(language === 'ar' ? 'فشل فك الارتباط' : 'Failed to unlink')
      }
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل فك الارتباط' : 'Failed to unlink')
    }
  }

  // اسم عرض الوحدة
  const getUnitDisplayName = (unit: Unit) => {
    return (language === 'ar' ? (unit.nameAr || unit.name) : unit.name)
  }

  // اسم عرض المشروع من الوحدة
  const getUnitProjectName = (unit: Unit) => {
    const p = projects.find(p => p.id === unit.projectId)
    if (p) return getProjectDisplayName(p)
    if (unit.project) return language === 'ar' ? (unit.project.nameAr || unit.project.name) : unit.project.name
    return language === 'ar' ? 'مشروع محذوف' : 'Deleted project'
  }

  const handleAddItem = async () => {
    if (!newItem.name.trim()) {
      toast.error(t.msg_enter_name)
      return
    }

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newItem, stages: newStages, projectId: newItem.projectId || null, unitId: (newItem as any).unitId || null })
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
          projectId: editingItem.projectId,
          unitId: (editingItem as any).unitId || null
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

  // إعادة تعيين كلمة المرور من حساب الصيانة/المدير العام
  const handleResetPassword = async () => {
    if (!resetPasswordUser) return
    if (!newPasswordValue || newPasswordValue.length < 6) {
      toast.error(language === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters')
      return
    }
    setResetPasswordLoading(true)
    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetPasswordUser.id, newPassword: newPasswordValue })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || (language === 'ar' ? 'تم إعادة تعيين كلمة المرور بنجاح' : 'Password reset successfully'))
        setResetPasswordUser(null)
        setNewPasswordValue('')
        setShowNewPassword(false)
      } else {
        toast.error(data.error || (language === 'ar' ? 'فشل في إعادة تعيين كلمة المرور' : 'Failed to reset password'))
      }
    } catch (error) {
      toast.error(t.msg_error)
    } finally {
      setResetPasswordLoading(false)
    }
  }

  // عرض كلمة المرور الحالية من حساب الصيانة/المدير العام
  const handleViewPassword = async (user: {id: string, name: string, email: string, role: string}) => {
    setViewPasswordUser(user)
    setViewedPassword(null)
    setViewPasswordError(null)
    setViewPasswordOpen(true)
    setViewPasswordLoading(true)
    try {
      const res = await fetch(`/api/users/view-password?userId=${encodeURIComponent(user.id)}`, { method: 'GET' })
      const data = await res.json()
      if (res.ok) {
        setViewedPassword(data.password) // قد يكون null للمستخدمين القدامى
        if (data.password === null || data.password === undefined) {
          setViewPasswordError(language === 'ar'
            ? 'لا توجد نسخة قابلة للعرض لكلمة مرور هذا المستخدم بعد. اطلب منه تسجيل الدخول مرة واحدة، أو أعد تعيين كلمة المرور لتصبح قابلة للعرض.'
            : 'No viewable password stored yet for this user. Ask them to sign in once, or reset their password to make it viewable.')
        }
      } else {
        setViewPasswordError(data.error || (language === 'ar' ? 'فشل في عرض كلمة المرور' : 'Failed to view password'))
      }
    } catch (error) {
      setViewPasswordError(t.msg_error)
    } finally {
      setViewPasswordLoading(false)
    }
  }

  // نسخ كلمة المرور المعروضة إلى الحافظة
  const handleCopyPassword = async () => {
    if (!viewedPassword) return
    try {
      await navigator.clipboard.writeText(viewedPassword)
      toast.success(language === 'ar' ? 'تم نسخ كلمة المرور' : 'Password copied to clipboard')
    } catch {
      toast.error(language === 'ar' ? 'تعذّر النسخ' : 'Copy failed')
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
          <TabsList className="bg-white/80 backdrop-blur-sm p-1 rounded-lg shadow-sm print:hidden flex flex-wrap h-auto">
            <TabsTrigger value="projects" className="gap-2"><FolderOpen className="w-4 h-4" /> {language === 'ar' ? 'المشاريع' : 'Projects'}</TabsTrigger>
            <TabsTrigger value="units" className="gap-2"><Boxes className="w-4 h-4" /> {language === 'ar' ? 'الوحدات' : 'Units'}</TabsTrigger>
            <TabsTrigger value="materials" className="gap-2"><Box className="w-4 h-4" /> {t.nav_materials}</TabsTrigger>
            <TabsTrigger value="stock" className="gap-2"><Layers className="w-4 h-4" /> {language === 'ar' ? 'حركات المخزون' : 'Stock Moves'}</TabsTrigger>
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
                          <span className="flex items-center gap-1 text-purple-600 font-medium">
                            <Package className="w-3.5 h-3.5" />
                            {(usedMaterialsMap[project.id] || []).length} {language === 'ar' ? 'مستعملة' : 'used'}
                          </span>
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
                            <Button variant="outline" size="sm" className="gap-1 flex-1 h-8 text-xs" onClick={() => { setEditingProject(project); setEditProjectOpen(true) }}>
                              <Edit className="w-3.5 h-3.5" /> {t.btn_edit}
                            </Button>
                          )}
                          {(project.createdById === currentUser?.id || currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance' || currentUser?.role === 'executive_manager') && currentUser?.role !== 'store_keeper' && (
                            <Button variant="outline" size="sm" className="gap-1 h-8 text-xs" onClick={() => {
                              setSelectedProjectForMaterial(project.id)
                              setSelectedMaterialForProject('')
                              setNewMaterialQuantity(1)
                              setAddMaterialToProjectOpen(true)
                            }}>
                              <Plus className="w-3.5 h-3.5" /> {language === 'ar' ? 'مواد مطلوبة' : 'Materials'}
                            </Button>
                          )}
                          {(currentUser?.role === 'store_keeper' || currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance' || currentUser?.role === 'executive_manager') && (
                            <Button variant="outline" size="sm" className="gap-1 h-8 text-xs bg-purple-50 border-purple-300 text-purple-700" onClick={() => {
                              setSelectedProjectForUsedMaterial(project.id)
                              setSelectedMaterialForUsedMaterial('')
                              setNewUsedMaterialQuantity(1)
                              setNewUsedMaterialPrice('')
                              setNewUsedMaterialDepartment('')
                              setUsedMaterialNotes('')
                              setUsedMaterialSearchQuery('')
                              setAddUsedMaterialOpen(true)
                            }}>
                              <Plus className="w-3.5 h-3.5" /> {language === 'ar' ? 'مواد مستعملة' : 'Used'}
                            </Button>
                          )}
                          {((currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance' || currentUser?.role === 'executive_manager')) && (
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
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingProject(project); setEditProjectOpen(true) }}><Edit className="w-4 h-4 text-blue-500" /></Button>
                          )}
                          {(project.createdById === currentUser?.id || currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance' || currentUser?.role === 'executive_manager') && currentUser?.role !== 'store_keeper' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                              setSelectedProjectForMaterial(project.id)
                              setSelectedMaterialForProject('')
                              setNewMaterialQuantity(1)
                              setAddMaterialToProjectOpen(true)
                            }}><Box className="w-4 h-4 text-amber-600" /></Button>
                          )}
                          {(currentUser?.role === 'store_keeper' || currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance' || currentUser?.role === 'executive_manager') && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                              setSelectedProjectForUsedMaterial(project.id)
                              setSelectedMaterialForUsedMaterial('')
                              setNewUsedMaterialQuantity(1)
                              setNewUsedMaterialPrice('')
                              setNewUsedMaterialDepartment('')
                              setUsedMaterialNotes('')
                              setUsedMaterialSearchQuery('')
                              setAddUsedMaterialOpen(true)
                            }}><Box className="w-4 h-4 text-purple-600" /></Button>
                          )}
                          {((currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance' || currentUser?.role === 'executive_manager')) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteProject(project.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          )}
                        </div>
                      </div>
                      {/* المواد المستعملة - قسم قابل للطي في الـ list view */}
                      {(() => {
                        const ums = usedMaterialsMap[project.id] || []
                        const canManageUsed =
                          currentUser?.role === 'store_keeper' ||
                          currentUser?.role === 'general_manager' ||
                          currentUser?.role === 'maintenance' ||
                          currentUser?.role === 'executive_manager'
                        const totalUsedCost = ums.reduce((sum: number, um: any) =>
                          sum + ((um.material?.unitPrice ?? 0) * um.quantity), 0)
                        return (
                          <div className="border-t bg-purple-50/30">
                            <div
                              className="flex items-center justify-between cursor-pointer hover:bg-purple-50 px-4 py-2 transition-colors"
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
                              <div className="px-4 pb-3 space-y-2">
                                {ums.length > 0 ? (
                                  <>
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="bg-purple-100/50">
                                          <TableHead className="text-xs py-1">{language === 'ar' ? 'المادة' : 'Material'}</TableHead>
                                          <TableHead className="text-xs py-1">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                                          <TableHead className="text-xs py-1">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                                          <TableHead className="text-xs py-1">{language === 'ar' ? 'بواسطة' : 'By'}</TableHead>
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
                                    </Table>
                                    <div className="flex gap-2 flex-wrap">
                                      {canManageUsed && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="gap-1 text-xs bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
                                          onClick={() => {
                                            setSelectedProjectForUsedMaterial(project.id)
                                            setSelectedMaterialForUsedMaterial('')
                                            setNewUsedMaterialQuantity(1)
                                            setNewUsedMaterialPrice('')
                                            setNewUsedMaterialDepartment('')
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
                                      >
                                        <Download className="w-3 h-3" />
                                        {language === 'ar' ? 'تنزيل Excel' : 'Export Excel'}
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-center py-2 space-y-2">
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
                                          setNewUsedMaterialPrice('')
                                          setNewUsedMaterialDepartment('')
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
                            currentUser?.role === 'maintenance' ||
                            currentUser?.role === 'executive_manager'
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
                                              setNewUsedMaterialPrice('')
                                              setNewUsedMaterialDepartment('')
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
                                            setNewUsedMaterialPrice('')
                                            setNewUsedMaterialDepartment('')
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
                            <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={() => { setEditingProject(project); setEditProjectOpen(true) }}>
                              <Edit className="w-4 h-4" /> {t.btn_edit}
                            </Button>
                          )}
                          {(currentUser?.role === 'store_keeper' || currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance' || currentUser?.role === 'executive_manager') && (
                            <Button variant="outline" size="sm" className="gap-1 bg-purple-50 border-purple-300 text-purple-700" onClick={() => {
                              setSelectedProjectForUsedMaterial(project.id)
                              setSelectedMaterialForUsedMaterial('')
                              setNewUsedMaterialQuantity(1)
                              setNewUsedMaterialPrice('')
                              setNewUsedMaterialDepartment('')
                              setUsedMaterialNotes('')
                              setUsedMaterialSearchQuery('')
                              setAddUsedMaterialOpen(true)
                            }}>
                              <Plus className="w-4 h-4" /> {language === 'ar' ? 'مواد مستعملة' : 'Used'}
                            </Button>
                          )}
                          {((currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance' || currentUser?.role === 'executive_manager')) && (
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

          {/* تبويب الوحدات */}
          <TabsContent value="units" className="space-y-4">
            <div className="flex flex-col gap-3 print:hidden">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-amber-600" />
                    {language === 'ar' ? 'الوحدات' : 'Units'}
                    <Badge variant="outline" className="text-amber-700 border-amber-300">{units.length}</Badge>
                  </h2>
                </div>
                {/* فلتر حسب المشروع */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-amber-600" />
                  <Select value={unitsProjectFilter} onValueChange={setUnitsProjectFilter}>
                    <SelectTrigger className="w-[240px] h-9 text-sm">
                      <SelectValue placeholder={language === 'ar' ? 'كل المشاريع' : 'All Projects'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'ar' ? 'كل المشاريع' : 'All Projects'}</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{getProjectDisplayName(p)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {currentUser?.role !== 'store_keeper' && (
                    <Dialog open={addUnitOpen} onOpenChange={setAddUnitOpen}>
                      <DialogTrigger asChild>
                        <Button className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 h-9">
                          <Plus className="w-4 h-4" /> {language === 'ar' ? 'إضافة وحدة' : 'Add Unit'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader><DialogTitle>{language === 'ar' ? 'إضافة وحدة جديدة' : 'Add New Unit'}</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-amber-800 font-semibold">{language === 'ar' ? 'المشروع' : 'Project'} *</Label>
                            <Select
                              value={newUnit.projectId}
                              onValueChange={(val) => setNewUnit(prev => ({ ...prev, projectId: val }))}
                            >
                              <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر المشروع' : 'Select project'} /></SelectTrigger>
                              <SelectContent>
                                {projects.map(p => (
                                  <SelectItem key={p.id} value={p.id}>{getProjectDisplayName(p)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-amber-800 font-semibold">{language === 'ar' ? 'اسم الوحدة (إنجليزي)' : 'Unit Name (English)'} *</Label>
                            <Input
                              value={newUnit.name}
                              onChange={(e) => setNewUnit(prev => ({ ...prev, name: e.target.value }))}
                              placeholder={language === 'ar' ? 'مثال: Entrance Unit' : 'e.g. Entrance Unit'}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-amber-800">{language === 'ar' ? 'اسم الوحدة (عربي)' : 'Unit Name (Arabic)'}</Label>
                            <Input
                              value={newUnit.nameAr}
                              onChange={(e) => setNewUnit(prev => ({ ...prev, nameAr: e.target.value }))}
                              placeholder={language === 'ar' ? 'مثال: وحدة المدخل' : 'e.g. وحدة المدخل'}
                              dir="rtl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-amber-800">{language === 'ar' ? 'وصف الوحدة' : 'Description'}</Label>
                            <Textarea
                              value={newUnit.description}
                              onChange={(e) => setNewUnit(prev => ({ ...prev, description: e.target.value }))}
                              placeholder={language === 'ar' ? 'وصف مختصر للوحدة (اختياري)' : 'Brief description (optional)'}
                              rows={3}
                            />
                          </div>

                          {/* الصورة الرئيسية */}
                          <div className="space-y-2">
                            <Label className="text-amber-800 font-semibold flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" />
                              {language === 'ar' ? 'الصورة الرئيسية للوحدة' : 'Main Image'}
                            </Label>
                            {newUnit.mainImage ? (
                              <div className="relative group">
                                <img
                                  src={newUnit.mainImage}
                                  alt="Main"
                                  className="w-full h-44 object-cover rounded-lg border border-amber-200 cursor-pointer"
                                  onClick={() => setUnitImageViewer({ images: [newUnit.mainImage!], index: 0 })}
                                />
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="absolute top-2 right-2 h-7 w-7 p-0"
                                  onClick={() => setNewUnit(prev => ({ ...prev, mainImage: null }))}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 transition-colors">
                                <div className="flex flex-col items-center gap-1 text-amber-700">
                                  {uploadingUnitImage ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600" />
                                  ) : (
                                    <ImageIcon className="w-6 h-6" />
                                  )}
                                  <span className="text-xs">{language === 'ar' ? 'اختر صورة رئيسية' : 'Choose main image'}</span>
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={onPickNewUnitMainImage} disabled={uploadingUnitImage} />
                              </label>
                            )}
                          </div>

                          {/* الصور الفرعية */}
                          <div className="space-y-2">
                            <Label className="text-amber-800 font-semibold flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" />
                              {language === 'ar' ? 'صور فرعية إضافية' : 'Sub Images'}
                              {newUnit.subImages.length > 0 && (
                                <Badge variant="outline" className="text-xs">{newUnit.subImages.length}</Badge>
                              )}
                            </Label>
                            {newUnit.subImages.length > 0 && (
                              <div className="grid grid-cols-4 gap-2">
                                {newUnit.subImages.map((img, idx) => (
                                  <div key={idx} className="relative group">
                                    <img
                                      src={img}
                                      alt={`Sub ${idx + 1}`}
                                      className="w-full h-20 object-cover rounded-md border border-amber-200 cursor-pointer"
                                      onClick={() => setUnitImageViewer({ images: newUnit.subImages, index: idx })}
                                    />
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => setNewUnit(prev => ({ ...prev, subImages: prev.subImages.filter((_, i) => i !== idx) }))}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <label className="flex items-center justify-center w-full h-10 border border-dashed border-amber-300 rounded-md cursor-pointer hover:bg-amber-50 transition-colors text-xs text-amber-700 gap-2">
                              {uploadingUnitImage ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-600" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                              {language === 'ar' ? 'إضافة صور فرعية' : 'Add sub images'}
                              <input type="file" accept="image/*" multiple className="hidden" onChange={onPickNewUnitSubImage} disabled={uploadingUnitImage} />
                            </label>
                          </div>

                          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
                            <p className="flex items-start gap-2">
                              <Layers className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span>
                                {language === 'ar'
                                  ? 'الوحدة قسم منطقي داخل المشروع. يمكنك لاحقاً ربط العناصر الموجودة بهذه الوحدة لتنظيم العمل.'
                                  : 'A unit is a logical section within a project. You can later link existing items to this unit for organization.'}
                              </span>
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setAddUnitOpen(false)}>{t.btn_cancel}</Button>
                          <Button onClick={handleAddUnit} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                            <Plus className="w-4 h-4" /> {t.btn_save}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>

              {/* قائمة الوحدات حسب المشروع */}
              {(() => {
                // فلترة الوحدات حسب المشروع المختار
                const filteredUnits = units.filter(u =>
                  unitsProjectFilter === 'all' ? true : u.projectId === unitsProjectFilter
                )

                if (filteredUnits.length === 0) {
                  return (
                    <Card className="p-12 text-center bg-white/60 border-dashed">
                      <Boxes className="w-16 h-16 text-amber-300 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-amber-900 mb-2">
                        {language === 'ar' ? 'لا توجد وحدات' : 'No units yet'}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {language === 'ar'
                          ? 'ابدأ بإضافة وحدة جديدة لتنظيم عناصر المشروع في مجموعات منطقية.'
                          : 'Start by adding a unit to organize project items into logical groups.'}
                      </p>
                      {currentUser?.role !== 'store_keeper' && (
                        <Button onClick={() => setAddUnitOpen(true)} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                          <Plus className="w-4 h-4" /> {language === 'ar' ? 'إضافة أول وحدة' : 'Add First Unit'}
                        </Button>
                      )}
                    </Card>
                  )
                }

                // تجميع الوحدات حسب المشروع
                const unitsByProject = new Map<string, Unit[]>()
                filteredUnits.forEach(u => {
                  const list = unitsByProject.get(u.projectId) || []
                  list.push(u)
                  unitsByProject.set(u.projectId, list)
                })

                return (
                  <div className="space-y-6">
                    {Array.from(unitsByProject.entries()).map(([projectId, projectUnits]) => {
                      const project = projects.find(p => p.id === projectId)
                      if (!project) return null
                      const projectItems = items.filter(i => i.projectId === projectId)
                      const itemsWithoutUnit = projectItems.filter(i => !i.unitId)

                      return (
                        <Card key={projectId} className="overflow-hidden border-amber-200">
                          {/* رأس المشروع */}
                          <div className="bg-gradient-to-l from-amber-100 to-orange-50 px-4 py-3 border-b border-amber-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold shadow-sm">
                                {getProjectInitial(project)}
                              </div>
                              <div>
                                <h3 className="font-bold text-amber-900">{getProjectDisplayName(project)}</h3>
                                <p className="text-xs text-amber-700">
                                  {project.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{project.location}</span>}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="border-amber-300 text-amber-700">
                                <Boxes className="w-3 h-3 ml-1" />
                                {language === 'ar' ? `${projectUnits.length} وحدة` : `${projectUnits.length} units`}
                              </Badge>
                              <Badge variant="outline" className="border-gray-300 text-gray-700">
                                <Package className="w-3 h-3 ml-1" />
                                {language === 'ar' ? `${projectItems.length} عنصر` : `${projectItems.length} items`}
                              </Badge>
                            </div>
                          </div>

                          <CardContent className="p-4 space-y-3">
                            {/* قائمة الوحدات داخل هذا المشروع */}
                            {projectUnits.map(unit => {
                              const unitItems = unit.items || items.filter(i => i.unitId === unit.id)
                              const isExpanded = expandedUnits[unit.id] ?? false
                              const completedItems = unitItems.filter(i => i.status === 'completed').length
                              const unitProgress = unitItems.length > 0 ? Math.round((completedItems / unitItems.length) * 100) : 0

                              return (
                                <div key={unit.id} className="rounded-lg border border-amber-200 overflow-hidden bg-white">
                                  {/* رأس الوحدة */}
                                  <button
                                    type="button"
                                    onClick={() => setExpandedUnits(prev => ({ ...prev, [unit.id]: !isExpanded }))}
                                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-50 transition-colors text-right"
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      {/* الصورة الرئيسية أو الأيقونة */}
                                      {unit.mainImage ? (
                                        <div
                                          className="w-12 h-12 rounded-lg overflow-hidden border border-amber-200 flex-shrink-0 cursor-pointer relative group"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            const allImgs = [unit.mainImage!, ...(unit.subImages || [])]
                                            setUnitImageViewer({ images: allImgs, index: 0 })
                                          }}
                                        >
                                          <img src={unit.mainImage} alt={getUnitDisplayName(unit)} className="w-full h-full object-cover" />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </div>
                                        </div>
                                      ) : (
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0 ${
                                          unit.status === 'active' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                                          unit.status === 'completed' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                                          'bg-gradient-to-br from-gray-400 to-gray-500'
                                        }`}>
                                          <Layers className="w-4 h-4" />
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-bold text-amber-900 truncate">{getUnitDisplayName(unit)}</span>
                                          {unit.status === 'completed' && (
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                                              {language === 'ar' ? 'مكتملة' : 'Completed'}
                                            </Badge>
                                          )}
                                          {unit.status === 'cancelled' && (
                                            <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 text-xs">
                                              {language === 'ar' ? 'ملغاة' : 'Cancelled'}
                                            </Badge>
                                          )}
                                          {unit.mainImage && (unit.subImages?.length || 0) > 0 && (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs gap-1">
                                              <ImageIcon className="w-3 h-3" />
                                              {1 + (unit.subImages?.length || 0)}
                                            </Badge>
                                          )}
                                          {!unit.mainImage && (unit.subImages?.length || 0) > 0 && (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs gap-1">
                                              <ImageIcon className="w-3 h-3" />
                                              {unit.subImages?.length}
                                            </Badge>
                                          )}
                                        </div>
                                        {unit.description && (
                                          <p className="text-xs text-gray-500 truncate">{unit.description}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                      <div className="hidden sm:flex flex-col items-end">
                                        <div className="flex items-center gap-2 text-xs">
                                          <Package className="w-3 h-3 text-amber-600" />
                                          <span className="font-semibold text-amber-700">{unitItems.length}</span>
                                          <span className="text-gray-400">/</span>
                                          <span className="text-gray-500">{language === 'ar' ? 'عنصر' : 'items'}</span>
                                        </div>
                                        {unitItems.length > 0 && (
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                            <Progress value={unitProgress} className="h-1.5 w-20" />
                                            <span className="text-xs font-bold text-amber-600">{unitProgress}%</span>
                                          </div>
                                        )}
                                      </div>
                                      {isExpanded ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
                                    </div>
                                  </button>

                                  {/* محتوى الوحدة - العناصر */}
                                  {isExpanded && (
                                    <div className="border-t border-amber-100 bg-gradient-to-l from-amber-50/30 to-transparent">
                                      {/* شريط أدوات الوحدة */}
                                      <div className="px-4 py-2 flex items-center justify-between flex-wrap gap-2 bg-white/50 border-b border-amber-100">
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                          <FolderTree className="w-3.5 h-3.5 text-amber-600" />
                                          <span className="font-medium">
                                            {language === 'ar'
                                              ? `عناصر الوحدة: ${unitItems.length}`
                                              : `Unit items: ${unitItems.length}`}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {currentUser?.role !== 'store_keeper' && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                                              onClick={() => {
                                                setLinkTargetUnit(unit)
                                                setLinkItemId('')
                                                setLinkItemToUnitOpen(true)
                                              }}
                                            >
                                              <Plus className="w-3 h-3" />
                                              {language === 'ar' ? 'ربط عنصر' : 'Link Item'}
                                            </Button>
                                          )}
                                          {currentUser?.role !== 'store_keeper' && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 w-7 p-0"
                                              onClick={() => {
                                                setEditingUnit({ ...unit })
                                                setEditUnitOpen(true)
                                              }}
                                            >
                                              <Edit className="w-3.5 h-3.5 text-blue-500" />
                                            </Button>
                                          )}
                                          {(currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance' || currentUser?.role === 'executive_manager') && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 w-7 p-0"
                                              onClick={() => handleDeleteUnit(unit.id)}
                                            >
                                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>

                                      {/* معرض صور الوحدة */}
                                      {(unit.mainImage || (unit.subImages && unit.subImages.length > 0)) && (
                                        <div className="px-4 py-3 border-b border-amber-100 bg-white/40">
                                          <div className="flex items-center gap-2 mb-2">
                                            <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                                            <span className="text-xs font-semibold text-amber-800">
                                              {language === 'ar' ? 'صور الوحدة' : 'Unit Images'}
                                            </span>
                                            <Badge variant="outline" className="text-xs">
                                              {(unit.mainImage ? 1 : 0) + (unit.subImages?.length || 0)}
                                            </Badge>
                                          </div>
                                          <div className="flex gap-2 overflow-x-auto pb-1">
                                            {unit.mainImage && (
                                              <img
                                                src={unit.mainImage}
                                                alt="Main"
                                                className="w-20 h-20 object-cover rounded-md border-2 border-amber-300 cursor-pointer flex-shrink-0 hover:opacity-90 transition-opacity"
                                                onClick={() => {
                                                  const allImgs = [unit.mainImage!, ...(unit.subImages || [])]
                                                  setUnitImageViewer({ images: allImgs, index: 0 })
                                                }}
                                              />
                                            )}
                                            {unit.subImages?.map((img, idx) => (
                                              <img
                                                key={idx}
                                                src={img}
                                                alt={`Sub ${idx + 1}`}
                                                className="w-20 h-20 object-cover rounded-md border border-amber-200 cursor-pointer flex-shrink-0 hover:opacity-90 transition-opacity"
                                                onClick={() => {
                                                  const allImgs = [unit.mainImage!, ...(unit.subImages || [])]
                                                  const startIdx = unit.mainImage ? 1 + idx : idx
                                                  setUnitImageViewer({ images: allImgs, index: startIdx })
                                                }}
                                              />
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* قائمة العناصر */}
                                      <div className="p-3">
                                        {unitItems.length === 0 ? (
                                          <div className="text-center py-8 text-gray-400">
                                            <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                            <p className="text-sm">
                                              {language === 'ar'
                                                ? 'لا توجد عناصر في هذه الوحدة بعد.'
                                                : 'No items in this unit yet.'}
                                            </p>
                                            {currentUser?.role !== 'store_keeper' && (
                                              <p className="text-xs mt-1 text-amber-600">
                                                {language === 'ar' ? 'انقر على "ربط عنصر" لإضافة عناصر موجودة.' : 'Click "Link Item" to add existing items.'}
                                              </p>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {unitItems.map(item => {
                                              const itemProgress = item.stages?.length > 0
                                                ? Math.round((item.stages.filter(s => s.status === 'completed').length / item.stages.length) * 100)
                                                : 0
                                              return (
                                                <div key={item.id} className="rounded-md border border-amber-100 bg-white p-3 hover:shadow-sm transition-shadow">
                                                  <div className="flex items-start gap-2 mb-2">
                                                    <div className="flex-shrink-0">
                                                      {item.image ? (
                                                        <img src={item.image} alt={item.name} className="w-10 h-10 rounded-md object-cover" />
                                                      ) : (
                                                        <div className="w-10 h-10 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                                                          {item.name.charAt(0)}
                                                        </div>
                                                      )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                      <h4 className="text-sm font-semibold text-amber-900 truncate">{item.name}</h4>
                                                      <div className="flex items-center gap-1.5 mt-0.5">
                                                        <Badge className={`text-[10px] px-1.5 py-0 ${getStatusColor(item.status)}`}>
                                                          {getStatusLabel(item.status)}
                                                        </Badge>
                                                        <span className="text-xs text-gray-400">×{item.totalQuantity}</span>
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <Progress value={itemProgress} className="h-1 flex-1" />
                                                    <span className="text-xs font-bold text-amber-600">{itemProgress}%</span>
                                                  </div>
                                                  <div className="flex items-center justify-between mt-2">
                                                    <span className="text-[10px] text-gray-400">
                                                      {item.stages?.filter(s => s.status === 'completed').length || 0}/{item.stages?.length || 0} {language === 'ar' ? 'مرحلة' : 'stages'}
                                                    </span>
                                                    {currentUser?.role !== 'store_keeper' && (
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2 text-[10px] text-gray-500 hover:text-red-600"
                                                        onClick={() => handleUnlinkItemFromUnit(item.id)}
                                                        title={language === 'ar' ? 'فك الارتباط بالوحدة' : 'Unlink from unit'}
                                                      >
                                                        <X className="w-3 h-3" />
                                                      </Button>
                                                    )}
                                                  </div>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}

                            {/* قسم العناصر بدون وحدة في هذا المشروع */}
                            {itemsWithoutUnit.length > 0 && (
                              <div className="mt-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                  <Package className="w-4 h-4 text-gray-400" />
                                  <span className="font-medium">
                                    {language === 'ar'
                                      ? `عناصر بدون وحدة (${itemsWithoutUnit.length})`
                                      : `Items without unit (${itemsWithoutUnit.length})`}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {itemsWithoutUnit.slice(0, 12).map(item => (
                                    <Badge key={item.id} variant="outline" className="text-xs bg-white border-gray-200 text-gray-600">
                                      {item.name}
                                      {item.totalQuantity > 1 && <span className="text-gray-400 ml-1">×{item.totalQuantity}</span>}
                                    </Badge>
                                  ))}
                                  {itemsWithoutUnit.length > 12 && (
                                    <Badge variant="outline" className="text-xs bg-gray-100">
                                      +{itemsWithoutUnit.length - 12}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )
              })()}
            </div>

            {/* نافذة تعديل الوحدة */}
            <Dialog open={editUnitOpen} onOpenChange={setEditUnitOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{language === 'ar' ? 'تعديل الوحدة' : 'Edit Unit'}</DialogTitle></DialogHeader>
                {editingUnit && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-amber-800 font-semibold">{language === 'ar' ? 'المشروع' : 'Project'}</Label>
                      <Input value={getUnitProjectName(editingUnit)} disabled className="bg-gray-50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-amber-800 font-semibold">{language === 'ar' ? 'اسم الوحدة (إنجليزي)' : 'Unit Name (English)'}</Label>
                      <Input
                        value={editingUnit.name}
                        onChange={(e) => setEditingUnit(prev => prev ? { ...prev, name: e.target.value } : prev)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-amber-800">{language === 'ar' ? 'اسم الوحدة (عربي)' : 'Unit Name (Arabic)'}</Label>
                      <Input
                        value={editingUnit.nameAr || ''}
                        onChange={(e) => setEditingUnit(prev => prev ? { ...prev, nameAr: e.target.value } : prev)}
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-amber-800">{language === 'ar' ? 'وصف الوحدة' : 'Description'}</Label>
                      <Textarea
                        value={editingUnit.description || ''}
                        onChange={(e) => setEditingUnit(prev => prev ? { ...prev, description: e.target.value } : prev)}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-amber-800">{language === 'ar' ? 'حالة الوحدة' : 'Unit Status'}</Label>
                      <Select
                        value={editingUnit.status as string}
                        onValueChange={(val) => setEditingUnit(prev => prev ? { ...prev, status: val } : prev)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">{language === 'ar' ? 'نشطة' : 'Active'}</SelectItem>
                          <SelectItem value="completed">{language === 'ar' ? 'مكتملة' : 'Completed'}</SelectItem>
                          <SelectItem value="cancelled">{language === 'ar' ? 'ملغاة' : 'Cancelled'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* الصورة الرئيسية */}
                    <div className="space-y-2">
                      <Label className="text-amber-800 font-semibold flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        {language === 'ar' ? 'الصورة الرئيسية للوحدة' : 'Main Image'}
                      </Label>
                      {editingUnit.mainImage ? (
                        <div className="relative group">
                          <img
                            src={editingUnit.mainImage}
                            alt="Main"
                            className="w-full h-44 object-cover rounded-lg border border-amber-200 cursor-pointer"
                            onClick={() => setUnitImageViewer({ images: [editingUnit.mainImage!], index: 0 })}
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-2 right-2 h-7 w-7 p-0"
                            onClick={() => setEditingUnit(prev => prev ? { ...prev, mainImage: null } : prev)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 transition-colors">
                          <div className="flex flex-col items-center gap-1 text-amber-700">
                            {uploadingUnitImage ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600" />
                            ) : (
                              <ImageIcon className="w-6 h-6" />
                            )}
                            <span className="text-xs">{language === 'ar' ? 'اختر صورة رئيسية' : 'Choose main image'}</span>
                          </div>
                          <input type="file" accept="image/*" className="hidden" onChange={onPickEditingUnitMainImage} disabled={uploadingUnitImage} />
                        </label>
                      )}
                    </div>

                    {/* الصور الفرعية */}
                    <div className="space-y-2">
                      <Label className="text-amber-800 font-semibold flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        {language === 'ar' ? 'صور فرعية إضافية' : 'Sub Images'}
                        {(editingUnit.subImages?.length || 0) > 0 && (
                          <Badge variant="outline" className="text-xs">{editingUnit.subImages!.length}</Badge>
                        )}
                      </Label>
                      {(editingUnit.subImages?.length || 0) > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {editingUnit.subImages!.map((img, idx) => (
                            <div key={idx} className="relative group">
                              <img
                                src={img}
                                alt={`Sub ${idx + 1}`}
                                className="w-full h-20 object-cover rounded-md border border-amber-200 cursor-pointer"
                                onClick={() => setUnitImageViewer({ images: editingUnit.subImages!, index: idx })}
                              />
                              <Button
                                size="sm"
                                variant="destructive"
                                className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setEditingUnit(prev => prev ? { ...prev, subImages: (prev.subImages || []).filter((_, i) => i !== idx) } : prev)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <label className="flex items-center justify-center w-full h-10 border border-dashed border-amber-300 rounded-md cursor-pointer hover:bg-amber-50 transition-colors text-xs text-amber-700 gap-2">
                        {uploadingUnitImage ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-600" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        {language === 'ar' ? 'إضافة صور فرعية' : 'Add sub images'}
                        <input type="file" accept="image/*" multiple className="hidden" onChange={onPickEditingUnitSubImage} disabled={uploadingUnitImage} />
                      </label>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditUnitOpen(false)}>{t.btn_cancel}</Button>
                  <Button onClick={handleEditUnit} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                    <Edit className="w-4 h-4" /> {language === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* نافذة ربط عنصر بالوحدة */}
            <Dialog open={linkItemToUnitOpen} onOpenChange={setLinkItemToUnitOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {language === 'ar' ? 'ربط عنصر بالوحدة' : 'Link Item to Unit'}
                  </DialogTitle>
                </DialogHeader>
                {linkTargetUnit && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
                      <p className="text-amber-800">
                        <span className="font-semibold">{language === 'ar' ? 'الوحدة:' : 'Unit:'}</span>{' '}
                        {getUnitDisplayName(linkTargetUnit)}
                      </p>
                      <p className="text-amber-700 text-xs mt-1">
                        <span className="font-semibold">{language === 'ar' ? 'المشروع:' : 'Project:'}</span>{' '}
                        {getUnitProjectName(linkTargetUnit)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-amber-800 font-semibold">
                        {language === 'ar' ? 'اختر عنصراً لربطه' : 'Select an item to link'}
                      </Label>
                      <Input
                        type="text"
                        placeholder={language === 'ar' ? 'بحث عن عنصر...' : 'Search items...'}
                        value={unitItemSearchQuery}
                        onChange={(e) => setUnitItemSearchQuery(e.target.value)}
                        className="mb-2"
                      />
                      <div className="max-h-72 overflow-y-auto border border-amber-200 rounded-md divide-y divide-amber-100">
                        {items
                          .filter(i => i.projectId === linkTargetUnit.projectId)
                          .filter(i => !i.unitId || i.unitId !== linkTargetUnit.id)
                          .filter(i => !unitItemSearchQuery.trim() || i.name.toLowerCase().includes(unitItemSearchQuery.toLowerCase()))
                          .map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setLinkItemId(item.id)}
                              className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-amber-50 transition-colors text-right ${
                                linkItemId === item.id ? 'bg-amber-100 ring-1 ring-amber-300' : ''
                              }`}
                            >
                              <div className="flex-shrink-0">
                                {item.image ? (
                                  <img src={item.image} alt={item.name} className="w-8 h-8 rounded-md object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                                    {item.name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-amber-900 truncate">{item.name}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                                  <Badge className={`text-[10px] px-1.5 py-0 ${getStatusColor(item.status)}`}>
                                    {getStatusLabel(item.status)}
                                  </Badge>
                                  <span>×{item.totalQuantity}</span>
                                  {item.unitId && item.unitId !== linkTargetUnit.id && (
                                    <span className="text-blue-600">↪ {language === 'ar' ? 'مرتبطة بوحدة أخرى' : 'Linked to another unit'}</span>
                                  )}
                                </p>
                              </div>
                              {linkItemId === item.id && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
                            </button>
                          ))}
                        {items
                          .filter(i => i.projectId === linkTargetUnit.projectId)
                          .filter(i => !i.unitId || i.unitId !== linkTargetUnit.id)
                          .filter(i => !unitItemSearchQuery.trim() || i.name.toLowerCase().includes(unitItemSearchQuery.toLowerCase()))
                          .length === 0 && (
                          <div className="p-4 text-center text-sm text-gray-400">
                            {language === 'ar' ? 'لا توجد عناصر متاحة في هذا المشروع' : 'No items available in this project'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setLinkItemToUnitOpen(false)}>{t.btn_cancel}</Button>
                  <Button
                    onClick={handleLinkItemToUnit}
                    disabled={!linkItemId}
                    className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                  >
                    <Plus className="w-4 h-4" />
                    {language === 'ar' ? 'ربط العنصر' : 'Link Item'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* تبويب المواد الأولية */}
          <MaterialsTab projects={projects} language={language} t={t} isRTL={isRTL} currentUser={currentUser} />

          {/* تبويب حركات المخزون - على نمط ملف STOCK DETAILS */}
          <TabsContent value="stock" className="space-y-4">
            <div className="flex flex-col gap-3 print:hidden">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-amber-600" />
                    {language === 'ar' ? 'حركات المخزون' : 'Stock Transactions'}
                    <Badge variant="outline" className="text-amber-700 border-amber-300">{stockTransactions.length}</Badge>
                  </h2>
                </div>
                {(currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance' || currentUser?.role === 'store_keeper') && (
                  <Dialog open={addStockTxnOpen} onOpenChange={setAddStockTxnOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 h-9">
                        <Plus className="w-4 h-4" /> {language === 'ar' ? 'تسجيل حركة' : 'Record Transaction'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader><DialogTitle>{language === 'ar' ? 'تسجيل حركة مخزون' : 'Record Stock Transaction'}</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>{language === 'ar' ? 'المادة' : 'Material'} *</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input value={stockTxnMaterialSearch} onChange={(e) => { setStockTxnMaterialSearch(e.target.value); setNewStockTxn(prev => ({ ...prev, materialId: '' })) }} placeholder={language === 'ar' ? 'ابحث عن المادة بالاسم أو الكود...' : 'Search by name or code...'} className="pl-9" />
                          </div>
                          <div className="border rounded-lg max-h-40 overflow-y-auto">
                            {materials.filter(m => {
                              if (!stockTxnMaterialSearch.trim()) return true
                              const q = stockTxnMaterialSearch.trim().toLowerCase()
                              return m.name.toLowerCase().includes(q) || (m.nameAr || '').toLowerCase().includes(q) || (m.itemCode || '').toLowerCase().includes(q)
                            }).slice(0, 50).map(m => (
                              <div key={m.id} onClick={() => { setNewStockTxn(prev => ({ ...prev, materialId: m.id, price: m.unitPrice, department: m.department || '' })); setStockTxnMaterialSearch(`${m.nameAr || m.name} ${m.itemCode ? `[${m.itemCode}]` : ''}`) }}
                                className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-amber-50 transition-colors ${newStockTxn.materialId === m.id ? 'bg-amber-100 border-r-2 border-amber-500' : ''}`}>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{m.name}</span>
                                    {m.itemCode && <code className="text-[10px] bg-amber-50 text-amber-800 px-1 py-0.5 rounded font-mono">{m.itemCode}</code>}
                                  </div>
                                  <span className="text-xs text-gray-500">المخزون: {m.stockQuantity} {m.unit} • {m.unitPrice} ر.ق</span>
                                </div>
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{m.unit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{language === 'ar' ? 'نوع الحركة' : 'Type'} *</Label>
                            <Select value={newStockTxn.type} onValueChange={(val) => setNewStockTxn(prev => ({ ...prev, type: val }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="delivery">{language === 'ar' ? 'وارد (شراء/استلام)' : 'Delivery (In)'}</SelectItem>
                                <SelectItem value="opening">{language === 'ar' ? 'رصيد افتتاحي' : 'Opening Balance'}</SelectItem>
                                <SelectItem value="return">{language === 'ar' ? 'إرجاع' : 'Return'}</SelectItem>
                                <SelectItem value="adjustment">{language === 'ar' ? 'تسوية (+/-)' : 'Adjustment (+/-)'}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>{language === 'ar' ? 'التاريخ' : 'Date'}</Label>
                            <Input type="date" value={newStockTxn.date} onChange={(e) => setNewStockTxn(prev => ({ ...prev, date: e.target.value }))} />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>{language === 'ar' ? 'الكمية' : 'Quantity'} *</Label>
                            <Input type="number" step="0.01" min="0.01" value={newStockTxn.quantity} onChange={(e) => setNewStockTxn(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>{language === 'ar' ? 'السعر' : 'Price'}</Label>
                            <Input type="number" step="0.01" min="0" value={newStockTxn.price} onChange={(e) => setNewStockTxn(prev => ({ ...prev, price: e.target.value === '' ? '' : parseFloat(e.target.value) }))} placeholder="افتراضي" />
                          </div>
                          <div className="space-y-2">
                            <Label>{language === 'ar' ? 'القسم' : 'Department'}</Label>
                            <Select value={newStockTxn.department} onValueChange={(val) => setNewStockTxn(prev => ({ ...prev, department: val }))}>
                              <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'افتراضي' : 'Default'} /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CARPENTER">{t.cat_carpenter}</SelectItem>
                                <SelectItem value="PAINTER">{t.cat_painter}</SelectItem>
                                <SelectItem value="STEEL FABRICATION">{t.cat_steel}</SelectItem>
                                <SelectItem value="FOAM AND DESIGN WORK">{t.cat_foam}</SelectItem>
                                <SelectItem value="TAILOR WORK">{t.cat_tailor}</SelectItem>
                                <SelectItem value="GENERAL WORK">{t.cat_general}</SelectItem>
                                <SelectItem value="PARKE">{language === 'ar' ? 'باركيه' : 'Parke'}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>{language === 'ar' ? 'المشروع المرتبط (اختياري)' : 'Related Project (optional)'}</Label>
                          <Select value={newStockTxn.projectId} onValueChange={(val) => setNewStockTxn(prev => ({ ...prev, projectId: val }))}>
                            <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'بدون مشروع' : 'No project'} /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">{language === 'ar' ? 'بدون مشروع' : 'No project'}</SelectItem>
                              {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.nameAr || p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{language === 'ar' ? 'مرجع (فاتورة/إشعار)' : 'Reference'}</Label>
                            <Input value={newStockTxn.reference} onChange={(e) => setNewStockTxn(prev => ({ ...prev, reference: e.target.value }))} placeholder="INV-001" />
                          </div>
                          <div className="space-y-2">
                            <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                            <Input value={newStockTxn.notes} onChange={(e) => setNewStockTxn(prev => ({ ...prev, notes: e.target.value }))} />
                          </div>
                        </div>
                        {newStockTxn.materialId && (() => {
                          const m = materials.find(x => x.id === newStockTxn.materialId)
                          if (!m) return null
                          const qty = newStockTxn.quantity || 0
                          const price = newStockTxn.price === '' ? (m.unitPrice || 0) : newStockTxn.price
                          const total = qty * price
                          let signedQty = qty
                          if (newStockTxn.type === 'delivery' || newStockTxn.type === 'opening' || newStockTxn.type === 'return') signedQty = Math.abs(qty)
                          const newStock = Math.max(0, (m.stockQuantity || 0) + signedQty)
                          return (
                            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs space-y-1">
                              <div className="flex justify-between"><span className="text-gray-600">{language === 'ar' ? 'الإجمالي:' : 'Total:'}</span><span className="font-bold text-amber-700">{total.toFixed(2)} ر.ق</span></div>
                              <div className="flex justify-between"><span className="text-gray-600">{language === 'ar' ? 'الرصيد بعد الحركة:' : 'Balance after:'}</span><span className="font-bold text-amber-700">{newStock} {m.unit}</span></div>
                            </div>
                          )
                        })()}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddStockTxnOpen(false)}>{t.btn_cancel}</Button>
                        <Button onClick={handleAddStockTxn} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">{t.btn_save}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {/* فلاتر */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input value={stockTxnSearch} onChange={(e) => setStockTxnSearch(e.target.value)} placeholder={language === 'ar' ? 'بحث (كود/وصف/ملاحظات)...' : 'Search (code/desc/notes)...'} className="pl-9" />
                </div>
                <Select value={stockTxnTypeFilter} onValueChange={setStockTxnTypeFilter}>
                  <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder={language === 'ar' ? 'كل الأنواع' : 'All Types'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{language === 'ar' ? 'كل الأنواع' : 'All Types'}</SelectItem>
                    <SelectItem value="delivery">{language === 'ar' ? 'وارد' : 'Delivery'}</SelectItem>
                    <SelectItem value="usage">{language === 'ar' ? 'استخدام' : 'Usage'}</SelectItem>
                    <SelectItem value="opening">{language === 'ar' ? 'افتتاحي' : 'Opening'}</SelectItem>
                    <SelectItem value="return">{language === 'ar' ? 'إرجاع' : 'Return'}</SelectItem>
                    <SelectItem value="adjustment">{language === 'ar' ? 'تسوية' : 'Adjustment'}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={stockTxnDeptFilter} onValueChange={setStockTxnDeptFilter}>
                  <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder={language === 'ar' ? 'كل الأقسام' : 'All Depts'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{language === 'ar' ? 'كل الأقسام' : 'All Departments'}</SelectItem>
                    <SelectItem value="CARPENTER">{t.cat_carpenter}</SelectItem>
                    <SelectItem value="PAINTER">{t.cat_painter}</SelectItem>
                    <SelectItem value="STEEL FABRICATION">{t.cat_steel}</SelectItem>
                    <SelectItem value="FOAM AND DESIGN WORK">{t.cat_foam}</SelectItem>
                    <SelectItem value="TAILOR WORK">{t.cat_tailor}</SelectItem>
                    <SelectItem value="GENERAL WORK">{t.cat_general}</SelectItem>
                    <SelectItem value="PARKE">{language === 'ar' ? 'باركيه' : 'Parke'}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={stockTxnProjectFilter} onValueChange={setStockTxnProjectFilter}>
                  <SelectTrigger className="w-[200px] h-9 text-sm"><SelectValue placeholder={language === 'ar' ? 'كل المشاريع' : 'All Projects'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'كل المشاريع' : 'All Projects'}</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nameAr || p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => fetchStockTransactions()} className="h-9">
                  {language === 'ar' ? 'تحديث' : 'Refresh'}
                </Button>
              </div>
            </div>

            {/* جدول الحركات - على نمط Sheet1 في ملف STOCK DETAILS */}
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-amber-50">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead>{language === 'ar' ? 'كود المادة' : 'Item Code'}</TableHead>
                      <TableHead>{language === 'ar' ? 'وصف المادة' : 'Description'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الوحدة' : 'UOM'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'الكمية (±)' : 'Delivery'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'السعر' : 'Price'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                      <TableHead>{language === 'ar' ? 'القسم' : 'Department'}</TableHead>
                      <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'الرصيد' : 'Balance'}</TableHead>
                      <TableHead>{language === 'ar' ? 'ملاحظات' : 'Notes'}</TableHead>
                      {(currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance' || currentUser?.role === 'store_keeper') && (
                        <TableHead className="print:hidden">{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center py-12 text-gray-400">
                          <Layers className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">{language === 'ar' ? 'لا توجد حركات مخزون مسجلة بعد' : 'No stock transactions yet'}</p>
                          <p className="text-xs mt-1">{language === 'ar' ? 'ابدأ بتسجيل حركة وارد أو إضافة مادة مستعملة لمشروع' : 'Start by recording a delivery or adding a used material'}</p>
                        </TableCell>
                      </TableRow>
                    ) : stockTransactions.map((txn, idx) => {
                      const isOut = (txn.deliveryQty || 0) < 0
                      const typeLabels: Record<string, { ar: string; en: string; color: string }> = {
                        delivery: { ar: 'وارد', en: 'Delivery', color: 'bg-green-100 text-green-700' },
                        usage: { ar: 'استخدام', en: 'Usage', color: 'bg-purple-100 text-purple-700' },
                        opening: { ar: 'افتتاحي', en: 'Opening', color: 'bg-blue-100 text-blue-700' },
                        return: { ar: 'إرجاع', en: 'Return', color: 'bg-amber-100 text-amber-700' },
                        adjustment: { ar: 'تسوية', en: 'Adjustment', color: 'bg-gray-100 text-gray-700' }
                      }
                      const typeLabel = typeLabels[txn.type] || typeLabels.delivery
                      return (
                        <TableRow key={txn.id} className={isOut ? 'bg-red-50/30' : ''}>
                          <TableCell className="text-xs text-gray-500">{idx + 1}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {new Date(txn.date).toLocaleDateString('en-GB')}
                          </TableCell>
                          <TableCell>
                            {txn.itemCode ? (
                              <code className="text-xs bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-mono">{txn.itemCode}</code>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{txn.description || txn.material?.name || '—'}</div>
                            {txn.material?.nameAr && txn.material.nameAr !== '-' && (
                              <div className="text-xs text-gray-500">{txn.material.nameAr}</div>
                            )}
                            {txn.project && (
                              <div className="text-[10px] text-amber-700 mt-0.5">📁 {txn.project.nameAr || txn.project.name}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{txn.uom || txn.material?.unit || '-'}</TableCell>
                          <TableCell className={`text-right font-mono font-bold ${isOut ? 'text-red-600' : 'text-green-600'}`}>
                            {isOut ? '' : '+'}{txn.deliveryQty}
                          </TableCell>
                          <TableCell className="text-right text-xs">{(txn.price || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right text-xs font-medium">{(txn.totalPrice || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            {txn.department ? (
                              <Badge variant="outline" className="text-[10px]">{txn.department}</Badge>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${typeLabel.color}`}>{language === 'ar' ? typeLabel.ar : typeLabel.en}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold">
                            {txn.balanceAfter !== null ? txn.balanceAfter : '-'}
                          </TableCell>
                          <TableCell className="text-xs text-gray-500 max-w-[200px] truncate" title={txn.notes || ''}>
                            {txn.notes || txn.reference ? (
                              <div>
                                {txn.notes && <div>{txn.notes}</div>}
                                {txn.reference && <div className="text-[10px] text-amber-700">REF: {txn.reference}</div>}
                              </div>
                            ) : <span className="text-gray-300">—</span>}
                          </TableCell>
                          {(currentUser?.role === 'general_manager' || currentUser?.role === 'maintenance' || currentUser?.role === 'store_keeper') && (
                            <TableCell className="print:hidden">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteStockTxn(txn.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                  {stockTransactions.length > 0 && (
                    <tfoot>
                      <TableRow className="bg-amber-100 font-bold">
                        <TableCell colSpan={5}>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {stockTransactions.reduce((s, t) => s + (t.deliveryQty || 0), 0).toFixed(2)}
                        </TableCell>
                        <TableCell colSpan={1}></TableCell>
                        <TableCell className="text-right font-mono">
                          {stockTransactions.reduce((s, t) => s + (t.totalPrice || 0), 0).toFixed(2)} ر.ق
                        </TableCell>
                        <TableCell colSpan={4}></TableCell>
                      </TableRow>
                    </tfoot>
                  )}
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

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
                      <Select value={newItem.projectId || '_none'} onValueChange={(val) => setNewItem(prev => ({ ...prev, projectId: val === '_none' ? '' : val, ...(prev as any).unitId ? { unitId: '' } : {} }) as any)}>
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
                    {/* اختيار الوحدة (يظهر فقط إذا اختير مشروع) */}
                    {newItem.projectId && (
                      <div className="space-y-2">
                        <Label>{language === 'ar' ? 'الوحدة' : 'Unit'} <span className="text-xs text-gray-400">({language === 'ar' ? 'اختياري' : 'optional'})</span></Label>
                        <Select
                          value={(newItem as any).unitId || '_none'}
                          onValueChange={(val) => setNewItem(prev => ({ ...prev, unitId: val === '_none' ? '' : val }) as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'بدون وحدة' : 'No unit'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">{language === 'ar' ? 'بدون وحدة' : 'No unit'}</SelectItem>
                            {units
                              .filter(u => u.projectId === newItem.projectId)
                              .map(unit => (
                                <SelectItem key={unit.id} value={unit.id}>
                                  <span className="flex items-center gap-1">
                                    <Layers className="w-3 h-3" />
                                    {getUnitDisplayName(unit)}
                                  </span>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {units.filter(u => u.projectId === newItem.projectId).length === 0 && (
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <Boxes className="w-3 h-3" />
                            {language === 'ar' ? 'لا توجد وحدات لهذا المشروع بعد. يمكنك إنشاؤها من تبويب الوحدات.' : 'No units for this project yet. You can create them from the Units tab.'}
                          </p>
                        )}
                      </div>
                    )}
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
              {/* تنبيه أمني حول كلمات المرور */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-xs">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  {language === 'ar'
                    ? 'لكل مستخدم زران: "عرض" لرؤية كلمة المرور الحالية (مشفّرة قابلة للعكس بـ AES-256)، و"تعديل" لوضع كلمة مرور جديدة. لا يمكن عرض أو تعديل كلمات مرور الحسابات الإدارية (مدير عام / صيانة) لمنع تصعيد الصلاحيات.'
                    : 'Each user has two buttons: "View" to reveal the current password (stored with reversible AES-256 encryption), and "Edit" to set a new one. Admin account passwords (general_manager / maintenance) cannot be viewed or reset, to prevent privilege escalation.'}
                </div>
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
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-blue-700 border-blue-300 hover:bg-blue-50"
                                  onClick={() => handleViewPassword({ id: user.id, name: user.name, email: user.email, role: user.role })}
                                  disabled={user.role === 'general_manager' || user.role === 'maintenance' || user.id === currentUser?.id}
                                  title={user.role === 'general_manager' || user.role === 'maintenance'
                                    ? (language === 'ar' ? 'لا يمكن عرض كلمة مرور حساب إداري' : 'Cannot view admin password')
                                    : user.id === currentUser?.id
                                      ? (language === 'ar' ? 'لا يمكنك عرض كلمة مرورك من هنا' : 'Cannot view your own password here')
                                      : (language === 'ar' ? 'عرض كلمة المرور' : 'View Password')}
                                >
                                  <Eye className="w-4 h-4" />
                                  <span className="hidden sm:inline">{language === 'ar' ? 'عرض' : 'View'}</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
                                  onClick={() => {
                                    setResetPasswordUser({ id: user.id, name: user.name, email: user.email, role: user.role })
                                    setNewPasswordValue('')
                                    setShowNewPassword(false)
                                  }}
                                  disabled={user.role === 'general_manager' || user.role === 'maintenance'}
                                  title={user.role === 'general_manager' || user.role === 'maintenance' ? (language === 'ar' ? 'لا يمكن إعادة تعيين كلمة مرور حساب إداري' : 'Cannot reset admin password') : (language === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password')}
                                >
                                  <KeyRound className="w-4 h-4" />
                                  <span className="hidden sm:inline">{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                                </Button>
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

      {/* نافذة عرض الصورة بزوم - Lightbox */}
      {unitImageViewer && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center select-none"
          onClick={() => setUnitImageViewer(null)}
        >
          {/* أزرار التحكم */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-9 px-3"
              onClick={() => {
                const newScale = Math.max(0.5, unitImageZoom - 0.25)
                setUnitImageZoom(newScale)
              }}
              title={language === 'ar' ? 'تصغير' : 'Zoom out'}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Badge variant="outline" className="bg-white/10 border-white/20 text-white">
              {Math.round(unitImageZoom * 100)}%
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-9 px-3"
              onClick={() => {
                const newScale = Math.min(4, unitImageZoom + 0.25)
                setUnitImageZoom(newScale)
              }}
              title={language === 'ar' ? 'تكبير' : 'Zoom in'}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-9 px-3"
              onClick={() => {
                setUnitImageZoom(1)
                setUnitImageRotation(0)
              }}
              title={language === 'ar' ? 'إعادة الضبط' : 'Reset'}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-9 px-3"
              onClick={() => setUnitImageRotation((r) => (r + 90) % 360)}
              title={language === 'ar' ? 'تدوير' : 'Rotate'}
            >
              <RotateCw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-red-500/20 border-red-400/30 text-red-200 hover:bg-red-500/30 h-9 px-3"
              onClick={() => {
                setUnitImageViewer(null)
                setUnitImageZoom(1)
                setUnitImageRotation(0)
              }}
              title={language === 'ar' ? 'إغلاق' : 'Close'}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* عداد الصور */}
          {unitImageViewer.images.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10" onClick={(e) => e.stopPropagation()}>
              <Badge variant="outline" className="bg-white/10 border-white/20 text-white">
                {unitImageViewer.index + 1} / {unitImageViewer.images.length}
              </Badge>
            </div>
          )}

          {/* أسهم التنقل */}
          {unitImageViewer.images.length > 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 border-white/20 text-white hover:bg-white/20 h-12 w-12 p-0 rounded-full z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  setUnitImageViewer(prev => prev ? {
                    ...prev,
                    index: (prev.index - 1 + prev.images.length) % prev.images.length
                  } : prev)
                  setUnitImageZoom(1)
                  setUnitImageRotation(0)
                }}
                title={language === 'ar' ? 'السابق' : 'Previous'}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 border-white/20 text-white hover:bg-white/20 h-12 w-12 p-0 rounded-full z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  setUnitImageViewer(prev => prev ? {
                    ...prev,
                    index: (prev.index + 1) % prev.images.length
                  } : prev)
                  setUnitImageZoom(1)
                  setUnitImageRotation(0)
                }}
                title={language === 'ar' ? 'التالي' : 'Next'}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
            </>
          )}

          {/* الصورة - قابلة للتكبير بالعجلة */}
          <div
            className="overflow-auto max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => {
              e.preventDefault()
              const delta = e.deltaY > 0 ? -0.15 : 0.15
              const newScale = Math.max(0.5, Math.min(4, unitImageZoom + delta))
              setUnitImageZoom(newScale)
            }}
            style={{ cursor: unitImageZoom > 1 ? 'grab' : 'default' }}
          >
            <img
              src={unitImageViewer.images[unitImageViewer.index]}
              alt="Unit image"
              className="max-w-none transition-transform duration-150"
              style={{
                transform: `scale(${unitImageZoom}) rotate(${unitImageRotation}deg)`,
                transformOrigin: 'center center',
                maxWidth: unitImageZoom === 1 ? '90vw' : 'none',
                maxHeight: unitImageZoom === 1 ? '90vh' : 'none',
              }}
              draggable={false}
            />
          </div>

          {/* مصغّرات الصور في الأسفل */}
          {unitImageViewer.images.length > 1 && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 max-w-[90vw] overflow-x-auto p-2"
              onClick={(e) => e.stopPropagation()}
            >
              {unitImageViewer.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Thumb ${idx + 1}`}
                  className={`w-14 h-14 object-cover rounded cursor-pointer border-2 flex-shrink-0 transition-all ${
                    idx === unitImageViewer.index
                      ? 'border-amber-400 opacity-100 scale-105'
                      : 'border-white/20 opacity-60 hover:opacity-90'
                  }`}
                  onClick={() => {
                    setUnitImageViewer(prev => prev ? { ...prev, index: idx } : prev)
                    setUnitImageZoom(1)
                    setUnitImageRotation(0)
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* نافذة إعادة تعيين كلمة المرور - للصيانة/المدير العام فقط */}
      <Dialog open={!!resetPasswordUser} onOpenChange={(open) => { if (!open) { setResetPasswordUser(null); setNewPasswordValue(''); setShowNewPassword(false) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              {language === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
            </DialogTitle>
          </DialogHeader>
          {resetPasswordUser && (
            <div className="space-y-4">
              {/* تنبيه: كلمة المرور الجديدة ستصبح قابلة للعرض */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-900 text-xs">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  {language === 'ar'
                    ? 'سيتم حفظ كلمة المرور الجديدة (مشفرّة بـ AES-256 قابلة للعكس) ويمكن لأي مدير عام أو صيانة عرضها لاحقاً. لن يستطيع المستخدم القديم الدخول بكلمة المرور القديمة.'
                    : 'The new password will be stored (reversibly AES-256 encrypted) and any general_manager / maintenance will be able to view it later. The user will no longer be able to sign in with the old password.'}
                </div>
              </div>

              {/* معلومات المستخدم المستهدف */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="text-sm font-semibold text-amber-900">{resetPasswordUser.name}</div>
                <div dir="ltr" className="text-xs text-amber-700 text-left">{resetPasswordUser.email}</div>
              </div>

              {/* إدخال كلمة المرور الجديدة */}
              <div className="space-y-2">
                <Label className="text-amber-800 font-semibold">
                  {language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'} *
                </Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    placeholder={language === 'ar' ? '6 أحرف على الأقل' : 'At least 6 characters'}
                    className="pr-10"
                    dir="ltr"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !resetPasswordLoading) handleResetPassword() }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-amber-700"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPasswordValue && newPasswordValue.length < 6 && (
                  <p className="text-xs text-red-600">
                    {language === 'ar' ? `كلمة المرور قصيرة جداً (${newPasswordValue.length}/6)` : `Password too short (${newPasswordValue.length}/6)`}
                  </p>
                )}
              </div>

              {/* زر توليد كلمة مرور عشوائية */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  const random = Math.random().toString(36).slice(2, 10) + Math.floor(Math.random() * 90 + 10)
                  setNewPasswordValue(random)
                  setShowNewPassword(true)
                }}
              >
                {language === 'ar' ? '🎲 توليد كلمة مرور عشوائية' : '🎲 Generate random password'}
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetPasswordUser(null); setNewPasswordValue(''); setShowNewPassword(false) }} disabled={resetPasswordLoading}>
              {t.btn_cancel}
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetPasswordLoading || !newPasswordValue || newPasswordValue.length < 6}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 gap-2"
            >
              {resetPasswordLoading ? (
                <>{language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  {language === 'ar' ? 'حفظ كلمة المرور الجديدة' : 'Save New Password'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة عرض كلمة المرور - للصيانة/المدير العام فقط */}
      <Dialog open={viewPasswordOpen} onOpenChange={(open) => {
        if (!open) {
          setViewPasswordOpen(false)
          setViewPasswordUser(null)
          setViewedPassword(null)
          setViewPasswordError(null)
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              {language === 'ar' ? 'عرض كلمة المرور' : 'View Password'}
            </DialogTitle>
          </DialogHeader>
          {viewPasswordUser && (
            <div className="space-y-4">
              {/* معلومات المستخدم المستهدف */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm font-semibold text-blue-900">{viewPasswordUser.name}</div>
                <div dir="ltr" className="text-xs text-blue-700 text-left">{viewPasswordUser.email}</div>
              </div>

              {/* حالة التحميل */}
              {viewPasswordLoading && (
                <div className="flex items-center justify-center p-4 text-sm text-gray-600">
                  <div className="animate-spin ml-2 h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  {language === 'ar' ? 'جاري فك التشفير...' : 'Decrypting...'}
                </div>
              )}

              {/* عرض كلمة المرور بعد فك التشفير */}
              {!viewPasswordLoading && viewedPassword && (
                <div className="space-y-2">
                  <Label className="text-blue-800 font-semibold">
                    {language === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={viewedPassword}
                      readOnly
                      dir="ltr"
                      className="font-mono text-sm flex-1 bg-blue-50 border-blue-300"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={handleCopyPassword}
                      title={language === 'ar' ? 'نسخ' : 'Copy'}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-xs">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      {language === 'ar'
                        ? 'تم تسجيل عملية العرض في سجلات النظام للمساءلة. لا تشارك كلمة المرور إلا مع المستخدم نفسه.'
                        : 'This view operation has been logged for audit purposes. Only share the password with the user themselves.'}
                    </div>
                  </div>
                </div>
              )}

              {/* حالة عدم وجود نسخة قابلة للعرض */}
              {!viewPasswordLoading && !viewedPassword && viewPasswordError && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-xs">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>{viewPasswordError}</div>
                </div>
              )}

              {/* رسالة خطأ */}
              {!viewPasswordLoading && !viewedPassword && !viewPasswordError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-900 text-xs">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>{language === 'ar' ? 'تعذّر عرض كلمة المرور.' : 'Failed to view password.'}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setViewPasswordOpen(false)
                setViewPasswordUser(null)
                setViewedPassword(null)
                setViewPasswordError(null)
              }}
            >
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </Button>
            {viewedPassword && viewPasswordUser && (
              <Button
                className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                onClick={() => {
                  // الانتقال إلى نافذة التعديل بنفس المستخدم
                  setResetPasswordUser({ id: viewPasswordUser.id, name: viewPasswordUser.name, email: viewPasswordUser.email, role: viewPasswordUser.role })
                  setNewPasswordValue('')
                  setShowNewPassword(false)
                  setViewPasswordOpen(false)
                }}
              >
                <KeyRound className="w-4 h-4" />
                {language === 'ar' ? 'تعديل كلمة المرور' : 'Edit Password'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <Select value={editingItem.projectId || '_none'} onValueChange={(val) => setEditingItem({ ...editingItem, projectId: val === '_none' ? undefined : val, unitId: undefined } as any)}>
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
              {/* اختيار الوحدة (يظهر فقط إذا اختير مشروع) */}
              {editingItem.projectId && (
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الوحدة' : 'Unit'} <span className="text-xs text-gray-400">({language === 'ar' ? 'اختياري' : 'optional'})</span></Label>
                  <Select
                    value={(editingItem as any).unitId || '_none'}
                    onValueChange={(val) => setEditingItem({ ...editingItem, unitId: val === '_none' ? undefined : val } as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'بدون وحدة' : 'No unit'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">{language === 'ar' ? 'بدون وحدة' : 'No unit'}</SelectItem>
                      {units
                        .filter(u => u.projectId === editingItem.projectId)
                        .map(unit => (
                          <SelectItem key={unit.id} value={unit.id}>
                            <span className="flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {getUnitDisplayName(unit)}
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                  return m.name.toLowerCase().includes(q) || (m.nameAr && m.nameAr.toLowerCase().includes(q)) || (m.itemCode && m.itemCode.toLowerCase().includes(q))
                }).map(m => (
                  <div key={m.id} onClick={() => { setSelectedMaterialForUsedMaterial(m.id); setUsedMaterialSearchQuery(m.nameAr || m.name); setNewUsedMaterialPrice(m.unitPrice || 0); setNewUsedMaterialDepartment(m.department || '') }}
                    className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-purple-50 transition-colors ${selectedMaterialForUsedMaterial === m.id ? 'bg-purple-100 border-r-2 border-purple-500' : ''}`}>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{m.name}</span>
                        {m.itemCode && <code className="text-[10px] bg-amber-50 text-amber-800 px-1 py-0.5 rounded font-mono">{m.itemCode}</code>}
                      </div>
                      {m.nameAr && m.nameAr !== '-' && <span className="text-xs text-gray-500">{m.nameAr}</span>}
                      <span className="text-xs text-gray-500">المخزون: {m.stockQuantity} {m.unit} • {m.unitPrice} ر.ق</span>
                    </div>
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{m.unit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الكمية' : 'Quantity'}</Label>
                <Input type="number" step="0.01" min="0.01" value={newUsedMaterialQuantity} onChange={(e) => setNewUsedMaterialQuantity(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'السعر' : 'Price'}</Label>
                <Input type="number" step="0.01" min="0" value={newUsedMaterialPrice} onChange={(e) => setNewUsedMaterialPrice(e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="افتراضي" />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'القسم' : 'Department'}</Label>
                <Select value={newUsedMaterialDepartment} onValueChange={setNewUsedMaterialDepartment}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'افتراضي' : 'Default'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CARPENTER">{t.cat_carpenter}</SelectItem>
                    <SelectItem value="PAINTER">{t.cat_painter}</SelectItem>
                    <SelectItem value="STEEL FABRICATION">{t.cat_steel}</SelectItem>
                    <SelectItem value="FOAM AND DESIGN WORK">{t.cat_foam}</SelectItem>
                    <SelectItem value="TAILOR WORK">{t.cat_tailor}</SelectItem>
                    <SelectItem value="GENERAL WORK">{t.cat_general}</SelectItem>
                    <SelectItem value="PARKE">{language === 'ar' ? 'باركيه' : 'Parke'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Input value={usedMaterialNotes} onChange={(e) => setUsedMaterialNotes(e.target.value)} placeholder={language === 'ar' ? 'ملاحظات اختيارية' : 'Optional notes'} />
            </div>
            {selectedMaterialForUsedMaterial && (() => {
              const m = materials.find(x => x.id === selectedMaterialForUsedMaterial)
              if (!m) return null
              const qty = newUsedMaterialQuantity || 0
              const price = newUsedMaterialPrice === '' ? (m.unitPrice || 0) : newUsedMaterialPrice
              const total = qty * price
              const newStock = Math.max(0, (m.stockQuantity || 0) - qty)
              return (
                <div className="bg-purple-50 border border-purple-200 rounded-md p-3 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-gray-600">{language === 'ar' ? 'الإجمالي:' : 'Total:'}</span><span className="font-bold text-purple-700">{total.toFixed(2)} ر.ق</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">{language === 'ar' ? 'الرصيد بعد الاستخدام:' : 'Stock after:'}</span><span className={`font-bold ${newStock < (m.minStockLevel || 0) ? 'text-red-600' : 'text-green-700'}`}>{newStock} {m.unit}</span></div>
                </div>
              )
            })()}
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
