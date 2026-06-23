'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Calculator, FileText, Package, DollarSign, RotateCcw, Printer, Save, Trash2,
  Plus, Copy, ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'

interface Material {
  id: string
  type: 'physical' | 'paint'
  name: string
  pcs: number
  cuttingTimeMin: number
  hourlyRate: number
  unitType: string
  unitPrice: number
  qty: number
}

interface DesignCostCalculatorProps {
  language: 'ar' | 'en'
}

export default function DesignCostCalculator({ language }: DesignCostCalculatorProps) {
  const t = language === 'ar' ? {
    title: 'حاسبة تكلفة التصميم',
    subtitle: 'تقدير تكلفة الملف الفني للمنتج',
    techFilePdf: 'ملف فني PDF',
    save: 'حفظ',
    print: 'طباعة',
    reset: 'إعادة تعيين',
    productTitle: 'الملف الفني للمنتج',
    productDesc: 'أدخل تفاصيل المنتج ومعلومات التصميم',
    productName: 'اسم المنتج / التصميم',
    productionBarcode: 'باركود الإنتاج',
    marketMultiplier: 'مضاعف سعر السوق',
    multiplierHint: 'سعر السوق = التكلفة الإجمالية × المضاعف',
    materials: 'المواد',
    totalCostPc: 'التكلفة الإجمالية / قطعة',
    marketPricePc: 'سعر السوق / قطعة',
    materialsTitle: 'المواد الأساسية',
    materialsDesc: 'أضف جميع المواد المستخدمة في التصميم مع مواصفاتها',
    addMaterial: 'إضافة مادة',
    newMaterial: 'مادة جديدة',
    duplicate: 'نسخ',
    physicalMaterial: 'مادة فيزيائية',
    paintLabor: 'دهان / عمالة',
    materialName: 'اسم المادة',
    selectMaterial: 'اختر أو اكتب اسم المادة',
    pieces: 'القطع (PCS)',
    cuttingTime: 'وقت القص/الطباعة (دقيقة)',
    hourlyRate: 'السعر بالساعة (ر.ق)',
    unitType: 'نوع الوحدة',
    unitPrice: 'سعر الوحدة (ر.ق)',
    quantity: 'الكمية',
    qtyNote: 'كمية المادة المستخدمة',
    summary: 'ملخص حساب التكلفة',
    summaryDesc: 'تفصيل كامل لجميع تكاليف المواد',
    primaryMaterials: 'المواد الأساسية',
    pcs: 'قطعة',
    cuttingTimeShort: 'وقت القص (دقيقة)',
    cuttingCost: 'تكلفة القص (ر.ق)',
    materialCost: 'تكلفة المادة (ر.ق)',
    costPc: 'التكلفة/قطعة (ر.ق)',
    total: 'الإجمالي',
    finalPricing: 'التسعير النهائي',
    totalCostFor1Pc: 'التكلفة الإجمالية لقطعة واحدة',
    sumOfAllMaterials: 'مجموع تكاليف جميع المواد لكل قطعة',
    marketPriceFor1Pc: 'سعر السوق لقطعة واحدة',
    totalCostMultiplier: 'التكلفة الإجمالية × المضاعف',
    materialsCount: 'عدد المواد',
    totalCuttingTime: 'إجمالي وقت القص (دقيقة)',
    profitMargin: 'هامش الربح (%)',
    profitPc: 'الربح / قطعة (ر.ق)',
    formulasTitle: 'مرجع صيغ الحساب',
    formulasDesc: 'الصيغ المستخدمة في حساب التكاليف',
    cuttingFormula: 'تكلفة القص/الطباعة = (الوقت بالدقائق / 60) × السعر بالساعة',
    materialCostFormula: 'تكلفة المادة = سعر الوحدة × الكمية',
    pricePerPcFormula: 'السعر لكل قطعة = تكلفة المادة / القطع',
    costPerPcFormula: 'التكلفة لكل قطعة = (تكلفة القص / القطع) + السعر لكل قطعة',
    marketPriceFormula: 'سعر السوق = التكلفة الإجمالية × المضاعف',
    paintLaborFormula: 'تكلفة الدهان/العمالة = (وقت الصنع/60) × 30 + تكلفة المادة',
    saved: 'تم حفظ الملف الفني بنجاح',
    resetConfirm: 'هل أنت متأكد من إعادة التعيين؟ سيتم فقدان جميع البيانات.',
    materialCostSummary: 'تكلفة المادة',
    cuttingCostSummary: 'تكلفة القص',
    pricePcSummary: 'السعر/قطعة',
    costPcSummary: 'التكلفة/قطعة',
    sheet: 'ورقة',
    roll: 'لفة',
    piece: 'قطعة',
    liter: 'لتر',
    gallon: 'جالون',
    meter: 'متر',
    kilo: 'كيلو',
  } : {
    title: 'Design Cost Calculator',
    subtitle: 'Technical File Cost Estimation',
    techFilePdf: 'Technical File PDF',
    save: 'Save',
    print: 'Print',
    reset: 'Reset',
    productTitle: 'Technical File for Product',
    productDesc: 'Enter the product details and design information',
    productName: 'Product / Design Name',
    productionBarcode: 'Production Barcode',
    marketMultiplier: 'Market Price Multiplier',
    multiplierHint: 'Market Price = Total Cost x Multiplier',
    materials: 'Materials',
    totalCostPc: 'Total Cost / PC',
    marketPricePc: 'Market Price / PC',
    materialsTitle: 'Primary Materials',
    materialsDesc: 'Add all materials used in the design with their specifications',
    addMaterial: 'Add Material',
    newMaterial: 'New Material',
    duplicate: 'Duplicate',
    physicalMaterial: 'Physical Material',
    paintLabor: 'Paint / Labor',
    materialName: 'Material Name',
    selectMaterial: 'Select or type material',
    pieces: 'Pieces (PCS)',
    cuttingTime: 'Cutting/Printing Time (Min)',
    hourlyRate: 'Hourly Rate (QAR/hr)',
    unitType: 'Unit Type',
    unitPrice: 'Unit Price (QAR)',
    quantity: 'Quantity',
    qtyNote: 'Amount of material used',
    summary: 'Cost Calculation Summary',
    summaryDesc: 'Complete breakdown of all material costs',
    primaryMaterials: 'Primary Materials',
    pcs: 'PCS',
    cuttingTimeShort: 'Cutting Time (Min)',
    cuttingCost: 'Cutting Cost (QAR)',
    materialCost: 'Material Cost (QAR)',
    costPc: 'Cost/PC (QAR)',
    total: 'TOTAL',
    finalPricing: 'Final Pricing',
    totalCostFor1Pc: 'Total Cost for 1 PC',
    sumOfAllMaterials: 'Sum of all material costs per piece',
    marketPriceFor1Pc: 'Market Price for 1 PC',
    totalCostMultiplier: 'Total Cost x Multiplier',
    materialsCount: 'Materials Count',
    totalCuttingTime: 'Total Cutting Time (Min)',
    profitMargin: 'Profit Margin (%)',
    profitPc: 'Profit / PC (QAR)',
    formulasTitle: 'Calculation Formulas Reference',
    formulasDesc: 'Formulas used in cost calculations',
    cuttingFormula: 'Cutting/Printing Cost = (Time Min / 60) x Hourly Rate',
    materialCostFormula: 'Material Cost = Unit Price x Quantity',
    pricePerPcFormula: 'Price per Piece = Material Cost / PCS',
    costPerPcFormula: 'Cost per Piece = (Cutting Cost / PCS) + Price/PC',
    marketPriceFormula: 'Market Price = Total Cost x Multiplier',
    paintLaborFormula: 'Paint/Labor Cost = (Making Time/60) x 30 + Material Cost',
    saved: 'Technical file saved successfully',
    resetConfirm: 'Are you sure you want to reset? All data will be lost.',
    materialCostSummary: 'Material Cost',
    cuttingCostSummary: 'Cutting Cost',
    pricePcSummary: 'Price/PC',
    costPcSummary: 'Cost/PC',
    sheet: 'Sheet',
    roll: 'Roll',
    piece: 'Piece',
    liter: 'Liter',
    gallon: 'Gallon',
    meter: 'Meter',
    kilo: 'Kilo',
  }

  const [productName, setProductName] = useState('')
  const [barcode, setBarcode] = useState('')
  const [multiplier, setMultiplier] = useState(1.75)
  const [materials, setMaterials] = useState<Material[]>([
    {
      id: '1',
      type: 'physical',
      name: '',
      pcs: 1,
      cuttingTimeMin: 0,
      hourlyRate: 30,
      unitType: 'Sheet',
      unitPrice: 0,
      qty: 0.25,
    }
  ])

  const addMaterial = () => {
    setMaterials([...materials, {
      id: Date.now().toString(),
      type: 'physical',
      name: '',
      pcs: 1,
      cuttingTimeMin: 0,
      hourlyRate: 30,
      unitType: 'Sheet',
      unitPrice: 0,
      qty: 0.25,
    }])
  }

  const duplicateMaterial = (id: string) => {
    const mat = materials.find(m => m.id === id)
    if (mat) {
      setMaterials([...materials, { ...mat, id: Date.now().toString() }])
    }
  }

  const deleteMaterial = (id: string) => {
    if (materials.length > 1) {
      setMaterials(materials.filter(m => m.id !== id))
    } else {
      toast.error(language === 'ar' ? 'يجب وجود مادة واحدة على الأقل' : 'At least one material is required')
    }
  }

  const updateMaterial = (id: string, field: keyof Material, value: any) => {
    setMaterials(materials.map(m => m.id === id ? { ...m, [field]: value } : m))
  }

  // Calculations
  const calculations = useMemo(() => {
    return materials.map(m => {
      const cuttingCost = (m.cuttingTimeMin / 60) * m.hourlyRate
      const materialCost = m.unitPrice * m.qty
      const pricePerPc = m.pcs > 0 ? materialCost / m.pcs : 0
      const costPerPc = m.pcs > 0 ? (cuttingCost / m.pcs) + pricePerPc : 0
      return { ...m, cuttingCost, materialCost, pricePerPc, costPerPc }
    })
  }, [materials])

  const totalCostPc = calculations.reduce((sum, c) => sum + c.costPerPc, 0)
  const marketPricePc = totalCostPc * multiplier
  const profitPc = marketPricePc - totalCostPc
  const profitMargin = marketPricePc > 0 ? (profitPc / marketPricePc) * 100 : 0
  const totalCuttingTime = materials.reduce((sum, m) => sum + m.cuttingTimeMin, 0)

  const handleReset = () => {
    if (confirm(t.resetConfirm)) {
      setProductName('')
      setBarcode('')
      setMultiplier(1.75)
      setMaterials([{
        id: '1',
        type: 'physical',
        name: '',
        pcs: 1,
        cuttingTimeMin: 0,
        hourlyRate: 30,
        unitType: 'Sheet',
        unitPrice: 0,
        qty: 0.25,
      }])
      toast.success(language === 'ar' ? 'تم إعادة التعيين' : 'Reset complete')
    }
  }

  const handleSave = () => {
    toast.success(t.saved)
  }

  const handlePrint = () => {
    window.print()
  }

  const handlePdf = () => {
    window.print()
  }

  const isRTL = language === 'ar'

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{t.title}</h1>
            <p className="text-sm text-slate-500">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={handlePdf} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <FileText className="w-4 h-4" />
            {t.techFilePdf}
          </Button>
          <Button variant="outline" onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            {t.save}
          </Button>
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            {t.print}
          </Button>
          <Button variant="outline" onClick={handleReset} className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
            <RotateCcw className="w-4 h-4" />
            {t.reset}
          </Button>
        </div>
      </div>

      {/* Technical File Card */}
      <Card className="rounded-xl shadow-sm print:shadow-none print:border-slate-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-5 h-5 text-emerald-600" />
            {t.productTitle}
          </CardTitle>
          <CardDescription>{t.productDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t.productName}</Label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder={t.productName} />
            </div>
            <div className="space-y-2">
              <Label>{t.productionBarcode}</Label>
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder={t.productionBarcode} />
            </div>
            <div className="space-y-2">
              <Label>{t.marketMultiplier}</Label>
              <Input
                type="number"
                step="0.01"
                value={multiplier}
                onChange={(e) => setMultiplier(parseFloat(e.target.value) || 1)}
              />
              <p className="text-xs text-slate-500">{t.multiplierHint}</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-emerald-700" />
                <span className="text-sm font-medium text-emerald-700">{t.materials}</span>
              </div>
              <div className="text-2xl font-bold text-emerald-700">{materials.length}</div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-amber-700" />
                <span className="text-sm font-medium text-amber-700">{t.totalCostPc}</span>
              </div>
              <div className="text-2xl font-bold text-amber-700">{totalCostPc.toFixed(2)} {isRTL ? 'ر.ق' : 'QAR'}</div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-blue-700" />
                <span className="text-sm font-medium text-blue-700">{t.marketPricePc}</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">{marketPricePc.toFixed(2)} {isRTL ? 'ر.ق' : 'QAR'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials Card */}
      <Card className="rounded-xl shadow-sm print:shadow-none print:border-slate-300">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="w-5 h-5 text-emerald-600" />
                {t.materialsTitle}
              </CardTitle>
              <CardDescription>{t.materialsDesc}</CardDescription>
            </div>
            <Button onClick={addMaterial} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="w-4 h-4" />
              {t.addMaterial}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {calculations.map((m, idx) => (
            <div key={m.id} className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-400">#{idx + 1}</span>
                  <span className="text-sm font-medium text-slate-700">{m.name || t.newMaterial}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => duplicateMaterial(m.id)} className="gap-1 h-8">
                    <Copy className="w-3.5 h-3.5" />
                    {t.duplicate}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMaterial(m.id)} className="h-8 w-8 text-red-500 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Material type toggle */}
              <div className="inline-flex rounded-md border border-slate-200 p-1 bg-slate-50">
                <button
                  onClick={() => updateMaterial(m.id, 'type', 'physical')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    m.type === 'physical' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.physicalMaterial}
                </button>
                <button
                  onClick={() => updateMaterial(m.id, 'type', 'paint')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    m.type === 'paint' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.paintLabor}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-3">
                  <Label>{t.materialName}</Label>
                  <Input
                    value={m.name}
                    onChange={(e) => updateMaterial(m.id, 'name', e.target.value)}
                    placeholder={t.selectMaterial}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.pieces}</Label>
                  <Input
                    type="number"
                    value={m.pcs}
                    onChange={(e) => updateMaterial(m.id, 'pcs', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.cuttingTime}</Label>
                  <Input
                    type="number"
                    value={m.cuttingTimeMin}
                    onChange={(e) => updateMaterial(m.id, 'cuttingTimeMin', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.hourlyRate}</Label>
                  <Select value={String(m.hourlyRate)} onValueChange={(v) => updateMaterial(m.id, 'hourlyRate', parseFloat(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 {isRTL ? 'ر.ق/ساعة' : 'QAR/hr'} (MDF, Forex, Vinyl)</SelectItem>
                      <SelectItem value="40">40 {isRTL ? 'ر.ق/ساعة' : 'QAR/hr'} (Resin, Gypsum)</SelectItem>
                      <SelectItem value="50">50 {isRTL ? 'ر.ق/ساعة' : 'QAR/hr'} (Steel)</SelectItem>
                      <SelectItem value="60">60 {isRTL ? 'ر.ق/ساعة' : 'QAR/hr'} (Acrylic)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.unitType}</Label>
                  <Select value={m.unitType} onValueChange={(v) => updateMaterial(m.id, 'unitType', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sheet">{t.sheet}</SelectItem>
                      <SelectItem value="Roll">{t.roll}</SelectItem>
                      <SelectItem value="Piece">{t.piece}</SelectItem>
                      <SelectItem value="Liter">{t.liter}</SelectItem>
                      <SelectItem value="Gallon">{t.gallon}</SelectItem>
                      <SelectItem value="Meter">{t.meter}</SelectItem>
                      <SelectItem value="Kilo">{t.kilo}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.unitPrice}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={m.unitPrice}
                    onChange={(e) => updateMaterial(m.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    placeholder={isRTL ? 'السعر للوحدة' : 'Price per unit'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.quantity}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={m.qty}
                    onChange={(e) => updateMaterial(m.id, 'qty', parseFloat(e.target.value) || 0)}
                    placeholder={isRTL ? 'مثال: 0.25' : 'e.g. 0.25'}
                  />
                  <p className="text-xs text-slate-500">{t.qtyNote}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-md p-3 text-sm font-mono text-slate-700 flex flex-wrap gap-x-4 gap-y-1">
                <span>{t.cuttingCostSummary}: <span className="font-bold text-slate-900">{m.cuttingCost.toFixed(2)} {isRTL ? 'ر.ق' : 'QAR'}</span></span>
                <span>|</span>
                <span>{t.materialCostSummary}: <span className="font-bold text-slate-900">{m.materialCost.toFixed(2)} {isRTL ? 'ر.ق' : 'QAR'}</span></span>
                <span>|</span>
                <span>{t.pricePcSummary}: <span className="font-bold text-slate-900">{m.pricePerPc.toFixed(2)} {isRTL ? 'ر.ق' : 'QAR'}</span></span>
                <span>|</span>
                <span>{t.costPcSummary}: <span className="font-bold text-emerald-700">{m.costPerPc.toFixed(2)} {isRTL ? 'ر.ق' : 'QAR'}</span></span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card className="rounded-xl shadow-sm print:shadow-none print:border-slate-300">
        <CardHeader>
          <CardTitle className="text-base">{t.summary}</CardTitle>
          <CardDescription>{t.summaryDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>{t.primaryMaterials}</TableHead>
                  <TableHead className="text-center">{t.pcs}</TableHead>
                  <TableHead className="text-center">{t.cuttingTimeShort}</TableHead>
                  <TableHead className="text-center">{t.cuttingCost}</TableHead>
                  <TableHead className="text-center">{t.unitType}</TableHead>
                  <TableHead className="text-center">{t.unitPrice}</TableHead>
                  <TableHead className="text-center">{t.quantity}</TableHead>
                  <TableHead className="text-center">{t.materialCost}</TableHead>
                  <TableHead className="text-center">{t.costPc}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculations.map((m, idx) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium text-slate-400">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{m.name || t.newMaterial}</TableCell>
                    <TableCell className="text-center">{m.pcs}</TableCell>
                    <TableCell className="text-center">{m.cuttingTimeMin}</TableCell>
                    <TableCell className="text-center">{m.cuttingCost.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{m.unitType}</TableCell>
                    <TableCell className="text-center">{m.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{m.qty}</TableCell>
                    <TableCell className="text-center">{m.materialCost.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-bold text-emerald-700">{m.costPerPc.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-amber-50 font-bold">
                  <TableCell colSpan={9} className="text-right">{t.total}</TableCell>
                  <TableCell className="text-center text-amber-700">{totalCostPc.toFixed(2)} {isRTL ? 'ر.ق' : 'QAR'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Final Pricing */}
      <Card className="rounded-xl shadow-sm print:shadow-none print:border-slate-300">
        <CardHeader>
          <CardTitle className="text-base">{t.finalPricing}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-medium text-slate-600 mb-2">{t.totalCostFor1Pc}</p>
              <div className="text-4xl font-bold text-slate-900">{totalCostPc.toFixed(2)} {isRTL ? 'ر.ق' : 'QAR'}</div>
              <p className="text-xs text-slate-500 mt-2">{t.sumOfAllMaterials}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
              <p className="text-sm font-medium text-emerald-700 mb-2">{t.marketPriceFor1Pc}</p>
              <div className="text-4xl font-bold text-emerald-700">{marketPricePc.toFixed(2)} {isRTL ? 'ر.ق' : 'QAR'}</div>
              <p className="text-xs text-emerald-600 mt-2">{t.totalCostMultiplier} ({multiplier})</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">{t.materialsCount}</p>
              <div className="text-2xl font-bold text-slate-900">{materials.length}</div>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">{t.totalCuttingTime}</p>
              <div className="text-2xl font-bold text-slate-900">{totalCuttingTime}</div>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">{t.profitMargin}</p>
              <div className="text-2xl font-bold text-emerald-700">{profitMargin.toFixed(1)}%</div>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">{t.profitPc}</p>
              <div className="text-2xl font-bold text-emerald-700">{profitPc.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulas Reference */}
      <Card className="rounded-xl shadow-sm print:hidden">
        <CardHeader>
          <CardTitle className="text-base">{t.formulasTitle}</CardTitle>
          <CardDescription>{t.formulasDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-md p-3">
              <p className="text-xs text-slate-600 font-mono">{t.cuttingFormula}</p>
            </div>
            <div className="bg-slate-50 rounded-md p-3">
              <p className="text-xs text-slate-600 font-mono">{t.materialCostFormula}</p>
            </div>
            <div className="bg-slate-50 rounded-md p-3">
              <p className="text-xs text-slate-600 font-mono">{t.pricePerPcFormula}</p>
            </div>
            <div className="bg-slate-50 rounded-md p-3">
              <p className="text-xs text-slate-600 font-mono">{t.costPerPcFormula}</p>
            </div>
            <div className="bg-slate-50 rounded-md p-3">
              <p className="text-xs text-slate-600 font-mono">{t.marketPriceFormula}</p>
            </div>
            <div className="bg-slate-50 rounded-md p-3">
              <p className="text-xs text-slate-600 font-mono">{t.paintLaborFormula}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
