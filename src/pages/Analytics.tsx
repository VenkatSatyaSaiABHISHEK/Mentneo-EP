import { useState, useEffect } from 'react'
import { getFinancialData, saveFinancialData, deleteFinancialData, type FinancialData } from '../services/financialService'
import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, Area, PieChart, Pie, Cell } from 'recharts'
import Papa from 'papaparse'
// @ts-ignore
import html2pdf from 'html2pdf.js'
import { useAuth } from '../context/AuthContext'

// Simple elegant SVG Icons
const Icons = {
  ChartUp: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  Users: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Scissors: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2-2m-2 2l-2-2m2 2l-2 2m2-2l2 2m-2-2a2 2 0 11-4 0 2 2 0 014 0zM19 19a2 2 0 11-4 0 2 2 0 014 0zM19 5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Safe: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  Upload: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
  Download: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  Info: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
}

export default function Analytics() {
  const { isSuperAdmin } = useAuth()
  const [data, setData] = useState<FinancialData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showGuide, setShowGuide] = useState(false)
  const [showVisualsModal, setShowVisualsModal] = useState(false)

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    revenue: 0,
    deductions: 0,
    otherExpenses: 0,
    departmentPayouts: {
      engineering: 0,
      sales: 0,
      marketing: 0,
      hrAdmin: 0,
      other: 0,
    }
  })

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      const fetchedData = await getFinancialData()
      setData(fetchedData)
      
      // Auto-load today's data if it exists
      const today = new Date().toISOString().split('T')[0]
      const existingRecord = fetchedData.find(d => d.date === today)
      if (existingRecord) {
        setFormData({
          date: existingRecord.date,
          revenue: existingRecord.revenue,
          deductions: existingRecord.deductions,
          otherExpenses: existingRecord.otherExpenses,
          departmentPayouts: existingRecord.departmentPayouts
        })
      }
      
      setIsLoading(false)
    }
    void loadData()
  }, [])

  const [isSaving, setIsSaving] = useState(false)

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const totalPayout = Object.values(formData.departmentPayouts).reduce((a, b) => a + b, 0)
      const recordId = formData.date
      
      const existing = data.find(d => d.id === recordId)
      
      const newData: FinancialData = {
        id: recordId,
        date: formData.date,
        revenue: formData.revenue,
        deductions: formData.deductions,
        otherExpenses: formData.otherExpenses,
        payout: totalPayout,
        departmentPayouts: formData.departmentPayouts,
        createdAt: existing ? existing.createdAt : Date.now()
      }
      
      await saveFinancialData(newData)
      
      setData(prev => {
        const filtered = prev.filter(d => d.id !== recordId)
        return [...filtered, newData].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
      })
    } catch (error) {
      console.error(error)
      alert('Failed to save data.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDateChange = (newDate: string) => {
    const existingRecord = data.find(d => d.date === newDate)
    
    if (existingRecord) {
      setFormData({
        date: newDate,
        revenue: existingRecord.revenue,
        deductions: existingRecord.deductions,
        otherExpenses: existingRecord.otherExpenses,
        departmentPayouts: existingRecord.departmentPayouts
      })
    } else {
      setFormData({
        date: newDate,
        revenue: 0,
        deductions: 0,
        otherExpenses: 0,
        departmentPayouts: { engineering: 0, sales: 0, marketing: 0, hrAdmin: 0, other: 0 }
      })
    }
  }

  const handleDepartmentChange = (dept: keyof typeof formData.departmentPayouts, val: string) => {
    setFormData(prev => ({
      ...prev,
      departmentPayouts: {
        ...prev.departmentPayouts,
        [dept]: parseFloat(val) || 0
      }
    }))
  }

  const handleDelete = async (id: string) => {
    setData(data.filter(d => d.id !== id))
    await deleteFinancialData(id)
  }

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const importedData = results.data as any[]
        for (const row of importedData) {
          const engineering = parseFloat(row['Eng Payout']) || 0
          const sales = parseFloat(row['Sales Payout']) || 0
          const marketing = parseFloat(row['Mktg Payout']) || parseFloat(row['Marketing Payout']) || 0
          const hrAdmin = parseFloat(row['HR Payout']) || parseFloat(row['HR/Admin Payout']) || 0
          const other = parseFloat(row['Other Payout']) || 0
          
          const totalPayout = engineering + sales + marketing + hrAdmin + other
          
          const monthStr = row['Date'] || ''
          const dateStr = monthStr || new Date().toISOString().split('T')[0]

          const newData: FinancialData = {
            id: crypto.randomUUID(),
            date: dateStr,
            revenue: parseFloat(row['Revenue']) || 0,
            deductions: parseFloat(row['Deductions']) || 0,
            otherExpenses: parseFloat(row['Other Expenses']) || 0,
            payout: totalPayout,
            departmentPayouts: { engineering, sales, marketing, hrAdmin, other },
            createdAt: Date.now()
          }
          await saveFinancialData(newData)
          setData(prev => [...prev, newData])
        }
      }
    })
    e.target.value = ''
  }

  const downloadTemplate = () => {
    const templateData = [{
      Date: '2026-01-01',
      Revenue: 500000,
      'Eng Payout': 150000,
      'Sales Payout': 80000,
      'Marketing Payout': 40000,
      'HR/Admin Payout': 30000,
      'Other Payout': 10000,
      Deductions: 5000,
      'Other Expenses': 20000
    }]
    const csv = Papa.unparse(templateData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `HR_Financial_Template.csv`
    link.click()
  }

  const exportToCSV = () => {
    const csvData = data.map(d => ({
      Date: d.date,
      Revenue: d.revenue,
      'Total Payout': d.payout,
      'Eng Payout': d.departmentPayouts.engineering,
      'Sales Payout': d.departmentPayouts.sales,
      'Marketing Payout': d.departmentPayouts.marketing,
      'HR/Admin Payout': d.departmentPayouts.hrAdmin,
      'Other Payout': d.departmentPayouts.other,
      Deductions: d.deductions,
      'Other Expenses': d.otherExpenses,
      'Net Profit/Safe': d.revenue - (d.payout - d.deductions) - d.otherExpenses
    }))
    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `HR_Financial_Report_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const loadDemoData = async () => {
    setIsLoading(true);
    const demoData = [
      { date: '2026-01-01', revenue: 500000, payout: 150000, deductions: 5000, otherExpenses: 20000, eng: 40000, sales: 50000, mktg: 30000, hr: 20000, other: 10000 },
      { date: '2026-01-02', revenue: 550000, payout: 160000, deductions: 8000, otherExpenses: 25000, eng: 45000, sales: 55000, mktg: 30000, hr: 20000, other: 10000 },
      { date: '2026-01-03', revenue: 480000, payout: 160000, deductions: 4000, otherExpenses: 20000, eng: 45000, sales: 55000, mktg: 30000, hr: 20000, other: 10000 },
    ];
    for (const d of demoData) {
      const newData: FinancialData = {
        id: crypto.randomUUID(),
        date: d.date,
        revenue: d.revenue,
        deductions: d.deductions,
        otherExpenses: d.otherExpenses,
        payout: d.payout,
        departmentPayouts: { engineering: d.eng, sales: d.sales, marketing: d.mktg, hrAdmin: d.hr, other: d.other },
        createdAt: Date.now()
      };
      await saveFinancialData(newData);
      setData(prev => [...prev, newData]);
    }
    setIsLoading(false);
  }

  const exportToPDF = () => {
    const element = document.getElementById('analytics-report')
    if (!element) return;
    
    const opt: any = {
      margin:       0.5,
      filename:     `HR_Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#f8fafc' },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
    }
    html2pdf().set(opt).from(element).save()
  }

  const totalRevenue = data.reduce((acc, curr) => acc + curr.revenue, 0)
  const totalPayouts = data.reduce((acc, curr) => acc + curr.payout, 0)
  const totalDeductions = data.reduce((acc, curr) => acc + curr.deductions, 0)
  const totalExpenses = data.reduce((acc, curr) => acc + curr.otherExpenses, 0)
  const netSavings = totalRevenue - (totalPayouts - totalDeductions) - totalExpenses
  const profitMargin = totalRevenue > 0 ? ((netSavings / totalRevenue) * 100).toFixed(1) : '0'

  const chartData = data.map(d => ({
    name: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
    Revenue: d.revenue,
    Expenses: d.payout + d.otherExpenses - d.deductions,
    Profit: d.revenue - (d.payout - d.deductions) - d.otherExpenses
  }))

  const calcPayout = Object.values(formData.departmentPayouts).reduce((a, b) => a + b, 0)

  // Pie Chart Data (Overall breakdown)
  const pieData = [
    { name: 'Net Profit', value: Math.max(0, netSavings), color: '#10b981' },
    { name: 'Employee Payouts', value: totalPayouts, color: '#f97316' },
    { name: 'Other Expenses', value: totalExpenses, color: '#64748b' },
    { name: 'Deductions (Recovered)', value: totalDeductions, color: '#a855f7' }
  ].filter(item => item.value > 0);

  // Department Payouts Chart Data
  const deptPayoutsData = data.map(d => ({
    name: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Engineering: d.departmentPayouts.engineering || 0,
    Sales: d.departmentPayouts.sales || 0,
    Marketing: d.departmentPayouts.marketing || 0,
    HR_Admin: d.departmentPayouts.hrAdmin || 0,
    Other: d.departmentPayouts.other || 0,
  }))

  return (
    <div className="space-y-8 pb-20 animate-fade-in relative z-10">
      
      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Live Data Sync
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Financial Insights</h1>
          <p className="text-slate-500 max-w-lg">
            Track revenue, payouts, and margins instantly. All data is securely synchronized via Firebase.
          </p>
        </div>
        
        {!isSuperAdmin && (
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setShowGuide(true)} className="group flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:shadow-md">
              <Icons.Info />
              How it Works
            </button>
            
            <button onClick={downloadTemplate} className="group flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-200 transition-all hover:bg-emerald-100 hover:shadow-md">
              <Icons.Download />
              Template
            </button>
            
            <label className="group flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:shadow-md">
              <Icons.Upload />
              Import CSV
              <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
            </label>
            
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            
            <button onClick={exportToCSV} className="group flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5">
              CSV
            </button>
            
            <button onClick={exportToPDF} className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/50 hover:-translate-y-0.5">
              Download PDF
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Revenue */}
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-1 hover:shadow-blue-500/40">
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl transition-transform group-hover:scale-150"></div>
          <div className="relative z-10 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">Total Revenue</p>
            <div className="rounded-xl bg-white/20 p-2 backdrop-blur-md">
              <Icons.ChartUp />
            </div>
          </div>
          <h3 className="relative z-10 mt-4 text-3xl font-bold tracking-tight">
            {isLoading ? '...' : `₹${totalRevenue.toLocaleString('en-IN')}`}
          </h3>
          <p className="relative z-10 mt-1 text-sm text-blue-100 opacity-90">All time gross income</p>
        </div>

        {/* Card 2: Payouts */}
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-400 to-rose-500 p-6 text-white shadow-xl shadow-orange-500/20 transition-all hover:-translate-y-1 hover:shadow-orange-500/40">
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl transition-transform group-hover:scale-150"></div>
          <div className="relative z-10 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-100">Employee Payouts</p>
            <div className="rounded-xl bg-white/20 p-2 backdrop-blur-md">
              <Icons.Users />
            </div>
          </div>
          <h3 className="relative z-10 mt-4 text-3xl font-bold tracking-tight">
            {isLoading ? '...' : `₹${totalPayouts.toLocaleString('en-IN')}`}
          </h3>
          <p className="relative z-10 mt-1 text-sm text-orange-100 opacity-90">Total salaries dispatched</p>
        </div>

        {/* Card 3: Deductions */}
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500 to-fuchsia-600 p-6 text-white shadow-xl shadow-purple-500/20 transition-all hover:-translate-y-1 hover:shadow-purple-500/40">
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl transition-transform group-hover:scale-150"></div>
          <div className="relative z-10 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-100">Total Deductions</p>
            <div className="rounded-xl bg-white/20 p-2 backdrop-blur-md">
              <Icons.Scissors />
            </div>
          </div>
          <h3 className="relative z-10 mt-4 text-3xl font-bold tracking-tight">
            {isLoading ? '...' : `₹${totalDeductions.toLocaleString('en-IN')}`}
          </h3>
          <p className="relative z-10 mt-1 text-sm text-purple-100 opacity-90">Recovered amounts</p>
        </div>

        {/* Card 4: Profit */}
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 p-6 text-white shadow-xl shadow-emerald-500/20 transition-all hover:-translate-y-1 hover:shadow-emerald-500/40">
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl transition-transform group-hover:scale-150"></div>
          <div className="relative z-10 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">Net Savings/Profit</p>
            <div className="rounded-xl bg-white/20 p-2 backdrop-blur-md">
              <Icons.Safe />
            </div>
          </div>
          <h3 className="relative z-10 mt-4 text-3xl font-bold tracking-tight">
            {isLoading ? '...' : `₹${netSavings.toLocaleString('en-IN')}`}
          </h3>
          <div className="relative z-10 mt-1 flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-md">{profitMargin}%</span>
            <span className="text-sm text-emerald-100 opacity-90">Final safe margin</span>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-12" id="analytics-report">
        
        {/* ADD DATA FORM SIDEBAR */}
        {!isSuperAdmin && (
          <div className="lg:col-span-4" data-html2canvas-ignore>
            <div className="sticky top-24 rounded-3xl border border-white/40 bg-white/60 p-6 shadow-2xl shadow-slate-200/50 backdrop-blur-xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Log Financial Data</h2>
              <p className="text-sm text-slate-500 mt-1">Record the monthly flow of funds securely.</p>
            </div>
            
            <form className="space-y-5" onSubmit={handleFormSubmit}>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Date</label>
                <input 
                  type="date"
                  className="w-full rounded-xl border-0 bg-slate-100/50 px-4 py-3 text-sm text-slate-900 shadow-inner ring-1 ring-inset ring-slate-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all outline-none"
                  value={formData.date}
                  onChange={e => handleDateChange(e.target.value)}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Revenue (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-400">₹</span>
                  <input 
                    type="number" 
                    className="w-full rounded-xl border-0 bg-slate-100/50 py-3 pl-8 pr-4 text-sm text-slate-900 shadow-inner ring-1 ring-inset ring-slate-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all outline-none"
                    value={formData.revenue || ''}
                    onChange={e => setFormData({...formData, revenue: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="mb-4 block text-xs font-bold uppercase tracking-wider text-slate-500">Department Payouts</label>
                <div className="space-y-3">
                  {[
                    { key: 'engineering', label: 'Engineering' },
                    { key: 'sales', label: 'Sales' },
                    { key: 'marketing', label: 'Marketing' },
                    { key: 'hrAdmin', label: 'HR & Admin' },
                    { key: 'other', label: 'Other' }
                  ].map(dept => (
                    <div key={dept.key} className="flex items-center justify-between group">
                      <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{dept.label}</span>
                      <div className="relative w-28">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">₹</span>
                        <input 
                          type="number" 
                          className="w-full rounded-lg border-0 bg-white py-1.5 pl-6 pr-2 text-right text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none transition-shadow"
                          value={formData.departmentPayouts[dept.key as keyof typeof formData.departmentPayouts] || ''} 
                          onChange={e => handleDepartmentChange(dept.key as any, e.target.value)} 
                        />
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Payout</span>
                    <span className="text-sm font-bold text-slate-900 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md">₹{calcPayout.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Cuts (₹)</label>
                  <input 
                    type="number" 
                    className="w-full rounded-xl border-0 bg-slate-100/50 px-4 py-3 text-sm text-slate-900 shadow-inner ring-1 ring-inset ring-slate-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all outline-none"
                    value={formData.deductions || ''}
                    onChange={e => setFormData({...formData, deductions: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Expenses (₹)</label>
                  <input 
                    type="number" 
                    className="w-full rounded-xl border-0 bg-slate-100/50 px-4 py-3 text-sm text-slate-900 shadow-inner ring-1 ring-inset ring-slate-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all outline-none"
                    value={formData.otherExpenses || ''}
                    onChange={e => setFormData({...formData, otherExpenses: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSaving}
                className="mt-6 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Financial Data'}
              </button>
            </form>
          </div>
        </div>
        )}

        {/* CHARTS & TABLE MAIN CONTENT */}
        <div className={isSuperAdmin ? "lg:col-span-12 space-y-8" : "lg:col-span-8 space-y-8"}>
          
          {!isSuperAdmin && (
            <div className="flex justify-end">
              <button onClick={() => setShowVisualsModal(true)} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-500/40">
                <span className="flex items-center gap-2">
                  <Icons.ChartUp /> View Analytics Visuals
                </span>
              </button>
            </div>
          )}

          {/* INTERACTIVE CHARTS (Shown inline ONLY for Super Admin) */}
          {isSuperAdmin && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-slate-200/60 bg-white/60 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-xl">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Trends & Margins</h2>
                <p className="text-sm text-slate-500">Visualize revenue against expenses.</p>
              </div>
              
              <div className="h-[250px] w-full">
                {data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val/1000}k`} dx={-10} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontWeight: 600 }}
                        formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, undefined]}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontWeight: 500 }} />
                      <Bar dataKey="Revenue" barSize={10} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Expenses" barSize={10} fill="#f97316" radius={[4, 4, 0, 0]} />
                      <Area type="monotone" dataKey="Profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-slate-400">
                    <p className="mb-4">{isLoading ? 'Fetching insights...' : 'No data to display. Please log a record.'}</p>
                    {!isLoading && (
                      <button onClick={loadDemoData} className="rounded-xl bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200 transition">
                        Load Demo Data
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/60 bg-white/60 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-xl">
              <div className="mb-2">
                <h2 className="text-xl font-bold text-slate-900">Overall Distribution</h2>
                <p className="text-sm text-slate-500">Where the total revenue goes.</p>
              </div>
              
              <div className="h-[250px] w-full">
                {data.length > 0 && pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontWeight: 600 }}
                        formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, undefined]}
                      />
                      <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right"
                        iconType="circle" 
                        wrapperStyle={{ fontSize: '11px', fontWeight: 500 }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    {isLoading ? '...' : 'No data to map'}
                  </div>
                )}
              </div>
            </div>
            
            {isSuperAdmin && (
              <div className="rounded-3xl border border-slate-200/60 bg-white/60 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-xl md:col-span-2 xl:col-span-1">
                <div className="mb-2">
                  <h2 className="text-xl font-bold text-slate-900">Department Payouts Breakdown</h2>
                  <p className="text-sm text-slate-500">Analyze the salary distribution across teams.</p>
                </div>
                
                <div className="h-[250px] w-full mt-4">
                  {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={deptPayoutsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val/1000}k`} dx={-10} />
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ fontWeight: 600 }}
                          formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, undefined]}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontWeight: 500 }} />
                        <Bar dataKey="Engineering" stackId="a" fill="#3b82f6" />
                        <Bar dataKey="Sales" stackId="a" fill="#10b981" />
                        <Bar dataKey="Marketing" stackId="a" fill="#f59e0b" />
                        <Bar dataKey="HR_Admin" stackId="a" fill="#8b5cf6" />
                        <Bar dataKey="Other" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      {isLoading ? '...' : 'No data to map'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          )}

          {/* BREAKDOWN TABLE */}
          {!isSuperAdmin && (
            <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white/60 shadow-xl shadow-slate-200/40 backdrop-blur-xl">
              <div className="border-b border-slate-100 p-6">
                <h2 className="text-xl font-bold text-slate-900">Historical Records</h2>
              <p className="text-sm text-slate-500">Detailed month-by-month financial ledger.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-4">Period</th>
                    <th className="px-6 py-4">Revenue</th>
                    <th className="px-6 py-4">Total Payout</th>
                    <th className="px-6 py-4 hidden 2xl:table-cell">Dept Breakdown</th>
                    <th className="px-6 py-4">Cuts/Exp</th>
                    <th className="px-6 py-4">Net Profit</th>
                    {!isSuperAdmin && <th className="px-6 py-4 text-right" data-html2canvas-ignore>Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        {isLoading ? 'Loading records...' : 'No records found. Data is safely stored in Firebase once logged.'}
                      </td>
                    </tr>
                  ) : (
                    data.map((row) => {
                      const safe = row.revenue - (row.payout - row.deductions) - row.otherExpenses;
                      const isProfit = safe >= 0;
                      
                      return (
                        <tr key={row.id} className="group hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4 font-semibold text-blue-600">₹{row.revenue.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-4 font-semibold text-orange-600">₹{row.payout.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-4 hidden 2xl:table-cell">
                            <div className="text-[10px] space-y-1 font-medium text-slate-500">
                              <div className="flex justify-between w-28"><span>Eng:</span> <span className="text-slate-700">₹{row.departmentPayouts?.engineering?.toLocaleString('en-IN') || 0}</span></div>
                              <div className="flex justify-between w-28"><span>Sales:</span> <span className="text-slate-700">₹{row.departmentPayouts?.sales?.toLocaleString('en-IN') || 0}</span></div>
                              <div className="flex justify-between w-28"><span>Mktg:</span> <span className="text-slate-700">₹{row.departmentPayouts?.marketing?.toLocaleString('en-IN') || 0}</span></div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-purple-600">
                            -₹{(row.deductions + row.otherExpenses).toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${isProfit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {isProfit ? '+' : '-'}₹{Math.abs(safe).toLocaleString('en-IN')}
                            </span>
                          </td>
                          {!isSuperAdmin && (
                            <td className="px-6 py-4 text-right" data-html2canvas-ignore>
                              <button 
                                onClick={() => handleDelete(row.id)}
                                className="inline-flex items-center text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* GUIDE MODAL */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in" data-html2canvas-ignore>
          <div className="w-full max-w-2xl transform rounded-3xl bg-white p-8 shadow-2xl transition-all">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Platform Guide</h2>
              <button onClick={() => setShowGuide(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="space-y-6 text-sm text-slate-600 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="rounded-2xl bg-blue-50 p-4 border border-blue-100">
                <p className="text-blue-800">Welcome to the Financial Analytics module. This tool allows HR and Admins to safely track and visualize company performance over time.</p>
              </div>
              
              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-xs">1</span>
                  Adding Data
                </h3>
                <p className="pl-8 leading-relaxed">Use the <strong>Log Financial Data</strong> form to record your monthly figures. Revenue is your total income. Instead of entering one lump sum for employee salaries, break it down by department. The system will automatically calculate the total payout.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-xs">2</span>
                  Interactive Trends
                </h3>
                <p className="pl-8 leading-relaxed mb-3">The <strong>Trends & Margins</strong> chart dynamically updates based on your data.</p>
                <ul className="pl-8 space-y-2 list-disc ml-4 text-slate-500">
                  <li><span className="text-blue-600 font-bold">Blue bars</span> represent total revenue.</li>
                  <li><span className="text-orange-600 font-bold">Orange bars</span> represent total expenses (Payouts + Other Expenses - Deductions).</li>
                  <li><span className="text-emerald-600 font-bold">Green area line</span> shows your Net Profit/Safe margin trajectory.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-xs">3</span>
                  Import & Export
                </h3>
                <p className="pl-8 leading-relaxed"><strong>Export CSV/PDF:</strong> Click these buttons to download a professional report of your data for external stakeholders.</p>
                <p className="pl-8 leading-relaxed mt-2"><strong>Import CSV:</strong> You can bulk upload historical data by downloading the template via the <strong>Template</strong> button, filling it out using Excel or Google Sheets, and then uploading it back using the <strong>Import CSV</strong> button.</p>
              </div>
            </div>
            
            <button 
              onClick={() => setShowGuide(false)}
              className="mt-8 w-full rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white shadow-xl shadow-slate-900/20 transition-all hover:bg-slate-800 hover:-translate-y-0.5"
            >
              Let's get started
            </button>
          </div>
        </div>
      )}

      {/* VISUALS MODAL FOR ADMIN */}
      {showVisualsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-200/60 p-4 backdrop-blur-2xl animate-fade-in custom-scrollbar">
          <div className="min-h-full flex flex-col justify-center max-w-7xl mx-auto w-full py-10">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight drop-shadow-sm">Financial Analytics Overview</h2>
                <p className="text-slate-600 mt-2 font-medium">A high-level visual breakdown of your financial data.</p>
              </div>
              <button onClick={() => setShowVisualsModal(false)} className="rounded-full bg-white p-3.5 text-slate-500 hover:bg-slate-50 hover:text-rose-500 shadow-xl shadow-slate-200/50 border border-slate-100 transition-all hover:rotate-90 hover:scale-110">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Card 1 */}
              <div className="rounded-[2.5rem] border border-white/60 bg-white/70 p-8 shadow-2xl shadow-slate-200/50 backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-slate-300/60">
                <div className="mb-8">
                  <h2 className="text-2xl font-extrabold text-slate-900">Trends & Margins</h2>
                  <p className="text-sm font-semibold text-slate-500 mt-1">Visualize revenue against expenses.</p>
                </div>
                
                <div className="h-[380px] w-full">
                  {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorProfitLight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b', fontWeight: 600 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b', fontWeight: 600 }} tickFormatter={(val) => `₹${val/1000}k`} dx={-10} />
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '20px', border: '1px solid #f1f5f9', backgroundColor: '#ffffff', color: '#0f172a', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }}
                          itemStyle={{ fontWeight: 700 }}
                          formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, undefined]}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px', fontWeight: 700, color: '#334155' }} />
                        <Bar dataKey="Revenue" barSize={16} fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Expenses" barSize={16} fill="#f97316" radius={[6, 6, 0, 0]} />
                        <Area type="monotone" dataKey="Profit" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorProfitLight)" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center font-bold text-slate-400">No data available</div>
                  )}
                </div>
              </div>

              {/* Card 2 */}
              <div className="rounded-[2.5rem] border border-white/60 bg-white/70 p-8 shadow-2xl shadow-slate-200/50 backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-slate-300/60">
                <div className="mb-4">
                  <h2 className="text-2xl font-extrabold text-slate-900">Overall Distribution</h2>
                  <p className="text-sm font-semibold text-slate-500 mt-1">Where the total revenue goes.</p>
                </div>
                
                <div className="h-[380px] w-full">
                  {data.length > 0 && pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={90}
                          outerRadius={130}
                          paddingAngle={6}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '20px', border: '1px solid #f1f5f9', backgroundColor: '#ffffff', color: '#0f172a', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }}
                          itemStyle={{ fontWeight: 700 }}
                          formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, undefined]}
                        />
                        <Legend 
                          layout="vertical" 
                          verticalAlign="middle" 
                          align="right"
                          iconType="circle" 
                          wrapperStyle={{ fontSize: '13px', fontWeight: 700, color: '#334155' }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center font-bold text-slate-400">No data available</div>
                  )}
                </div>
              </div>
              
              {/* Card 3 */}
              <div className="rounded-[2.5rem] border border-white/60 bg-white/70 p-8 shadow-2xl shadow-slate-200/50 backdrop-blur-xl xl:col-span-2 transition-all hover:-translate-y-1 hover:shadow-slate-300/60">
                <div className="mb-8">
                  <h2 className="text-2xl font-extrabold text-slate-900">Department Payouts Breakdown</h2>
                  <p className="text-sm font-semibold text-slate-500 mt-1">Distribution of salary expenses across departments over time.</p>
                </div>
                <div className="h-[400px] w-full">
                  {deptPayoutsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={deptPayoutsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b', fontWeight: 600 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b', fontWeight: 600 }} tickFormatter={(val) => `₹${val/1000}k`} dx={-10} />
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '20px', border: '1px solid #f1f5f9', backgroundColor: '#ffffff', color: '#0f172a', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }}
                          itemStyle={{ fontWeight: 700 }}
                          formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, undefined]}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px', fontWeight: 700, color: '#334155' }} />
                        <Bar dataKey="Engineering" stackId="a" fill="#0ea5e9" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Sales" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Marketing" stackId="a" fill="#ec4899" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="HR_Admin" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Other" stackId="a" fill="#64748b" radius={[6, 6, 0, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center font-bold text-slate-400">No data available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
