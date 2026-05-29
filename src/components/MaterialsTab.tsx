'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2, Edit, FolderOpen, Download, Upload, Search, Box, X } from 'lucide-react'
import { toast } from 'sonner'
import { translations, Language } from '@/lib/i18n'

// واجهة المشروع (نسخة محلية للـ props)
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

type Translations = typeof translations['ar']

interface MaterialsTabProps {
  projects: Project[]
  language: Language
  t: Translations
  isRTL: boolean
  currentUser?: { id: string; name: string; email: string; phone?: string; role: string } | null
}

export default function MaterialsTab({ projects, language, t, isRTL, currentUser }: MaterialsTabProps) {
  // حالات المواد الأولية
  const [materials, setMaterials] = useState<Material[]>([])
  const [projectMaterials, setProjectMaterials] = useState<ProjectMaterial[]>([])
  const [addMaterialOpen, setAddMaterialOpen] = useState(false)
  const [editMaterialOpen, setEditMaterialOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [importMaterialOpen, setImportMaterialOpen] = useState(false)
  const [materialSearch, setMaterialSearch] = useState('')
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState('')
  const [materialTypeFilter, setMaterialTypeFilter] = useState('')
  const [addMaterialToProjectOpen, setAddMaterialToProjectOpen] = useState(false)
  const [selectedProjectForMaterial, setSelectedProjectForMaterial] = useState<string>('')
  const [newMaterialQuantity, setNewMaterialQuantity] = useState(1)
  const [selectedMaterialForProject, setSelectedMaterialForProject] = useState<string>('')
  const [importingMaterials, setImportingMaterials] = useState(false)
  const [viewingProjectMaterials, setViewingProjectMaterials] = useState<string>('')

  const [newMaterial, setNewMaterial] = useState({
    name: '', nameAr: '', unit: 'PCS', unitAr: '-', category: 'CARPENTER',
    categoryAr: '-', unitPrice: 0, stockQuantity: 0, status: 'active',
    description: '', type: 'raw'
  })

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

  const fetchProjectMaterials = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/materials?projectId=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setProjectMaterials(data.projectMaterials || [])
      }
    } catch (error) {
      console.error('Error fetching project materials:', error)
    }
  }, [])

  // جلب البيانات عند التحميل
  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  const handleAddMaterial = async () => {
    if (!newMaterial.name.trim()) {
      toast.error(language === 'ar' ? 'الرجاء إدخال اسم المادة' : 'Please enter material name')
      return
    }
    try {
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaterial)
      })
      if (res.ok) {
        toast.success(t.msg_material_added)
        setAddMaterialOpen(false)
        setNewMaterial({ name: '', nameAr: '', unit: 'PCS', unitAr: '-', category: 'CARPENTER', categoryAr: '-', unitPrice: 0, stockQuantity: 0, status: 'active', description: '', type: 'raw' })
        fetchMaterials()
      } else {
        const errData = await res.json().catch(() => ({}))
        toast.error(errData.error || t.msg_error)
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  const handleEditMaterial = async () => {
    if (!editingMaterial) return
    try {
      const res = await fetch('/api/materials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingMaterial)
      })
      if (res.ok) {
        toast.success(t.msg_material_updated)
        setEditMaterialOpen(false)
        setEditingMaterial(null)
        fetchMaterials()
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm(t.msg_confirm_delete_material)) return
    try {
      const res = await fetch(`/api/materials?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(t.msg_material_deleted)
        fetchMaterials()
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  const handleImportMaterials = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportingMaterials(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', materialTypeFilter || 'raw')
      const res = await fetch('/api/materials/import', {
        method: 'POST',
        body: formData
      })
      if (res.ok) {
        const results = await res.json()
        const msg = t.msg_import_results
          .replace('{created}', String(results.created))
          .replace('{updated}', String(results.updated))
          .replace('{errors}', String(results.errors))
        toast.success(msg)
        setImportMaterialOpen(false)
        fetchMaterials()
      } else {
        toast.error(t.msg_error)
      }
    } catch (error) {
      toast.error(t.msg_error)
    } finally {
      setImportingMaterials(false)
    }
  }

  const handleExportMaterials = async () => {
    try {
      const params = new URLSearchParams()
      if (materialCategoryFilter) params.append('category', materialCategoryFilter)
      if (materialTypeFilter) params.append('type', materialTypeFilter)
      const url = `/api/materials/export${params.toString() ? '?' + params.toString() : ''}`
      const res = await fetch(url)
      if (res.ok) {
        const blob = await res.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = language === 'ar' ? 'مواد-ألوان-الخليج.xlsx' : 'gulf-colors-materials.xlsx'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(downloadUrl)
        toast.success(language === 'ar' ? 'تم تصدير المواد' : 'Materials exported')
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

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
        toast.success(t.msg_material_added_to_project)
        setAddMaterialToProjectOpen(false)
        setSelectedProjectForMaterial('')
        setSelectedMaterialForProject('')
        setNewMaterialQuantity(1)
        if (viewingProjectMaterials) {
          fetchProjectMaterials(viewingProjectMaterials)
        }
        fetchMaterials()
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  const handleRemoveMaterialFromProject = async (pmId: string) => {
    try {
      const res = await fetch('/api/materials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removeFromProject', id: pmId })
      })
      if (res.ok) {
        toast.success(t.msg_material_removed)
        if (viewingProjectMaterials) {
          fetchProjectMaterials(viewingProjectMaterials)
        }
      }
    } catch (error) {
      toast.error(t.msg_error)
    }
  }

  const getCategoryLabel = (cat: string) => {
    const catMap: Record<string, string> = {
      'CARPENTER': t.cat_carpenter,
      'PAINTER': t.cat_painter,
      'STEEL FABRICATION': t.cat_steel,
      'FOAM AND DESIGN WORK': t.cat_foam,
      'TAILOR WORK': t.cat_tailor,
      'GENERAL WORK': t.cat_general,
    }
    return catMap[cat] || cat
  }

  const getCategories = () => [...new Set(materials.map(m => m.category))].sort()

  return (
    <>
      {/* تبويب المواد الأولية */}
      <TabsContent value="materials" className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2 print:hidden">
          <h2 className="text-xl font-bold text-amber-900">{t.materials_title} ({materials.length})</h2>
          <div className="flex gap-2 flex-wrap">
            {(currentUser?.role === 'general_manager' || currentUser?.role === 'store_keeper') && (
            <Dialog open={addMaterialOpen} onOpenChange={setAddMaterialOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                  <Plus className="w-4 h-4" /> {t.btn_add_material}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{t.btn_add_material}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.material_name} *</Label>
                      <Input value={newMaterial.name} onChange={(e) => setNewMaterial(prev => ({ ...prev, name: e.target.value }))} placeholder={t.material_name_placeholder} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.material_name_ar}</Label>
                      <Input value={newMaterial.nameAr} onChange={(e) => setNewMaterial(prev => ({ ...prev, nameAr: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.material_unit}</Label>
                      <Select value={newMaterial.unit} onValueChange={(val) => setNewMaterial(prev => ({ ...prev, unit: val }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['PCS', 'Pcs', 'PKT', 'Pkt', 'SHT', 'Sht', 'BDL', 'BLOCK', 'BOX', 'BTL', 'Btl', 'DRM', 'GAL', 'Gal', 'LTR', 'NOS', 'Nos', 'PAIR', 'PAR', 'RL', 'Rol', 'SET', 'TIN'].map(u => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.material_unit_ar}</Label>
                      <Input value={newMaterial.unitAr} onChange={(e) => setNewMaterial(prev => ({ ...prev, unitAr: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.material_category}</Label>
                      <Select value={newMaterial.category} onValueChange={(val) => setNewMaterial(prev => ({ ...prev, category: val }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CARPENTER">{t.cat_carpenter}</SelectItem>
                          <SelectItem value="PAINTER">{t.cat_painter}</SelectItem>
                          <SelectItem value="STEEL FABRICATION">{t.cat_steel}</SelectItem>
                          <SelectItem value="FOAM AND DESIGN WORK">{t.cat_foam}</SelectItem>
                          <SelectItem value="TAILOR WORK">{t.cat_tailor}</SelectItem>
                          <SelectItem value="GENERAL WORK">{t.cat_general}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.material_category_ar}</Label>
                      <Input value={newMaterial.categoryAr} onChange={(e) => setNewMaterial(prev => ({ ...prev, categoryAr: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>{t.material_unit_price}</Label>
                      <Input type="number" step="0.01" min="0" value={newMaterial.unitPrice} onChange={(e) => setNewMaterial(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.material_stock}</Label>
                      <Input type="number" min="0" value={newMaterial.stockQuantity} onChange={(e) => setNewMaterial(prev => ({ ...prev, stockQuantity: parseInt(e.target.value) || 0 }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.material_type}</Label>
                      <Select value={newMaterial.type} onValueChange={(val) => setNewMaterial(prev => ({ ...prev, type: val }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="raw">{t.materials_raw}</SelectItem>
                          <SelectItem value="operational">{t.materials_operational}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.material_description}</Label>
                    <Textarea value={newMaterial.description} onChange={(e) => setNewMaterial(prev => ({ ...prev, description: e.target.value }))} rows={2} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddMaterialOpen(false)}>{t.btn_cancel}</Button>
                  <Button onClick={handleAddMaterial}>{t.btn_save}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            )}
            {(currentUser?.role === 'general_manager' || currentUser?.role === 'store_keeper') && (
            <Button variant="outline" className="gap-2 bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700" onClick={() => setImportMaterialOpen(true)}>
              <Upload className="w-4 h-4" /> {t.btn_import_excel}
            </Button>
            )}
            <Button variant="outline" className="gap-2 bg-green-50 hover:bg-green-100 border-green-300 text-green-700" onClick={handleExportMaterials}>
              <Download className="w-4 h-4" /> {t.btn_export_excel}
            </Button>
          </div>
        </div>

        {/* فلاتر البحث */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute top-2.5 right-3 w-4 h-4 text-gray-400" />
                  <Input
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    placeholder={t.search_materials}
                    className="pr-10"
                  />
                </div>
              </div>
              <Select value={materialCategoryFilter || 'all'} onValueChange={(val) => setMaterialCategoryFilter(val === 'all' ? '' : val)}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder={t.filter_category} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.materials_all}</SelectItem>
                  {getCategories().map(cat => (
                    <SelectItem key={cat} value={cat}>{getCategoryLabel(cat)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={materialTypeFilter || 'all'} onValueChange={(val) => setMaterialTypeFilter(val === 'all' ? '' : val)}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={t.filter_type} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.materials_all}</SelectItem>
                  <SelectItem value="raw">{t.materials_raw}</SelectItem>
                  <SelectItem value="operational">{t.materials_operational}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* إحصائيات المواد */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-amber-50 to-orange-100">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600">{materials.length}</div>
                <div className="text-sm text-gray-600">{language === 'ar' ? 'إجمالي المواد' : 'Total Materials'}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-100">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{materials.filter(m => m.type === 'raw').length}</div>
                <div className="text-sm text-gray-600">{t.materials_raw}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-100">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{materials.filter(m => m.type === 'operational').length}</div>
                <div className="text-sm text-gray-600">{t.materials_operational}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-violet-100">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{materials.reduce((sum, m) => sum + m.unitPrice * m.stockQuantity, 0).toFixed(0)}</div>
                <div className="text-sm text-gray-600">{t.total_cost} ({language === 'ar' ? 'ر.ق' : 'QR'})</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* جدول المواد */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t.material_name}</TableHead>
                  <TableHead>{t.material_unit}</TableHead>
                  <TableHead>{t.material_category}</TableHead>
                  <TableHead>{t.material_unit_price}</TableHead>
                  <TableHead>{t.material_stock}</TableHead>
                  <TableHead>{t.material_type}</TableHead>
                  <TableHead>{t.total_cost}</TableHead>
                  <TableHead className="print:hidden">{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials
                  .filter(m => {
                    if (materialSearch && !m.name.toLowerCase().includes(materialSearch.toLowerCase()) && !(m.nameAr || '').includes(materialSearch)) return false
                    if (materialCategoryFilter && m.category !== materialCategoryFilter) return false
                    if (materialTypeFilter && m.type !== materialTypeFilter) return false
                    return true
                  })
                  .map((material, idx) => (
                  <TableRow key={material.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{material.name}</div>
                        {material.nameAr && material.nameAr !== '-' && (
                          <div className="text-xs text-gray-500">{material.nameAr}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{material.unit}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getCategoryLabel(material.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>{material.unitPrice.toFixed(2)} {language === 'ar' ? 'ر.ق' : 'QR'}</TableCell>
                    <TableCell>{material.stockQuantity}</TableCell>
                    <TableCell>
                      <Badge className={material.type === 'raw' ? 'bg-blue-500' : 'bg-orange-500'}>
                        {material.type === 'raw' ? t.materials_raw : t.materials_operational}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{(material.unitPrice * material.stockQuantity).toFixed(2)} {language === 'ar' ? 'ر.ق' : 'QR'}</TableCell>
                    <TableCell className="print:hidden">
                      <div className="flex gap-1">
                        {(currentUser?.role === 'general_manager' || currentUser?.role === 'store_keeper') && (
                          <Button variant="ghost" size="icon" onClick={() => { setEditingMaterial(material); setEditMaterialOpen(true) }} title={language === 'ar' ? 'تعديل' : 'Edit'}>
                            <Edit className="w-4 h-4 text-blue-500" />
                          </Button>
                        )}
                        {currentUser?.role === 'general_manager' && (
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteMaterial(material.id)} title={language === 'ar' ? 'حذف' : 'Delete'}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {materials.length === 0 && (
          <div className="text-center py-12">
            <Box className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600">{t.no_materials}</h3>
            <p className="text-gray-500">{t.no_materials_desc}</p>
          </div>
        )}

        {/* قسم مواد المشاريع */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-amber-600" />
              {t.project_materials}
            </CardTitle>
            <CardDescription>{language === 'ar' ? 'اختر مشروعاً لعرض المواد المطلوبة' : 'Select a project to view required materials'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <Select value={viewingProjectMaterials || '_none_'} onValueChange={(val) => {
                const realVal = val === '_none_' ? '' : val
                setViewingProjectMaterials(realVal)
                if (realVal) fetchProjectMaterials(realVal)
                else setProjectMaterials([])
              }}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder={language === 'ar' ? 'اختر المشروع' : 'Select Project'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">{language === 'ar' ? 'بدون' : 'None'}</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.projectDate ? new Date(p.projectDate).toLocaleDateString(language === 'ar' ? 'ar-QA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : (p.nameAr || p.name)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {viewingProjectMaterials && (
                <Button variant="outline" className="gap-2" onClick={() => {
                  setSelectedProjectForMaterial(viewingProjectMaterials)
                  setAddMaterialToProjectOpen(true)
                }}>
                  <Plus className="w-4 h-4" /> {t.btn_add_to_project}
                </Button>
              )}
            </div>

            {viewingProjectMaterials && projectMaterials.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{t.material_name}</TableHead>
                    <TableHead>{t.material_unit}</TableHead>
                    <TableHead>{t.material_quantity}</TableHead>
                    <TableHead>{t.material_unit_price}</TableHead>
                    <TableHead>{t.total_cost}</TableHead>
                    <TableHead>{t.material_notes}</TableHead>
                    <TableHead className="print:hidden">{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectMaterials.map((pm, idx) => (
                    <TableRow key={pm.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{pm.material?.name || '-'}</TableCell>
                      <TableCell>{pm.material?.unit || '-'}</TableCell>
                      <TableCell>{pm.quantity}</TableCell>
                      <TableCell>{pm.material?.unitPrice.toFixed(2) || '0.00'} {language === 'ar' ? 'ر.ق' : 'QR'}</TableCell>
                      <TableCell className="font-medium">{((pm.material?.unitPrice || 0) * pm.quantity).toFixed(2)} {language === 'ar' ? 'ر.ق' : 'QR'}</TableCell>
                      <TableCell className="text-sm text-gray-500">{pm.notes || '-'}</TableCell>
                      <TableCell className="print:hidden">
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveMaterialFromProject(pm.id)}>
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot>
                  <TableRow className="bg-amber-50 font-bold">
                    <TableCell colSpan={3}>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableCell>
                    <TableCell>{projectMaterials.reduce((sum, pm) => sum + pm.quantity, 0)}</TableCell>
                    <TableCell></TableCell>
                    <TableCell>{projectMaterials.reduce((sum, pm) => sum + (pm.material?.unitPrice || 0) * pm.quantity, 0).toFixed(2)} {language === 'ar' ? 'ر.ق' : 'QR'}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            )}

            {viewingProjectMaterials && projectMaterials.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {language === 'ar' ? 'لا توجد مواد مرتبطة بهذا المشروع' : 'No materials linked to this project'}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* نافذة تعديل المادة */}
      <Dialog open={editMaterialOpen} onOpenChange={setEditMaterialOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{language === 'ar' ? 'تعديل المادة' : 'Edit Material'}</DialogTitle></DialogHeader>
          {editingMaterial && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.material_name} *</Label>
                  <Input value={editingMaterial.name} onChange={(e) => setEditingMaterial(prev => prev ? ({ ...prev, name: e.target.value }) : prev)} />
                </div>
                <div className="space-y-2">
                  <Label>{t.material_name_ar}</Label>
                  <Input value={editingMaterial.nameAr || ''} onChange={(e) => setEditingMaterial(prev => prev ? ({ ...prev, nameAr: e.target.value }) : prev)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.material_unit}</Label>
                  <Input value={editingMaterial.unit} onChange={(e) => setEditingMaterial(prev => prev ? ({ ...prev, unit: e.target.value }) : prev)} />
                </div>
                <div className="space-y-2">
                  <Label>{t.material_unit_ar}</Label>
                  <Input value={editingMaterial.unitAr || ''} onChange={(e) => setEditingMaterial(prev => prev ? ({ ...prev, unitAr: e.target.value }) : prev)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.material_category}</Label>
                  <Select value={editingMaterial.category} onValueChange={(val) => setEditingMaterial(prev => prev ? ({ ...prev, category: val }) : prev)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CARPENTER">{t.cat_carpenter}</SelectItem>
                      <SelectItem value="PAINTER">{t.cat_painter}</SelectItem>
                      <SelectItem value="STEEL FABRICATION">{t.cat_steel}</SelectItem>
                      <SelectItem value="FOAM AND DESIGN WORK">{t.cat_foam}</SelectItem>
                      <SelectItem value="TAILOR WORK">{t.cat_tailor}</SelectItem>
                      <SelectItem value="GENERAL WORK">{t.cat_general}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.material_category_ar}</Label>
                  <Input value={editingMaterial.categoryAr || ''} onChange={(e) => setEditingMaterial(prev => prev ? ({ ...prev, categoryAr: e.target.value }) : prev)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t.material_unit_price}</Label>
                  <Input type="number" step="0.01" min="0" value={editingMaterial.unitPrice} onChange={(e) => setEditingMaterial(prev => prev ? ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }) : prev)} />
                </div>
                <div className="space-y-2">
                  <Label>{t.material_stock}</Label>
                  <Input type="number" min="0" value={editingMaterial.stockQuantity} onChange={(e) => setEditingMaterial(prev => prev ? ({ ...prev, stockQuantity: parseInt(e.target.value) || 0 }) : prev)} />
                </div>
                <div className="space-y-2">
                  <Label>{t.material_type}</Label>
                  <Select value={editingMaterial.type} onValueChange={(val) => setEditingMaterial(prev => prev ? ({ ...prev, type: val }) : prev)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raw">{t.materials_raw}</SelectItem>
                      <SelectItem value="operational">{t.materials_operational}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.material_description}</Label>
                <Textarea value={editingMaterial.description || ''} onChange={(e) => setEditingMaterial(prev => prev ? ({ ...prev, description: e.target.value }) : prev)} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMaterialOpen(false)}>{t.btn_cancel}</Button>
            <Button onClick={handleEditMaterial}>{t.btn_save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة استيراد Excel */}
      <Dialog open={importMaterialOpen} onOpenChange={setImportMaterialOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.btn_import_excel}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.import_type}</Label>
              <Select value={materialTypeFilter || 'raw'} onValueChange={setMaterialTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="raw">{t.materials_raw}</SelectItem>
                  <SelectItem value="operational">{t.materials_operational}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.import_file}</Label>
              <Input type="file" accept=".xlsx,.xls" onChange={handleImportMaterials} disabled={importingMaterials} />
              <p className="text-xs text-gray-500">
                {language === 'ar' 
                  ? 'يجب أن يحتوي ملف Excel على الأعمدة: اسم المادة، الوحدة، الفئة، سعر الوحدة، الكمية في المخزون'
                  : 'Excel file should have columns: Material Name, Unit, Category, Unit Price, Stock Quantity'}
              </p>
            </div>
            {importingMaterials && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">{language === 'ar' ? 'جاري الاستيراد...' : 'Importing...'}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportMaterialOpen(false)}>{t.btn_close}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة إضافة مادة للمشروع */}
      <Dialog open={addMaterialToProjectOpen} onOpenChange={setAddMaterialToProjectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.btn_add_to_project}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المشروع' : 'Project'}</Label>
              <Select value={selectedProjectForMaterial} onValueChange={setSelectedProjectForMaterial}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر المشروع' : 'Select Project'} /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.projectDate ? new Date(p.projectDate).toLocaleDateString(language === 'ar' ? 'ar-QA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : (p.nameAr || p.name)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.material_name}</Label>
              <Select value={selectedMaterialForProject} onValueChange={setSelectedMaterialForProject}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر المادة' : 'Select Material'} /></SelectTrigger>
                <SelectContent>
                  {materials.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center gap-2">
                        <span>{m.name}</span>
                        <span className="text-xs text-gray-500">({m.unit} - {getCategoryLabel(m.category)})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.material_quantity}</Label>
              <Input type="number" min="1" value={newMaterialQuantity} onChange={(e) => setNewMaterialQuantity(parseInt(e.target.value) || 1)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMaterialToProjectOpen(false)}>{t.btn_cancel}</Button>
            <Button onClick={handleAddMaterialToProject} disabled={!selectedMaterialForProject || !selectedProjectForMaterial}>{t.btn_save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
