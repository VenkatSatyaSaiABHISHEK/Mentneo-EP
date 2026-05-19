import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import Button from '../components/Button'
import Card from '../components/Card'
import CsvUpload from '../components/CsvUpload'
import Table, { type Column } from '../components/Table'
import { getEmployees, addEmployee, updateEmployee } from '../services/employeeService'
import { getAllAttendanceForEmployee } from '../services/attendanceService'
import type { EmployeeRecord } from '../types/employee'
import type { AttendanceRecord } from '../types/attendance'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../services/firebase'
import { useAuth } from '../context/AuthContext'

export default function Employees() {
  const { user, isSuperAdmin } = useAuth()
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  
  const [showAddForm, setShowAddForm] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', role: '', salary: '', joinDate: '', profileImageUrl: '', password: '' })

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
            {!isSuperAdmin && (
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
            )}
            <button
              onClick={() => handleViewAttendance(row)}
              className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200"
            >
              View More
            </button>
            <button
              onClick={() => handleDownloadQr(row)}
              className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white transition hover:bg-slate-800"
            >
              Download QR
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
          
          {!isSuperAdmin && (
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => setShowResetModal(true)} disabled={isResetting} className="text-rose-600 border-rose-200 hover:bg-rose-50">
                {isResetting ? 'Resetting...' : 'Security Reset (Passwords)'}
              </Button>
              <Button onClick={() => setShowAddForm(!showAddForm)}>
                {showAddForm ? 'Cancel' : '+ Add Employee'}
              </Button>
            </div>
          )}
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

      {!isSuperAdmin && (
        <CsvUpload onUploaded={loadEmployees} />
      )}
      <Card className="animate-rise">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Employee list</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Active roster</h3>
          </div>
          <div className="flex flex-wrap gap-3">
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
    </div>
  )
}
