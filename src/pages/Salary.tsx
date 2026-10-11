import { useEffect, useState, useMemo, useRef } from 'react'
import { format, subMonths, addMonths } from 'date-fns'
import Papa from 'papaparse'
import Card from '../components/Card'
import Button from '../components/Button'
import { 
  computeMonthlyPayroll, 
  saveWorkingDaysSetting, 
  savePayrollAdjustments, 
  saveMonthlyPayrollSnapshot, 
  getMonthlyPayrollSnapshot
} from '../services/salaryService'
import { getAttendanceForMonth } from '../services/attendanceService'
import { updateEmployee } from '../services/employeeService'
import { useAuth } from '../context/AuthContext'
import type { EmployeeSalaryCalculation, MonthlyPayrollSnapshot, SalaryAdjustment } from '../types/salary'
import type { AttendanceRecord } from '../types/attendance'
import AttendanceSheetGrid from '../components/AttendanceSheetGrid'
import { 
  Calendar, 
  DollarSign, 
  Edit, 
  Download, 
  Upload, 
  Lock,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react'

export default function Salary() {
  const { user, isSuperAdmin } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [activeTab, setActiveTab] = useState<'payroll' | 'attendance-sheet'>('payroll')

  const [payrollData, setPayrollData] = useState<{
    records: EmployeeSalaryCalculation[]
    workingDays: number
    passedWorkingDays: number
    upcomingDays: number
    totalBudget: number
    totalDeductionsSoFar: number
    totalEarnedTillToday: number
    totalProjectedPayout: number
    employeeCount: number
    avgAttendanceRate: number
  } | null>(null)

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [snapshot, setSnapshot] = useState<MonthlyPayrollSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Working days edit state
  const [isEditingWorkingDays, setIsEditingWorkingDays] = useState(false)
  const [customWorkingDays, setCustomWorkingDays] = useState<number>(27)

  // Single employee salary edit state
  const [editingEmployee, setEditingEmployee] = useState<EmployeeSalaryCalculation | null>(null)
  const [newSalaryInput, setNewSalaryInput] = useState<string>('')
  const [isSavingSalary, setIsSavingSalary] = useState(false)

  // Single employee adjustment / correction modal state
  const [adjustingEmployee, setAdjustingEmployee] = useState<EmployeeSalaryCalculation | null>(null)
  const [adjustmentForm, setAdjustmentForm] = useState<SalaryAdjustment>({
    employeeId: '',
    presentAdjustment: 0,
    halfDayAdjustment: 0,
    paidLeaveAdjustment: 0,
    bonus: 0,
    customDeduction: 0,
    notes: ''
  })
  const [isSavingAdjustment, setIsSavingAdjustment] = useState(false)

  // Payslip modal state
  const [payslipEmployee, setPayslipEmployee] = useState<EmployeeSalaryCalculation | null>(null)
  const payslipRef = useRef<HTMLDivElement | null>(null)

  // Bulk Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importCsvText, setImportCsvText] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null)

  // Finalize snapshot state
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const monthKey = useMemo(() => format(selectedMonth, 'yyyy-MM'), [selectedMonth])
  const formattedMonthName = useMemo(() => format(selectedMonth, 'MMMM yyyy'), [selectedMonth])

  // Access Control: Only HR/Admin can view this page
  if (!user || (!isSuperAdmin && (user as any).role?.toLowerCase() === 'employee')) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="max-w-md p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500">
            Please sign in as HR or Administrator to access the Salary and Payroll Management portal.
          </p>
        </Card>
      </div>
    )
  }

  // Load payroll and raw attendance data whenever month changes
  const loadPayroll = async () => {
    setIsLoading(true)
    try {
      const [computed, existingSnapshot, monthlyAttendance] = await Promise.all([
        computeMonthlyPayroll(monthKey),
        getMonthlyPayrollSnapshot(monthKey),
        getAttendanceForMonth(monthKey)
      ])
      setPayrollData(computed)
      setCustomWorkingDays(computed.workingDays)
      setSnapshot(existingSnapshot)
      setAttendanceRecords(monthlyAttendance)
    } catch (err) {
      console.error('Failed to load payroll calculation:', err)
      showNotification('error', 'Failed to calculate salary records from attendance.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadPayroll()
  }, [monthKey])

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  // Handle Working Days Save
  const handleSaveWorkingDays = async () => {
    if (customWorkingDays <= 0 || customWorkingDays > 31) {
      alert('Please enter a valid number of working days between 1 and 31.')
      return
    }

    setIsLoading(true)
    try {
      await saveWorkingDaysSetting(monthKey, customWorkingDays)
      setIsEditingWorkingDays(false)
      await loadPayroll()
      showNotification('success', `Working days updated to ${customWorkingDays} days for ${formattedMonthName}.`)
    } catch (err) {
      console.error(err)
      showNotification('error', 'Failed to save working days.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Save Base Salary for Employee
  const handleSaveBaseSalary = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEmployee) return

    const parsedSalary = parseFloat(newSalaryInput)
    if (isNaN(parsedSalary) || parsedSalary < 0) {
      alert('Please enter a valid monthly salary amount.')
      return
    }

    setIsSavingSalary(true)
    try {
      await updateEmployee(editingEmployee.id, { salary: parsedSalary })
      setEditingEmployee(null)
      await loadPayroll()
      showNotification('success', `Base salary for ${editingEmployee.name} updated to ₹${parsedSalary.toLocaleString('en-IN')}.`)
    } catch (err) {
      console.error(err)
      showNotification('error', 'Failed to update employee salary.')
    } finally {
      setIsSavingSalary(false)
    }
  }

  // Handle Open Adjustment Modal
  const handleOpenAdjustmentModal = (record: EmployeeSalaryCalculation) => {
    setAdjustingEmployee(record)
    setAdjustmentForm({
      employeeId: record.employeeId,
      presentAdjustment: 0,
      halfDayAdjustment: 0,
      paidLeaveAdjustment: record.paidLeaveDays || 0,
      bonus: record.bonus || 0,
      customDeduction: record.customDeduction || 0,
      notes: record.notes || ''
    })
  }

  // Handle Save Attendance / Salary Adjustment
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustingEmployee) return

    setIsSavingAdjustment(true)
    try {
      const currentAdjustments = await import('../services/salaryService').then(m => m.getPayrollAdjustments(monthKey))
      currentAdjustments[adjustingEmployee.employeeId] = {
        ...adjustmentForm,
        employeeId: adjustingEmployee.employeeId,
      }

      await savePayrollAdjustments(monthKey, currentAdjustments)
      setAdjustingEmployee(null)
      await loadPayroll()
      showNotification('success', `Salary adjustment applied for ${adjustingEmployee.name}.`)
    } catch (err) {
      console.error(err)
      showNotification('error', 'Failed to save salary adjustments.')
    } finally {
      setIsSavingAdjustment(false)
    }
  }

  // Handle Finalize Month Snapshot
  const handleFinalizeSnapshot = async () => {
    if (!payrollData) return
    const confirmed = window.confirm(
      `Are you sure you want to finalize and lock payroll for ${formattedMonthName}? This will preserve an official snapshot record so future attendance edits do not alter past payslips.`
    )
    if (!confirmed) return

    setIsFinalizing(true)
    try {
      const snapshotPayload: MonthlyPayrollSnapshot = {
        monthKey,
        monthName: formattedMonthName,
        workingDays: payrollData.workingDays,
        passedWorkingDays: payrollData.passedWorkingDays,
        upcomingDays: payrollData.upcomingDays,
        totalBudget: payrollData.totalBudget,
        totalDeductionsSoFar: payrollData.totalDeductionsSoFar,
        totalEarnedTillToday: payrollData.totalEarnedTillToday,
        totalProjectedPayout: payrollData.totalProjectedPayout,
        totalDeductions: payrollData.totalDeductionsSoFar,
        totalPayable: payrollData.totalProjectedPayout,
        employeeCount: payrollData.employeeCount,
        avgAttendanceRate: payrollData.avgAttendanceRate,
        finalizedAt: new Date().toISOString(),
        finalizedBy: user?.email || 'HR Admin',
        records: payrollData.records,
      }

      await saveMonthlyPayrollSnapshot(snapshotPayload)
      setSnapshot(snapshotPayload)
      showNotification('success', `Payroll for ${formattedMonthName} finalized successfully!`)
    } catch (err) {
      console.error(err)
      showNotification('error', 'Failed to finalize monthly payroll.')
    } finally {
      setIsFinalizing(false)
    }
  }

  // Export to CSV / Excel
  const handleExportCSV = () => {
    if (!payrollData || payrollData.records.length === 0) {
      alert('No payroll data to export.')
      return
    }

    const rows = payrollData.records.map((r) => ({
      'Employee ID': r.employeeId,
      'Employee Name': r.name,
      'Role / Department': r.role,
      'Monthly Salary (INR)': r.monthlySalary,
      'Working Days in Month': r.workingDays,
      'Passed Working Days': r.passedWorkingDays,
      'Upcoming Days': r.upcomingDays,
      'Present Days': r.presentDays,
      'Half Days': r.halfDays,
      'Paid Leave Days': r.paidLeaveDays,
      'Absent (So Far)': r.absentDays,
      'Per-Day Pay (INR)': r.perDayPay,
      'Deduction So Far (INR)': r.deductionSoFar,
      'Earned Till Today (INR)': r.earnedTillToday,
      'Projected Month-End Salary (INR)': r.projectedMonthEnd,
      'Bonus / Incentives (INR)': r.bonus,
      'Custom Deductions (INR)': r.customDeduction,
      'Status': r.isManualCorrection ? 'Adjusted / Corrected' : 'Calculated',
      'Notes': r.notes || ''
    }))

    const csvString = Papa.unparse(rows)
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Mentneo_Salary_Report_${monthKey}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Handle Bulk Import Salaries
  const handleBulkImportSalaries = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importCsvText.trim() || !payrollData) return

    setIsImporting(true)
    setImportResult(null)

    try {
      const parsed = Papa.parse<{ 'Employee ID'?: string; ID?: string; empId?: string; Name?: string; Salary?: string; 'Monthly Salary'?: string }>(
        importCsvText.trim(),
        { header: true, skipEmptyLines: true }
      )

      let successCount = 0
      let failedCount = 0

      for (const row of parsed.data) {
        const empId = (row['Employee ID'] || row.ID || row.empId || '').trim().toUpperCase()
        const name = (row.Name || '').trim().toLowerCase()
        const rawSalary = row.Salary || row['Monthly Salary'] || ''
        const cleanSalary = parseFloat(rawSalary.replace(/[^0-9.]/g, ''))

        if (isNaN(cleanSalary) || cleanSalary < 0) {
          failedCount++
          continue
        }

        const match = payrollData.records.find(
          (r) =>
            (empId && r.employeeId.toUpperCase() === empId) ||
            (name && r.name.toLowerCase() === name)
        )

        if (match) {
          await updateEmployee(match.id, { salary: cleanSalary })
          successCount++
        } else {
          failedCount++
        }
      }

      setImportResult({ success: successCount, failed: failedCount })
      await loadPayroll()
      showNotification('success', `Import complete: ${successCount} updated, ${failedCount} skipped.`)
    } catch (err) {
      console.error(err)
      showNotification('error', 'Failed to process import file.')
    } finally {
      setIsImporting(false)
    }
  }

  // Filtered records
  const filteredRecords = useMemo(() => {
    if (!payrollData) return []
    if (!searchQuery.trim()) return payrollData.records

    const query = searchQuery.toLowerCase().trim()
    return payrollData.records.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.employeeId.toLowerCase().includes(query) ||
        r.role.toLowerCase().includes(query)
    )
  }, [payrollData, searchQuery])

  return (
    <div className="space-y-6 animate-rise pb-24 max-w-7xl mx-auto font-sans">
      
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 rounded-2xl px-5 py-3.5 text-xs font-bold shadow-2xl border flex items-center gap-2 animate-rise ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30'
              : 'bg-rose-600 text-white border-rose-500 shadow-rose-600/30'
          }`}
        >
          <span>{notification.type === 'success' ? '✓' : '⚠️'}</span>
          {notification.message}
        </div>
      )}

      {/* Header & Month Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              HR Payroll & Attendance
            </span>
            {snapshot && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                Finalized
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Salary & Payroll Management</h1>
          <p className="text-slate-500 text-xs mt-1">
            Real-time attendance-linked payroll calculations. Only passed days count towards deductions.
          </p>
        </div>

        {/* Month Navigation & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-2xl shadow-sm p-1">
            <button
              onClick={() => setSelectedMonth((prev) => subMonths(prev, 1))}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 min-w-[120px] text-center">
              {formattedMonthName}
            </span>
            <button
              onClick={() => setSelectedMonth((prev) => addMonths(prev, 1))}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <Button
            onClick={() => setIsImportModalOpen(true)}
            variant="outline"
            className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold px-3.5 py-2 rounded-xl"
          >
            <Upload className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Import Salaries
          </Button>

          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold px-3.5 py-2 rounded-xl"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Export Payroll
          </Button>

          <Button
            onClick={handleFinalizeSnapshot}
            disabled={isFinalizing || isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-emerald-600/20"
          >
            <Lock className="w-3.5 h-3.5 mr-1" />
            {isFinalizing ? 'Finalizing...' : snapshot ? 'Re-Finalize' : 'Finalize Month'}
          </Button>
        </div>
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('payroll')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'payroll'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Payroll Summary</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance-sheet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'attendance-sheet'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Attendance Sheet (Excel Matrix)</span>
        </button>
      </div>

      {/* KPI Overview Metrics Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total Monthly Budget */}
        <Card className="p-5 border border-slate-200/80 shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Monthly Budget</p>
          <h3 className="mt-2 text-2xl lg:text-3xl font-black text-slate-900 font-mono">
            ₹{(payrollData?.totalBudget || 0).toLocaleString('en-IN')}
          </h3>
          <p className="text-xs text-slate-400 mt-1">{payrollData?.employeeCount || 0} active employees</p>
        </Card>

        {/* Deductions so far */}
        <Card className="p-5 border border-slate-200/80 shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deductions So Far</p>
          <h3 className="mt-2 text-2xl lg:text-3xl font-black text-rose-600 font-mono">
            -₹{(payrollData?.totalDeductionsSoFar || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-rose-500 mt-1">Absences on passed days</p>
        </Card>

        {/* Earned Till Today */}
        <Card className="p-5 border border-slate-200/80 shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Earned Till Today</p>
          <h3 className="mt-2 text-2xl lg:text-3xl font-black text-sky-700 font-mono">
            ₹{(payrollData?.totalEarnedTillToday || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-sky-600 font-medium mt-1">Accrued up to today</p>
        </Card>

        {/* Projected Month-End Payout */}
        <Card className="p-5 border border-slate-200/80 shadow-md bg-gradient-to-br from-emerald-50 to-teal-50/40 border-emerald-200">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Projected Payout</p>
            {!isEditingWorkingDays && (
              <button
                onClick={() => setIsEditingWorkingDays(true)}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline"
              >
                Edit Days
              </button>
            )}
          </div>

          {isEditingWorkingDays ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="31"
                value={customWorkingDays}
                onChange={(e) => setCustomWorkingDays(parseInt(e.target.value, 10) || 1)}
                className="w-16 rounded-xl border border-slate-300 px-2 py-1 text-sm font-bold text-slate-900"
              />
              <button
                onClick={handleSaveWorkingDays}
                className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white hover:bg-slate-800"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditingWorkingDays(false)}
                className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>
          ) : (
            <h3 className="mt-2 text-2xl lg:text-3xl font-black text-emerald-700 font-mono">
              ₹{(payrollData?.totalProjectedPayout || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          )}

          <p className="text-xs text-emerald-700 mt-1">
            {payrollData?.workingDays || 27} Days ({payrollData?.passedWorkingDays || 0} Passed, {payrollData?.upcomingDays || 0} Upcoming) • Avg: {payrollData?.avgAttendanceRate || 0}%
          </p>
        </Card>
      </div>

      {/* ============================================================= */}
      {/* TAB 1: PAYROLL SUMMARY VIEW                                   */}
      {/* ============================================================= */}
      {activeTab === 'payroll' && (
        <Card className="border border-slate-200/80 shadow-xl overflow-hidden p-0 animate-rise">
          {/* Table Top Search Controls */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Employee Payroll Breakdown</h3>
              <p className="text-xs text-slate-500">
                Absences and deductions are calculated only on passed working days ({payrollData?.passedWorkingDays || 0} days). Remaining {payrollData?.upcomingDays || 0} days are upcoming.
              </p>
            </div>

            <div className="relative max-w-xs w-full">
              <input
                type="text"
                placeholder="Search employee by name, ID, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 pl-9 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <svg
                className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Main Table View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-4 py-3.5">Monthly Salary</th>
                  <th className="px-2.5 py-3.5 text-center">Present</th>
                  <th className="px-2.5 py-3.5 text-center">Half Day</th>
                  <th className="px-2.5 py-3.5 text-center text-rose-600">Absent (So Far)</th>
                  <th className="px-2.5 py-3.5 text-center text-slate-500">Upcoming</th>
                  <th className="px-3.5 py-3.5 text-right">Per-Day Pay</th>
                  <th className="px-3.5 py-3.5 text-right text-rose-600">Deduction (So Far)</th>
                  <th className="px-3.5 py-3.5 text-right text-sky-700">Earned Till Today</th>
                  <th className="px-4 py-3.5 text-right font-black text-emerald-900">Projected Month-End</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-600 animate-spin"></div>
                        <p className="text-xs font-bold">Computing monthly salary calculations...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      No employees matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Employee Info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {record.profileImageUrl ? (
                            <img
                              src={record.profileImageUrl}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold text-xs shrink-0">
                              {record.name.charAt(0)}
                            </div>
                          )}
                          <div className="truncate">
                            <p className="font-bold text-slate-900 truncate">{record.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-slate-400">{record.employeeId}</span>
                              <span className="text-[10px] text-slate-500">• {record.role}</span>
                              {record.isManualCorrection && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800" title="Manual correction applied">
                                  Adjusted
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Monthly Base Salary (Set Salary button if 0) */}
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                        {record.monthlySalary > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span>₹{record.monthlySalary.toLocaleString('en-IN')}</span>
                            <button
                              onClick={() => {
                                setEditingEmployee(record)
                                setNewSalaryInput(String(record.monthlySalary))
                              }}
                              className="text-slate-400 hover:text-emerald-600 transition"
                              title="Edit Monthly Salary"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingEmployee(record)
                              setNewSalaryInput('')
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Set salary</span>
                          </button>
                        )}
                      </td>

                      {/* Present Days */}
                      <td className="px-2.5 py-3.5 text-center font-mono font-bold text-emerald-600">
                        <span className="inline-block bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          {record.presentDays}
                        </span>
                      </td>

                      {/* Half Days */}
                      <td className="px-2.5 py-3.5 text-center font-mono text-amber-600">
                        {record.halfDays > 0 ? (
                          <span className="inline-block bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
                            {record.halfDays}
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>

                      {/* Absent Days (Only on passed days!) */}
                      <td className="px-2.5 py-3.5 text-center font-mono">
                        {record.absentDays > 0 ? (
                          <span className="inline-block bg-rose-50 border border-rose-200 text-rose-600 px-2 py-0.5 rounded-md font-bold">
                            {record.absentDays}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">0</span>
                        )}
                      </td>

                      {/* Upcoming Days (Never in red, never deducted) */}
                      <td className="px-2.5 py-3.5 text-center font-mono">
                        <span className="inline-block bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-medium text-[11px]">
                          {record.upcomingDays}
                        </span>
                      </td>

                      {/* Per Day Pay */}
                      <td className="px-3.5 py-3.5 text-right font-mono text-slate-600">
                        {record.monthlySalary > 0 ? `₹${record.perDayPay.toFixed(2)}` : '₹0.00'}
                      </td>

                      {/* Deduction So Far */}
                      <td className="px-3.5 py-3.5 text-right font-mono font-bold text-rose-600">
                        {record.deductionSoFar > 0 ? `-₹${record.deductionSoFar.toFixed(2)}` : '₹0.00'}
                      </td>

                      {/* Earned Till Today */}
                      <td className="px-3.5 py-3.5 text-right font-mono font-bold text-sky-700 bg-sky-50/20">
                        ₹{record.earnedTillToday.toFixed(2)}
                      </td>

                      {/* Projected Month-End Salary */}
                      <td className="px-4 py-3.5 text-right font-mono font-black text-sm text-emerald-700 bg-emerald-50/30">
                        ₹{record.projectedMonthEnd.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenAdjustmentModal(record)}
                            className="rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 text-[11px] transition"
                            title="Adjust days / missed punches"
                          >
                            Adjust
                          </button>
                          <button
                            onClick={() => setPayslipEmployee(record)}
                            className="rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold px-2 py-1 text-[11px] transition"
                            title="View Payslip"
                          >
                            Payslip
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Table Footer Totals */}
              {payrollData && payrollData.records.length > 0 && (
                <tfoot className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-200">
                  <tr>
                    <td className="px-5 py-4 font-black">Total ({payrollData.records.length} Staff)</td>
                    <td className="px-4 py-4 font-mono font-black">₹{payrollData.totalBudget.toLocaleString('en-IN')}</td>
                    <td colSpan={4}></td>
                    <td className="px-3.5 py-4 text-right text-slate-500 uppercase text-[10px]">Total:</td>
                    <td className="px-3.5 py-4 text-right font-mono text-rose-600 font-black">
                      -₹{payrollData.totalDeductionsSoFar.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3.5 py-4 text-right font-mono text-sky-700 font-black">
                      ₹{payrollData.totalEarnedTillToday.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-black text-emerald-700 text-base">
                      ₹{payrollData.totalProjectedPayout.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}

      {/* ============================================================= */}
      {/* TAB 2: EXCEL-STYLE ATTENDANCE SHEET (CALENDAR MATRIX)         */}
      {/* ============================================================= */}
      {activeTab === 'attendance-sheet' && (
        <div className="animate-rise">
          <AttendanceSheetGrid
            selectedMonth={selectedMonth}
            payrollRecords={payrollData?.records || []}
            attendanceRecords={attendanceRecords}
            hrUserName={user.email || 'HR Admin'}
            onDataUpdated={loadPayroll}
          />
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 1: EDIT BASE SALARY                                     */}
      {/* ============================================================= */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-rise">
            <h4 className="text-lg font-bold text-slate-900">Set Monthly Base Salary</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Set monthly salary for <span className="font-bold text-slate-800">{editingEmployee.name}</span> ({editingEmployee.employeeId}).
            </p>

            <form onSubmit={handleSaveBaseSalary} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Monthly Base Salary (₹ INR)
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  autoFocus
                  placeholder="e.g. 15000"
                  value={newSalaryInput}
                  onChange={(e) => setNewSalaryInput(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base font-mono font-bold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingEmployee(null)}
                  disabled={isSavingSalary}
                  className="border-slate-200 text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingSalary}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isSavingSalary ? 'Saving...' : 'Save Salary'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 2: ATTENDANCE & SALARY CORRECTION                       */}
      {/* ============================================================= */}
      {adjustingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-rise">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-lg font-bold text-slate-900">Adjust Attendance & Salary</h4>
                <p className="text-xs text-slate-500">{adjustingEmployee.name} • {formattedMonthName}</p>
              </div>
              <button
                onClick={() => setAdjustingEmployee(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Present Day Adjust (+/-)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={adjustmentForm.presentAdjustment || 0}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, presentAdjustment: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono font-bold"
                    placeholder="e.g. +1"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Half-Day Adjust (+/-)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={adjustmentForm.halfDayAdjustment || 0}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, halfDayAdjustment: parseInt(e.target.value, 10) || 0 })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Paid Leaves / Holidays
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={adjustmentForm.paidLeaveAdjustment || 0}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, paidLeaveAdjustment: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono font-bold text-emerald-600"
                    placeholder="Paid leave days"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Bonus / Incentive (₹)
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={adjustmentForm.bonus || 0}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, bonus: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Custom Deduction (₹)
                </label>
                <input
                  type="number"
                  step="50"
                  value={adjustmentForm.customDeduction || 0}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, customDeduction: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono font-bold text-rose-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Correction Note / Reason
                </label>
                <input
                  type="text"
                  value={adjustmentForm.notes || ''}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  placeholder="e.g., Granted 1 paid leave for emergency"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdjustingEmployee(null)}
                  disabled={isSavingAdjustment}
                  className="border-slate-200 text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingAdjustment}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
                >
                  {isSavingAdjustment ? 'Saving...' : 'Apply Correction'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 3: PRINTABLE PAYSLIP MODAL                              */}
      {/* ============================================================= */}
      {payslipEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl border border-slate-200 animate-rise my-8">
            
            {/* Payslip Content */}
            <div ref={payslipRef} className="space-y-6">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">MENTNEO</h3>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Employee Salary Slip</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{formattedMonthName}</p>
                  <p className="text-[10px] text-slate-400">Generated on {new Date().toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              {/* Employee & Pay Details */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Employee Name</span>
                  <span className="font-bold text-slate-900 text-sm">{payslipEmployee.name}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Employee ID</span>
                  <span className="font-mono font-bold text-slate-900">{payslipEmployee.employeeId}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Designation</span>
                  <span className="font-semibold text-slate-700">{payslipEmployee.role}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Working Days in Mo</span>
                  <span className="font-semibold text-slate-700">{payslipEmployee.workingDays} Days</span>
                </div>
              </div>

              {/* Attendance Breakdown (Passed vs Upcoming) */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-xl border border-slate-200 p-2.5">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Present</span>
                  <span className="text-sm font-black text-emerald-600">{payslipEmployee.presentDays}</span>
                </div>
                <div className="rounded-xl border border-slate-200 p-2.5">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Half Days</span>
                  <span className="text-sm font-black text-amber-600">{payslipEmployee.halfDays}</span>
                </div>
                <div className="rounded-xl border border-slate-200 p-2.5">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Absent (So Far)</span>
                  <span className="text-sm font-black text-rose-600">{payslipEmployee.absentDays}</span>
                </div>
                <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Upcoming</span>
                  <span className="text-sm font-black text-slate-600">{payslipEmployee.upcomingDays}</span>
                </div>
              </div>

              {/* Earnings and Deductions Breakdown */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* Earnings */}
                <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
                  <p className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 uppercase text-[10px] tracking-wider">Earnings</p>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Base Salary</span>
                    <span className="font-mono font-bold">₹{payslipEmployee.monthlySalary.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Per-Day Pay</span>
                    <span className="font-mono">₹{payslipEmployee.perDayPay.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sky-700">
                    <span>Earned Till Today</span>
                    <span className="font-mono font-bold">₹{payslipEmployee.earnedTillToday.toFixed(2)}</span>
                  </div>
                  {payslipEmployee.bonus > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Bonus / Incentive</span>
                      <span className="font-mono">+₹{payslipEmployee.bonus}</span>
                    </div>
                  )}
                </div>

                {/* Deductions */}
                <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
                  <p className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 uppercase text-[10px] tracking-wider">Deductions</p>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Absent ({payslipEmployee.absentDays} days)</span>
                    <span className="font-mono text-rose-600 font-bold">-₹{payslipEmployee.deductionSoFar.toFixed(2)}</span>
                  </div>
                  {payslipEmployee.customDeduction > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>Other Deductions</span>
                      <span className="font-mono">-₹{payslipEmployee.customDeduction}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-100 font-bold text-slate-800">
                    <span>Deduction So Far</span>
                    <span className="font-mono text-rose-600">-₹{payslipEmployee.totalDeduction.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Net Projected Month-End Payout */}
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Projected Month-End Salary</p>
                  <p className="text-xs text-emerald-700">Assuming full attendance on remaining {payslipEmployee.upcomingDays} days</p>
                </div>
                <div className="text-2xl font-black text-emerald-700 font-mono">
                  ₹{payslipEmployee.projectedMonthEnd.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setPayslipEmployee(null)}
                className="border-slate-200 text-slate-600 text-xs font-bold"
              >
                Close
              </Button>
              <Button
                onClick={() => window.print()}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2"
              >
                Print Payslip
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 4: BULK SALARY IMPORT MODAL                             */}
      {/* ============================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-rise">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-lg font-bold text-slate-900">Bulk Import Monthly Salaries</h4>
                <p className="text-xs text-slate-500">Update salaries for multiple employees via CSV</p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkImportSalaries} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Paste CSV Data (with Headers: <code className="text-emerald-600 font-mono">Employee ID, Salary</code>)
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder={`Employee ID,Salary\nEPMN0001,25000\nEPMN0002,30000\nEPMN0003,18000`}
                  value={importCsvText}
                  onChange={(e) => setImportCsvText(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3.5 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {importResult && (
                <div className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  Import Results: {importResult.success} updated successfully, {importResult.failed} skipped.
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsImportModalOpen(false)}
                  disabled={isImporting}
                  className="border-slate-200 text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isImporting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isImporting ? 'Processing Import...' : 'Import Salaries'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
