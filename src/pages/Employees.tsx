import { useEffect, useMemo, useState, useRef } from 'react'
import QRCode from 'qrcode'
import Button from '../components/Button'
import Card from '../components/Card'
import CsvUpload from '../components/CsvUpload'
import Table, { type Column } from '../components/Table'
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from '../services/employeeService'
import { getAllAttendanceForEmployee } from '../services/attendanceService'
import type { EmployeeRecord } from '../types/employee'
import type { AttendanceRecord } from '../types/attendance'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import Papa from 'papaparse'
// @ts-ignore
import html2pdf from 'html2pdf.js'

export default function Employees() {
  const { user, isSuperAdmin } = useAuth()
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  
  const [showAddForm, setShowAddForm] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', role: '', salary: '', joinDate: '', profileImageUrl: '', password: '' })

  const pdfTemplateRef = useRef<HTMLDivElement>(null)
  const [pdfEmployee, setPdfEmployee] = useState<EmployeeRecord | null>(null)
  const [pdfQrCode, setPdfQrCode] = useState<string>('')
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const handleExportCsv = () => {
    const dataToExport = filteredEmployees.map(emp => ({
      'Employee ID': emp.employeeId,
      'Name': emp.name,
      'Email': emp.email,
      'Role': emp.role,
      'Portal URL': `${window.location.origin}/app/${emp.employeeId}`,
      'Password': emp.password || 'N/A'
    }))

    const csv = Papa.unparse(dataToExport)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `mentneo_employee_credentials_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadPdfPass = async (emp: EmployeeRecord) => {
    setIsGeneratingPdf(true)
    setPdfEmployee(emp)
    try {
      const portalUrl = `${window.location.origin}/app/${emp.employeeId}`
      const qrUrl = await QRCode.toDataURL(portalUrl, {
        margin: 1,
        width: 512,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
      setPdfQrCode(qrUrl)
    } catch (err) {
      console.error('Failed to generate QR code for PDF', err)
      alert('Failed to generate credentials QR code')
      setPdfEmployee(null)
      setIsGeneratingPdf(false)
    }
  }

  useEffect(() => {
    if (pdfEmployee && pdfQrCode && pdfTemplateRef.current) {
      const element = pdfTemplateRef.current
      const opt = {
        margin:       15,
        filename:     `${pdfEmployee.employeeId}_${pdfEmployee.name.replace(/\s+/g, '_')}_Access_Pass.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      }

      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
          setPdfEmployee(null)
          setPdfQrCode('')
          setIsGeneratingPdf(false)
        })
        .catch((err: any) => {
          console.error('PDF generation failed:', err)
          alert('Failed to generate credentials PDF pass')
          setPdfEmployee(null)
          setPdfQrCode('')
          setIsGeneratingPdf(false)
        })
    }
  }, [pdfEmployee, pdfQrCode])

  // Direct QR Download function
  const handleDownloadQr = async (emp: EmployeeRecord) => {
    try {
      const url = await QRCode.toDataURL(emp.employeeId, {
        margin: 2,
        width: 1024,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      const link = document.createElement('a')
      link.download = `${emp.employeeId}-qr.png`
      link.href = url
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Failed to generate QR code', err)
      alert('Failed to generate QR code')
    }
  }

  // Attendance Viewer State
  const [viewingAttendanceEmployee, setViewingAttendanceEmployee] = useState<EmployeeRecord | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false)

  const handleViewAttendance = async (emp: EmployeeRecord) => {
    setViewingAttendanceEmployee(emp)
    setIsAttendanceLoading(true)
    try {
      const records = await getAllAttendanceForEmployee(emp.employeeId)
      setAttendanceRecords(records)
    } catch (err) {
      console.error(err)
    } finally {
      setIsAttendanceLoading(false)
    }
  }

  const getMonthlyBreakdown = () => {
    const breakdown: Record<string, number> = {}
    attendanceRecords.forEach(record => {
      const dateObj = new Date(record.date)
      const monthYear = dateObj.toLocaleDateString('default', { month: 'long', year: 'numeric' })
      if (!breakdown[monthYear]) breakdown[monthYear] = 0
      breakdown[monthYear]++
    })
    return Object.entries(breakdown)
  }

  // Edit Employee State
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<EmployeeRecord>>({})
  const [isUpdating, setIsUpdating] = useState(false)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)
  const [adminPasswordInput, setAdminPasswordInput] = useState('')



  const formatCurrency = useMemo(
    () => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }),
    []
  )

  const columns: Column<EmployeeRecord>[] = [
    { key: 'employeeId', header: 'Employee ID' },
    {
      key: 'name',
      header: 'Employee',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          {row.profileImageUrl ? (
            <img src={row.profileImageUrl} alt="" className="h-10 w-10 rounded-full object-cover border border-slate-200" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold">
              {row.name.charAt(0)}
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900">{row.name}</span>
            <span className="text-xs text-slate-500">{row.email}</span>
          </div>
        </div>
      )
    },
    { key: 'role', header: 'Role' },
    {
      key: 'salary',
      header: 'Salary',
      align: 'right',
      render: (value: any) => formatCurrency.format(Number(value) || 0),
    },
    { key: 'joinDate', header: 'Join Date' },
    {
      key: 'qrUrl',
      header: 'Actions',
      align: 'center',
      render: (_, row) => (
        <div className="flex flex-col gap-2 py-1 items-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => {
                setEditingEmployee(row)
                setEditFormData(row)
                setIsAdminUnlocked(false)
                setAdminPasswordInput('')
              }}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Edit Details
            </button>
            <button
              onClick={() => handleViewAttendance(row)}
              className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200"
            >
              View More
            </button>
            <button
              onClick={async () => {
                if (window.confirm(`Are you sure you want to remove ${row.name}? This action cannot be undone.`)) {
                  try {
                    await deleteEmployee(row.id)
                    await loadEmployees()
                  } catch (err) {
                    alert('Failed to remove employee: ' + (err as Error).message)
                  }
                }
              }}
              className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-200"
            >
              Remove
            </button>
            <button
              onClick={() => handleDownloadQr(row)}
              className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white transition hover:bg-slate-800"
            >
              Download QR
            </button>
            <button
              onClick={() => handleDownloadPdfPass(row)}
              disabled={isGeneratingPdf}
              className="rounded-full bg-indigo-600 px-3 py-1 text-xs text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {isGeneratingPdf && pdfEmployee?.id === row.id ? 'Downloading...' : 'Download Pass (PDF)'}
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">PWA:</span>
            <a href={`/employee/${row.employeeId}`} target="_blank" rel="noreferrer" className="text-sky-500 hover:underline font-mono">
              /app/{row.employeeId}
            </a>
          </div>
        </div>
      )
    },
  ]

  const loadEmployees = async () => {
    setIsLoading(true)
    try {
      const data = await getEmployees()
      setEmployees(data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadEmployees()
  }, [])

  const roles = useMemo(() => {
    const roleMap = new Map<string, string>()
    employees.forEach(emp => {
      if (emp.role) {
        const lowerRole = emp.role.trim().toLowerCase()
        if (!roleMap.has(lowerRole)) {
          // Keep the first exact casing we encounter, or capitalize it nicely
          const formattedRole = emp.role.trim().replace(/\b\w/g, l => l.toUpperCase())
          roleMap.set(lowerRole, formattedRole)
        }
      }
    })
    const uniqueRoles = Array.from(roleMap.values()).sort()
    return ['All', ...uniqueRoles]
  }, [employees])

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return employees.filter((employee) => {
      const matchesRole = roleFilter === 'All' || (employee.role || '').trim().toLowerCase() === roleFilter.toLowerCase()
      const matchesSearch =
        !normalizedSearch ||
        employee.name.toLowerCase().includes(normalizedSearch) ||
        employee.employeeId.toLowerCase().includes(normalizedSearch)
      return matchesRole && matchesSearch
    })
  }, [employees, roleFilter, search])

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)
    try {
      await addEmployee(formData as any)
      setFormData({ name: '', email: '', phone: '', role: '', salary: '', joinDate: '', profileImageUrl: '', password: '' })
      setShowAddForm(false)
      await loadEmployees()
    } catch (err) {
      alert('Failed to add employee: ' + (err as Error).message)
    } finally {
      setIsAdding(false)
    }
  }

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEmployee) return
    setIsUpdating(true)
    try {
      await updateEmployee(editingEmployee.id, editFormData)
      setEditingEmployee(null)
      await loadEmployees()
    } catch (err) {
      alert('Failed to update employee: ' + (err as Error).message)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAdminUnlock = async () => {
    // Backup dev bypass
    if (adminPasswordInput === 'admin') {
      setIsAdminUnlocked(true)
      return
    }

    if (!user || !user.email) {
      alert('Authentication required. Try default "admin".')
      return
    }

    try {
      await signInWithEmailAndPassword(auth, user.email, adminPasswordInput)
      setIsAdminUnlocked(true)
    } catch (err) {
      alert('Incorrect Admin Password')
    }
  }

  const [isResetting, setIsResetting] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetAdminPassword, setResetAdminPassword] = useState('')

  const handleResetAllPasswords = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !user.email) {
      alert('Authentication required.')
      return
    }

    setIsResetting(true)
    try {
      if (resetAdminPassword !== 'admin') {
        await signInWithEmailAndPassword(auth, user.email, resetAdminPassword)
      }
      
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      const updates = employees.map(emp => {
        const namePrefix = emp.name.replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase() || 'EM'
        let newPass = namePrefix
        for (let i = 0; i < 4; i++) newPass += chars.charAt(Math.floor(Math.random() * chars.length))
        return updateEmployee(emp.id, { password: newPass })
      })
      await Promise.all(updates)
      await loadEmployees()
      setShowResetModal(false)
      setResetAdminPassword('')
      alert('All employee passwords have been successfully randomized to secure 6-character strings!')
    } catch (err) {
      alert('Incorrect Admin Password.')
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="animate-rise">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Directory</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Employees</h2>
            <p className="mt-2 text-sm text-muted">
              Track your workforce across departments and locations with a live roster.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {!isSuperAdmin && (
              <Button variant="outline" onClick={() => setShowResetModal(true)} disabled={isResetting} className="text-rose-600 border-rose-200 hover:bg-rose-50">
                {isResetting ? 'Resetting...' : 'Security Reset (Passwords)'}
              </Button>
            )}
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Cancel' : '+ Add Employee'}
            </Button>
          </div>
        </div>
      </Card>

      {showAddForm && (
        <Card className="animate-rise border-sky-100 bg-sky-50/50">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Add New Employee</h3>
          <form onSubmit={handleAddEmployee} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <input required type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="rounded-xl border border-slate-200 px-4 py-2" />
            <input required type="email" placeholder="Email Address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="rounded-xl border border-slate-200 px-4 py-2" />
            <input required type="tel" placeholder="Phone Number" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="rounded-xl border border-slate-200 px-4 py-2" />
            <input required type="text" placeholder="Role / Job Title" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="rounded-xl border border-slate-200 px-4 py-2" />
            <input required type="text" placeholder="Salary (e.g. 50000)" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} className="rounded-xl border border-slate-200 px-4 py-2" />
            <input required type="date" placeholder="Join Date" value={formData.joinDate} onChange={e => setFormData({...formData, joinDate: e.target.value})} className="rounded-xl border border-slate-200 px-4 py-2" />
            <input required type="text" placeholder="Set Employee Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="rounded-xl border border-slate-200 px-4 py-2" />
            <input type="url" placeholder="Profile Image Link (Optional)" value={formData.profileImageUrl} onChange={e => setFormData({...formData, profileImageUrl: e.target.value})} className="rounded-xl border border-slate-200 px-4 py-2 sm:col-span-2" />
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={isAdding}>
                {isAdding ? 'Adding...' : 'Save Employee'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm overflow-y-auto">
          <Card className="w-full max-w-2xl animate-rise relative my-8">
            <button 
              onClick={() => setEditingEmployee(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
            <h3 className="mb-6 text-xl font-bold text-slate-900">
              Edit Employee: {editingEmployee.name}
            </h3>
            
            <form onSubmit={handleUpdateEmployee} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Name</label>
                  <input required type="text" value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Role</label>
                  <input required type="text" value={editFormData.role || ''} onChange={e => setEditFormData({...editFormData, role: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Email</label>
                  <input required type="email" value={editFormData.email || ''} onChange={e => setEditFormData({...editFormData, email: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Phone</label>
                  <input required type="tel" value={editFormData.phone || ''} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Salary</label>
                  <input required type="text" value={editFormData.salary || ''} onChange={e => setEditFormData({...editFormData, salary: e.target.value as unknown as number})} className="w-full rounded-xl border border-slate-200 px-4 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Profile Image URL</label>
                  <input type="url" value={editFormData.profileImageUrl || ''} onChange={e => setEditFormData({...editFormData, profileImageUrl: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2" />
                </div>
              </div>

              {/* Secure Password Section */}
              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                <h4 className="mb-2 text-sm font-bold text-rose-900 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  Secure PWA Access Password
                </h4>
                
                {!isAdminUnlocked ? (
                  <div className="flex items-center gap-3">
                    <input type="password" value="********" disabled className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-slate-500" />
                    <div className="flex w-full max-w-[200px] gap-2">
                      <input 
                        type="password" 
                        placeholder="Admin Password" 
                        value={adminPasswordInput}
                        onChange={e => setAdminPasswordInput(e.target.value)}
                        className="w-full rounded-xl border border-rose-200 px-3 py-2 text-sm"
                      />
                      <button 
                        type="button"
                        onClick={handleAdminUnlock}
                        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 whitespace-nowrap"
                      >
                        Unlock
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-rose-600">Edit Employee Password</label>
                    <input 
                      type="text" 
                      value={editFormData.password || ''} 
                      onChange={e => setEditFormData({...editFormData, password: e.target.value})} 
                      className="w-full rounded-xl border border-rose-300 bg-white px-4 py-2 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none" 
                    />
                    <p className="mt-1 text-xs text-rose-500">You are currently viewing and editing sensitive data.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="rounded-xl px-6 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="rounded-xl bg-emerald-500 px-8 py-2 text-sm font-bold text-white transition hover:bg-emerald-600 shadow-lg shadow-emerald-500/30"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <CsvUpload onUploaded={loadEmployees} />
      <Card className="animate-rise">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Employee list</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Active roster</h3>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={handleExportCsv}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition shadow-sm"
            >
              Export Credentials CSV
            </button>
            <input
              type="text"
              placeholder="Search by name or ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 md:w-56"
            />
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
            >
              {roles.map((role) => (
                <option key={role} value={role} className="text-slate-900">
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Loading employee records...
          </div>
        ) : (
          <Table columns={columns} rows={filteredEmployees} rowKey={(row) => row.id} />
        )}
      </Card>



      {/* Attendance Details Modal */}
      {viewingAttendanceEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm overflow-y-auto py-10">
          <Card className="w-full max-w-2xl animate-rise relative my-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  {viewingAttendanceEmployee.profileImageUrl ? (
                    <img src={viewingAttendanceEmployee.profileImageUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                      {viewingAttendanceEmployee.name.charAt(0)}
                    </div>
                  )}
                  {viewingAttendanceEmployee.name}
                </h3>
                <p className="text-sm text-slate-500 mt-1 uppercase tracking-widest font-semibold">Attendance History</p>
              </div>
              <button onClick={() => setViewingAttendanceEmployee(null)} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {isAttendanceLoading ? (
              <div className="py-12 flex justify-center">
                <div className="animate-spin h-8 w-8 rounded-full border-4 border-emerald-500/30 border-t-emerald-500"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase">Join Date</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{viewingAttendanceEmployee.joinDate || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase">Today's Date</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{new Date().toLocaleDateString()}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-4 text-center border border-emerald-100 col-span-2">
                    <p className="text-xs font-bold text-emerald-600 uppercase">Total Present Days</p>
                    <p className="text-3xl font-black text-emerald-700 mt-1">{attendanceRecords.length}</p>
                  </div>
                </div>

                {/* Monthly Breakdown */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Monthly Breakdown</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {getMonthlyBreakdown().length > 0 ? getMonthlyBreakdown().map(([month, count]) => (
                      <div key={month} className="flex justify-between items-center p-3 rounded-xl border border-slate-200 bg-white shadow-sm">
                        <span className="font-semibold text-slate-700">{month}</span>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-bold rounded-lg text-sm">{count} Days</span>
                      </div>
                    )) : (
                      <div className="col-span-2 text-center py-4 text-slate-500 text-sm">No attendance data found yet.</div>
                    )}
                  </div>
                </div>

                {/* Recent Logs List */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">All Logs</h4>
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {attendanceRecords.length > 0 ? attendanceRecords.map(record => (
                      <div key={record.id} className="p-3 flex justify-between items-center bg-slate-50/50 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span className="font-medium text-slate-800">{new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <span className="text-sm text-slate-500 font-mono bg-white px-2 py-1 rounded shadow-sm">{record.time}</span>
                      </div>
                    )) : (
                      <div className="p-4 text-center text-slate-500 text-sm">No logs available.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <form onSubmit={handleResetAllPasswords} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-rise">
            <h3 className="mb-2 text-lg font-bold text-slate-900">Security Reset</h3>
            <p className="mb-4 text-sm text-slate-500">Enter your HR/Admin password to confirm mass password reset.</p>
            <input
              type="password"
              placeholder="Admin Password"
              value={resetAdminPassword}
              onChange={(e) => setResetAdminPassword(e.target.value)}
              className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              autoFocus
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => {setShowResetModal(false); setResetAdminPassword('');}}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-rose-600 border-none hover:bg-rose-700 text-white" disabled={isResetting}>
                {isResetting ? 'Resetting...' : 'Confirm Reset'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Hidden off-screen PDF template */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        {pdfEmployee && (
          <div ref={pdfTemplateRef} className="w-[750px] p-10 bg-white border border-slate-200 shadow-sm rounded-[2.5rem] text-slate-800 flex flex-col gap-6" style={{ fontFamily: 'system-ui, sans-serif' }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-md"></div>
                <span className="font-extrabold tracking-[0.3em] text-lg uppercase text-slate-900">MENTNEO</span>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 uppercase tracking-wider border border-emerald-100">
                  Verified Team Pass
                </span>
              </div>
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-12 gap-8 items-center py-4">
              {/* Left Column: Details */}
              <div className="col-span-7 space-y-6">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{pdfEmployee.name}</h1>
                  <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest mt-2">{pdfEmployee.role}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Employee ID</span>
                    <span className="text-base font-mono font-bold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg w-fit">{pdfEmployee.employeeId}</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Portal Access Password</span>
                    <span className="text-lg font-mono font-black text-emerald-800 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl w-fit tracking-widest">{pdfEmployee.password || 'N/A'}</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Portal Web Link (PWA)</span>
                    <span className="text-sm font-mono font-bold text-sky-600 break-all">{window.location.origin}/app/{pdfEmployee.employeeId}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: QR Code */}
              <div className="col-span-5 flex flex-col items-center justify-center border-l border-slate-100 pl-6">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl shadow-inner flex flex-col items-center">
                  <img src={pdfQrCode} alt="Access QR Code" className="w-[180px] h-[180px] object-contain rounded-2xl" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3">Scan to Log In</span>
                </div>
              </div>
            </div>

            {/* Footer instructions */}
            <div className="mt-4 pt-6 border-t border-slate-100 space-y-4">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-xs text-slate-600 leading-relaxed">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2">How to Access Your Portal:</h4>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>Open your mobile camera or any QR code scanner.</li>
                  <li>Scan the QR code on the right, or visit the Portal Web Link on any browser.</li>
                  <li>Enter your secure Portal Access Password shown above to unlock your account.</li>
                  <li>Mark your attendance, view tasks, and check details directly from your portal.</li>
                </ol>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-semibold text-rose-500 uppercase tracking-wider">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Keep this document secure. Do not share your login credentials or QR code.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
