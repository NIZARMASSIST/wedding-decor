'use client'

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Area, AreaChart
} from 'recharts'
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react'

interface ChartsWrapperProps {
  projects: any[]
  items: any[]
  departments: any[]
  stats: {
    totalStages: number
    completedStages: number
    inProgressStages: number
    pendingStages: number
    totalEstimatedTime: number
    progress: number
  }
  language: string
  t: any
}

export default function ChartsWrapper({ projects, items, departments, stats, language, t }: ChartsWrapperProps) {
  // Prepare chart data safely
  const safeItems = Array.isArray(items) ? items : []
  const safeProjects = Array.isArray(projects) ? projects : []
  const safeDepartments = Array.isArray(departments) ? departments : []

  const projectsProgressData = safeProjects.map((p: any) => {
    const projectItems = safeItems.filter((i: any) => i.projectId === p?.id)
    const totalStages = projectItems.reduce((sum: number, i: any) => sum + (i?.stages?.length || 0), 0)
    const completedStages = projectItems.reduce((sum: number, i: any) => 
      sum + (i?.stages?.filter((s: any) => s?.status === 'completed')?.length || 0), 0)
    return {
      name: (p?.nameAr || p?.name || '').substring(0, 10),
      completed: completedStages,
      total: totalStages,
      progress: totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0
    }
  })

  const departmentsData = safeDepartments.map((d: any) => {
    const deptStages = safeItems.flatMap((i: any) => i?.stages || []).filter((s: any) => s?.departmentId === d?.id)
    return { name: d?.nameAr || d?.name || '', value: deptStages.length, color: d?.color || '#6B7280' }
  }).filter((d: any) => d.value > 0)

  const statusData = [
    { name: language === 'ar' ? 'مكتمل' : 'Completed', value: stats?.completedStages || 0, color: '#22c55e' },
    { name: language === 'ar' ? 'قيد التنفيذ' : 'In Progress', value: stats?.inProgressStages || 0, color: '#3b82f6' },
    { name: language === 'ar' ? 'قيد الانتظار' : 'Pending', value: stats?.pendingStages || 0, color: '#f59e0b' }
  ]

  const checklistData = safeItems.slice(0, 10).map((item: any) => {
    const totalChecklist = (item?.stages || []).reduce((sum: number, s: any) => sum + (s?.checklist?.length || 0), 0)
    const completedChecklist = (item?.stages || []).reduce((sum: number, s: any) => 
      sum + (s?.checklist?.filter((c: any) => c?.completed)?.length || 0), 0)
    return {
      name: (item?.name || '').substring(0, 10),
      total: totalChecklist,
      completed: completedChecklist,
      progress: totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0
    }
  })

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Projects Progress Bar Chart */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-amber-600" />
          <h3 className="font-bold text-lg">{language === 'ar' ? 'تقدم المشاريع' : 'Projects Progress'}</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectsProgressData}>
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
      </div>

      {/* Stages by Department Pie Chart */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <PieChartIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-lg">{language === 'ar' ? 'توزيع المراحل حسب الأقسام' : 'Stages by Department'}</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Pie
                data={departmentsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                dataKey="value"
              >
                {departmentsData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPie>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Items Status Bar Chart */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h3 className="font-bold text-lg mb-4">{language === 'ar' ? 'حالة العناصر' : 'Items Status'}</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData}>
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
      </div>

      {/* Checklist Progress Area Chart */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h3 className="font-bold text-lg mb-4">{language === 'ar' ? 'تقدم الكميات (Checklist)' : 'Quantity Progress'}</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={checklistData}>
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
      </div>
    </div>
  )
}
