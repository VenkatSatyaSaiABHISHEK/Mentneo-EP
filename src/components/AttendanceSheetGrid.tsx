import { useState, useMemo } from 'react'
import {
  format,
  getDaysInMonth,
  isSunday
} from 'date-fns'
import Papa from 'papaparse'
import {
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  X,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react'
import type { EmployeeSalaryCalculation } from '../types/salary'
import type { AttendanceRecord } from '../types/attendance'
import { updateAttendanceRecord, retryPhotoUpload } from '../services/attendanceService'

interface AttendanceSheetGridProps {
  selectedMonth: Date
  payrollRecords: EmployeeSalaryCalculation[]
  attendanceRecords: AttendanceRecord[]
  hrUserName: string
  onDataUpdated: () => Promise<void>
}

interface CellProofData {
  employee: EmployeeSalaryCalculation
  dateStr: string
  dayNum: number
  statusChar: 'P' | 'A' | 'H' | 'L' | 'W' | '-'
  record?: AttendanceRecord
  isFuture: boolean
  isToday: boolean
  isSunday: boolean
}

export default function AttendanceSheetGrid({
  selectedMonth,
  payrollRecords,
  attendanceRecords,
  hrUserName,
  onDataUpdated,
}: AttendanceSheetGridProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('ALL')
  const [activeProof, setActiveProof] = useState<CellProofData | null>(null)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  // Correction form state
  const [editStatus, setEditStatus] = useState<'present' | 'absent' | 'half-day' | 'leave'>('present')
  const [editReason, setEditReason] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isRetryingUpload, setIsRetryingUpload] = useState(false)

  // Dates in month
  const year = selectedMonth.getFullYear()
  const month = selectedMonth.getMonth()
  const daysInMonth = getDaysInMonth(selectedMonth)
  const monthKey = format(selectedMonth, 'yyyy-MM')

  const now = new Date()
  const currentMonthKey = format(now, 'yyyy-MM')
  const todayDateStr = format(now, 'yyyy-MM-dd')
  const isCurrentMonth = monthKey === currentMonthKey

  // Days metadata list for headers
  const daysList = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1
      const date = new Date(year, month, dayNum)
      const dateStr = format(date, 'yyyy-MM-dd')
      const isSun = isSunday(date)
      const isToday = isCurrentMonth && dateStr === todayDateStr
      const isFuture = isCurrentMonth ? dateStr > todayDateStr : monthKey > currentMonthKey
      const dayAbbr = format(date, 'EEE') // e.g. Mon, Tue, Sun

      return {
        dayNum,
        date,
        dateStr,
        isSun,
        isToday,
        isFuture,
        dayAbbr,
      }
    })
  }, [year, month, daysInMonth, isCurrentMonth, todayDateStr, monthKey])

  // Map attendance by `${empId.toUpperCase()}_${dateStr}`
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>()
    attendanceRecords.forEach((rec) => {
      if (rec.empId && rec.date) {
        const key = `${rec.empId.trim().toUpperCase()}_${rec.date}`
        map.set(key, rec)
      }
    })
    return map
  }, [attendanceRecords])

  // Extract unique roles for filter dropdown
  const roles = useMemo(() => {
    const set = new Set<string>()
    payrollRecords.forEach((r) => {
      if (r.role) set.add(r.role)
    })
    return Array.from(set).sort()
  }, [payrollRecords])

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return payrollRecords.filter((emp) => {
      const matchesSearch =
        !searchQuery.trim() ||
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRole = selectedRole === 'ALL' || emp.role === selectedRole
      return matchesSearch && matchesRole
    })
  }, [payrollRecords, searchQuery, selectedRole])

  // Open Proof modal
  const handleCellClick = (cellData: CellProofData) => {
    setActiveProof(cellData)
    // Default edit status based on existing record or cell status
    if (cellData.record?.status) {
      const st = cellData.record.status.toLowerCase()
      if (st.includes('half')) setEditStatus('half-day')
      else if (st === 'leave') setEditStatus('leave')
      else if (st === 'absent') setEditStatus('absent')
      else setEditStatus('present')
    } else {
      setEditStatus(cellData.statusChar === 'H' ? 'half-day' : cellData.statusChar === 'P' ? 'present' : 'absent')
    }
    setEditReason(cellData.record?.editReason || '')
  }

  // Handle Save Correction
  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeProof) return

    if (!editReason.trim()) {
      alert('Please enter a reason for this attendance correction.')
      return
    }

    setIsSavingEdit(true)
    try {
      if (activeProof.record?.id) {
        // Update existing record
        await updateAttendanceRecord(activeProof.record.id, {
          status: editStatus,
          reason: editReason.trim(),
          hrName: hrUserName || 'HR Admin',
          originalStatus: activeProof.record.status,
        })
      } else {
        // Create manual corrected record via attendanceService
        const { saveAttendance } = await import('../services/attendanceService')
        await saveAttendance({
          empId: activeProof.employee.employeeId,
          name: activeProof.employee.name,
          time: '09:00 AM',
          status: editStatus,
        })
      }

      await onDataUpdated()
      setActiveProof(null)
    } catch (err) {
      console.error('Error saving correction:', err)
      alert('Failed to save correction. Please try again.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Handle Retry Photo Upload
  const handleRetryUpload = async () => {
    if (!activeProof?.record?.id) return
    setIsRetryingUpload(true)
    try {
      const res = await retryPhotoUpload(activeProof.record.id)
      if (res.success) {
        alert('Upload retry initiated successfully.')
        await onDataUpdated()
      } else {
        alert(res.message || 'Retry failed. Please check worker status.')
      }
    } catch (err) {
      console.error(err)
      alert('Failed to trigger upload retry.')
    } finally {
      setIsRetryingUpload(false)
    }
  }

  // Export Matrix to CSV
  const handleExportMatrixExcel = () => {
    if (filteredEmployees.length === 0) return

    const rows = filteredEmployees.map((emp) => {
      const rowData: Record<string, any> = {
        'Employee ID': emp.employeeId,
        'Employee Name': emp.name,
        'Role': emp.role,
      }

      let pCount = 0
      let aCount = 0
      let hCount = 0
      let lCount = 0

      daysList.forEach((d) => {
        const key = `${emp.employeeId.toUpperCase()}_${d.dateStr}`
        const rec = attendanceMap.get(key)
        let ch = ''

        if (d.isSun) {
          ch = 'W'
        } else if (d.isFuture) {
          ch = ''
        } else if (rec) {
          const st = (rec.status || 'present').toLowerCase()
          if (st.includes('half')) { ch = 'H'; hCount++ }
          else if (st === 'leave') { ch = 'L'; lCount++ }
          else if (st === 'absent') { ch = 'A'; aCount++ }
          else { ch = 'P'; pCount++ }
        } else if (d.isToday) {
          ch = '-'
        } else {
          ch = 'A'
          aCount++
        }

        rowData[`${d.dayNum} (${d.dayAbbr})`] = ch
      })

      rowData['Total Present (P)'] = pCount
      rowData['Total Absent (A)'] = aCount
      rowData['Total Half-Day (H)'] = hCount
      rowData['Total Leave (L)'] = lCount
      rowData['Payable Days'] = (pCount + (hCount * 0.5) + lCount).toFixed(1)

      return rowData
    })

    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Mentneo_Attendance_Sheet_${monthKey}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------- */}
      {/* 1. CONTROLS, SEARCH, ROLE FILTERS & EXCEL EXPORT              */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search employee by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="ALL">All Departments</option>
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend & Export CTA */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Status Color Legend */}
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded flex items-center justify-center bg-emerald-100 text-emerald-800 text-[10px]">P</span>
              Present
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded flex items-center justify-center bg-rose-100 text-rose-800 text-[10px]">A</span>
              Absent
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded flex items-center justify-center bg-amber-100 text-amber-800 text-[10px]">H</span>
              Half
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded flex items-center justify-center bg-slate-200 text-slate-500 text-[10px]">W</span>
              Off
            </span>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportMatrixExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. EXCEL-STYLE CALENDAR GRID CONTAINER                        */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[680px] scrollbar-thin">
          <table className="w-full text-center border-collapse text-[11px] select-none">
            {/* Table Header */}
            <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 z-30 shadow-sm">
              <tr>
                {/* Fixed Left Header: Employee Details */}
                <th className="sticky left-0 z-40 bg-slate-100 px-4 py-3 text-left min-w-[200px] border-r border-b border-slate-200">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">Employee</span>
                </th>

                {/* Day Columns */}
                {daysList.map((d) => (
                  <th
                    key={d.dayNum}
                    className={`px-1.5 py-2 min-w-[34px] border-r border-b border-slate-200 transition-colors ${
                      d.isToday
                        ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-black'
                        : d.isSun
                        ? 'bg-slate-200/70 text-slate-400'
                        : 'text-slate-700'
                    }`}
                  >
                    <div className="text-[9px] uppercase font-mono tracking-tighter opacity-80">{d.dayAbbr}</div>
                    <div className={`text-xs ${d.isToday ? 'font-black text-emerald-900 underline' : 'font-bold'}`}>
                      {d.dayNum}
                    </div>
                  </th>
                ))}

                {/* Fixed Right Headers: Totals */}
                <th className="px-2.5 py-3 bg-emerald-50 text-emerald-900 border-l border-b border-slate-200 min-w-[42px] font-black">
                  P
                </th>
                <th className="px-2.5 py-3 bg-rose-50 text-rose-900 border-r border-b border-slate-200 min-w-[42px] font-black">
                  A
                </th>
                <th className="px-2.5 py-3 bg-amber-50 text-amber-900 border-r border-b border-slate-200 min-w-[42px] font-black">
                  H
                </th>
                <th className="px-3 py-3 bg-slate-100 text-slate-900 border-b border-slate-200 min-w-[65px] font-black">
                  Payable
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={daysList.length + 5} className="py-12 text-center text-slate-400 text-xs">
                    No employees matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  let rowPresent = 0
                  let rowAbsent = 0
                  let rowHalf = 0
                  let rowLeave = 0

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Fixed Left Column: Employee Info */}
                      <td className="sticky left-0 z-20 bg-white hover:bg-slate-50 px-4 py-2 text-left border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center gap-2.5">
                          {emp.profileImageUrl ? (
                            <img
                              src={emp.profileImageUrl}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                              {emp.name.charAt(0)}
                            </div>
                          )}
                          <div className="truncate">
                            <p className="font-bold text-slate-900 truncate leading-tight">{emp.name}</p>
                            <p className="text-[10px] font-mono text-slate-400 truncate">{emp.employeeId}</p>
                          </div>
                        </div>
                      </td>

                      {/* Day Cells */}
                      {daysList.map((d) => {
                        const key = `${emp.employeeId.toUpperCase()}_${d.dateStr}`
                        const record = attendanceMap.get(key)

                        let statusChar: 'P' | 'A' | 'H' | 'L' | 'W' | '-' = '-'
                        let cellClass = 'bg-white text-slate-300'

                        if (d.isSun) {
                          statusChar = 'W'
                          cellClass = 'bg-slate-100 text-slate-400 font-medium'
                        } else if (d.isFuture) {
                          statusChar = '-'
                          cellClass = 'bg-slate-50/40 text-transparent'
                        } else if (record) {
                          const st = (record.status || 'present').toLowerCase()
                          if (st.includes('half')) {
                            statusChar = 'H'
                            cellClass = 'bg-amber-100 text-amber-900 font-black border border-amber-300/80 shadow-sm'
                            rowHalf++
                          } else if (st === 'leave') {
                            statusChar = 'L'
                            cellClass = 'bg-sky-100 text-sky-900 font-black border border-sky-300/80'
                            rowLeave++
                          } else if (st === 'absent') {
                            statusChar = 'A'
                            cellClass = 'bg-rose-100 text-rose-900 font-black border border-rose-300/80'
                            rowAbsent++
                          } else {
                            statusChar = 'P'
                            cellClass = 'bg-emerald-100 text-emerald-900 font-black border border-emerald-300/80 shadow-sm'
                            rowPresent++
                          }
                        } else if (d.isToday) {
                          statusChar = '-'
                          cellClass = 'bg-amber-50 text-amber-700 font-bold border border-dashed border-amber-300'
                        } else {
                          // Passed day with no record = Absent
                          statusChar = 'A'
                          cellClass = 'bg-rose-100/90 text-rose-800 font-black border border-rose-200'
                          rowAbsent++
                        }

                        const cellData: CellProofData = {
                          employee: emp,
                          dateStr: d.dateStr,
                          dayNum: d.dayNum,
                          statusChar,
                          record,
                          isFuture: d.isFuture,
                          isToday: d.isToday,
                          isSunday: d.isSun,
                        }

                        return (
                          <td
                            key={d.dayNum}
                            onClick={() => !d.isFuture && handleCellClick(cellData)}
                            className={`px-0.5 py-1.5 border-r border-slate-200 transition-all ${
                              !d.isFuture ? 'cursor-pointer hover:scale-105 hover:z-10' : 'cursor-default'
                            }`}
                          >
                            <div
                              className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center relative ${cellClass}`}
                              title={
                                d.isFuture
                                  ? 'Upcoming day'
                                  : record
                                  ? `${record.name} - ${record.status} (${record.time || 'Logged'})`
                                  : `${emp.name} - ${statusChar === 'W' ? 'Week off' : statusChar === '-' ? 'Pending today' : 'Absent'}`
                              }
                            >
                              <span>{statusChar !== '-' ? statusChar : d.isToday ? '•' : ''}</span>
                              {record?.isEdited && (
                                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                              )}
                            </div>
                          </td>
                        )
                      })}

                      {/* Right Totals Columns */}
                      <td className="px-2 py-2 font-mono font-black text-emerald-700 bg-emerald-50/50 border-l border-slate-200">
                        {rowPresent}
                      </td>
                      <td className="px-2 py-2 font-mono font-black text-rose-700 bg-rose-50/50 border-r border-slate-200">
                        {rowAbsent}
                      </td>
                      <td className="px-2 py-2 font-mono font-bold text-amber-700 bg-amber-50/50 border-r border-slate-200">
                        {rowHalf}
                      </td>
                      <td className="px-3 py-2 font-mono font-black text-slate-900 bg-slate-50">
                        {(rowPresent + rowHalf * 0.5 + rowLeave).toFixed(1)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. CELL VERIFICATION PROOF & HR CORRECTION POPUP MODAL        */}
      {/* ------------------------------------------------------------- */}
      {activeProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-rise">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Attendance Proof & Details
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {activeProof.employee.name} ({activeProof.employee.employeeId}) • {activeProof.dateStr}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveProof(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Photo Proof Display */}
              <div className="rounded-2xl bg-slate-900 p-4 text-white flex flex-col items-center justify-center space-y-3 shadow-inner">
                {activeProof.record?.imageUrl || activeProof.record?.localPhotoPath || activeProof.record?.cloudinaryUrl ? (
                  <div className="relative group cursor-pointer" onClick={() => setExpandedImage(activeProof.record?.imageUrl || activeProof.record?.cloudinaryUrl || null)}>
                    <img
                      src={activeProof.record?.imageUrl || activeProof.record?.cloudinaryUrl || activeProof.record?.localPhotoPath}
                      alt="Check-in Photo"
                      className="w-40 h-40 rounded-2xl object-cover border-2 border-emerald-500 shadow-lg"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-slate-500 text-xs text-center p-3">
                    <User className="w-8 h-8 mb-1 text-slate-600" />
                    <span>No check-in photo recorded</span>
                  </div>
                )}

                {/* Storage & Cloudinary Sync Status Tag */}
                {activeProof.record && (
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    {activeProof.record.uploadStatus === 'uploaded' ? (
                      <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Cloudinary Synced
                      </span>
                    ) : activeProof.record.uploadStatus === 'failed' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          Cloud Upload Failed
                        </span>
                        <button
                          onClick={handleRetryUpload}
                          disabled={isRetryingUpload}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-[10px] flex items-center gap-1"
                        >
                          <RefreshCw className={`w-2.5 h-2.5 ${isRetryingUpload ? 'animate-spin' : ''}`} />
                          Retry
                        </button>
                      </div>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        Local Storage (Upload Pending)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Attendance Verification Metrics */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Punch-In Time</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {activeProof.record?.checkInTime || activeProof.record?.time || 'No Punch'}
                  </span>
                  {activeProof.record?.timeSlab && (
                    <span className={`mt-1 inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                      activeProof.record.timeSlab === 'on-time'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeProof.record.timeSlab === 'late'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {activeProof.record.timeSlab === 'on-time' ? '✓ On Time' : activeProof.record.timeSlab}
                    </span>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Location Seal</span>
                  {activeProof.record?.location ? (
                    <div>
                      <p className="font-bold text-slate-800 truncate">{activeProof.record.location.officeName || 'Mentneo HQ'}</p>
                      <p className="text-[10px] font-mono text-emerald-600 font-bold">
                        {activeProof.record.location.distanceMeters !== undefined ? `${activeProof.record.location.distanceMeters}m away` : 'Verified'}
                      </p>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs">Not recorded</span>
                  )}
                </div>
              </div>

              {/* Previous Edit Notice if available */}
              {activeProof.record?.isEdited && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                    Manually Corrected by {activeProof.record.editedBy}
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Reason: "{activeProof.record.editReason}" (Original: {activeProof.record.originalStatus})
                  </p>
                </div>
              )}

              {/* HR Correction Form */}
              <form onSubmit={handleSaveCorrection} className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    HR Status Correction
                  </span>
                  <span className="text-[10px] text-slate-400">Audit logged with HR name</span>
                </div>

                {/* Status Pills Selector */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'present', label: 'Present', color: 'emerald' },
                    { id: 'half-day', label: 'Half Day', color: 'amber' },
                    { id: 'absent', label: 'Absent', color: 'rose' },
                    { id: 'leave', label: 'Leave', color: 'sky' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setEditStatus(s.id as any)}
                      className={`py-2 rounded-xl text-xs font-bold transition border ${
                        editStatus === s.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Correction Reason (Mandatory) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Reason for Correction (Required)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Missed punch approved by manager, Client visit, etc."
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveProof(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20"
                  >
                    {isSavingEdit ? 'Saving...' : 'Apply Correction'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Image Lightbox */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 cursor-pointer"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-xl max-h-[85vh]">
            <img src={expandedImage} alt="Full Verification Photo" className="rounded-3xl max-w-full max-h-[85vh] object-contain shadow-2xl" />
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/80"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
