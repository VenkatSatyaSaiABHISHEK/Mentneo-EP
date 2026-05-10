import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAttendanceCountForEmployee, getTodayKey } from '../services/attendanceService'
import { getEmployeeByEmployeeId } from '../services/employeeService'
import { getTasksForRole } from '../services/taskService'
import type { EmployeeRecord } from '../types/employee'
import type { TaskRecord } from '../types/task'

export default function EmployeeApp() {
  const { employeeId } = useParams()
  const navigate = useNavigate()
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null)
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [attendanceCount, setAttendanceCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  
  // Basic mock auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [authError, setAuthError] = useState('')

  const todayKey = useMemo(() => getTodayKey(), [])

  useEffect(() => {
    if (!employeeId) {
      setIsLoading(false)
      return
    }

    const loadData = async () => {
      setIsLoading(true)
      try {
        const record = await getEmployeeByEmployeeId(employeeId)
        if (!record) {
          setEmployee(null)
          return
        }

        setEmployee(record)
                let count = 0
        try { count = await getAttendanceCountForEmployee(record.employeeId, todayKey) } catch(e) { console.error(e) }
        let roleTasks: TaskRecord[] = []
        try { roleTasks = await getTasksForRole(record.role) } catch(e) { console.error(e) }
        setAttendanceCount(count)
        setTasks(roleTasks)
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [employeeId, todayKey])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return
    const validPassword = employee.password || '1234'
    if (pin === validPassword) {
      setIsAuthenticated(true)
    } else {
      setAuthError('Incorrect Password. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
          <div className="text-sm font-bold tracking-widest text-emerald-500/60 uppercase">Loading Portal...</div>
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm rounded-[2rem] bg-white p-10 text-center shadow-xl">
          <h2 className="text-2xl font-bold text-slate-900">Account Not Found</h2>
          <button onClick={() => navigate('/')} className="mt-6 w-full rounded-full bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800">
            Return Home
          </button>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-[2.5rem] bg-white p-10 shadow-2xl shadow-slate-200/50">
          <div className="mb-8 flex flex-col items-center">
            {employee.profileImageUrl ? (
              <img src={employee.profileImageUrl} alt="" className="h-24 w-24 rounded-full object-cover shadow-lg border-4 border-white" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-900 text-4xl font-bold text-white shadow-lg">
                {employee.name.charAt(0)}
              </div>
            )}
            <h1 className="mt-6 text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">Log in as {employee.name}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="password"
                placeholder="Enter Secure Password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4 text-center text-lg tracking-[0.2em] text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all shadow-inner"
              />
            </div>
            {authError && <p className="text-center text-sm font-semibold text-rose-500 animate-pulse">{authError}</p>}
            <button type="submit" className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white transition hover:bg-slate-800 hover:-translate-y-1 shadow-lg">
              Unlock Portal
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900 selection:bg-emerald-500/30">
      
      {/* Decorative Top Background */}
      <div className="absolute top-0 left-0 right-0 h-[40vh] bg-gradient-to-b from-slate-900 to-slate-800 z-0 overflow-hidden rounded-b-[3rem] shadow-xl">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 mx-auto max-w-lg px-6 pt-12">
        {/* Header Content */}
        <div className="flex items-center justify-between text-white mb-10">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="font-bold tracking-widest text-xs uppercase text-slate-300">Mentneo App</span>
          </div>
          <button 
            onClick={() => setIsAuthenticated(false)} 
            className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20"
          >
            Logout
          </button>
        </div>

        <div className="mb-12 flex items-center gap-5">
          {employee.profileImageUrl ? (
            <img src={employee.profileImageUrl} alt="" className="h-20 w-20 rounded-full object-cover border-2 border-white/20 shadow-xl" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/20 bg-slate-800 text-3xl font-bold text-emerald-400 shadow-xl">
              {employee.name.charAt(0)}
            </div>
          )}
          <div className="text-white">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{employee.name}</h1>
            <p className="text-sm font-medium text-emerald-400 uppercase tracking-wider">{employee.role}</p>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Work Days</p>
            <p className="text-4xl font-black text-slate-900">24</p>
            <p className="mt-1 text-[10px] font-bold text-emerald-500 uppercase">This Month</p>
          </div>
          <div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Leave Bal.</p>
            <p className="text-4xl font-black text-slate-900">12</p>
            <p className="mt-1 text-[10px] font-bold text-sky-500 uppercase">Available</p>
          </div>
        </div>

        {/* Check In Status Card */}
        <div className="mb-6 rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/50">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Daily Status</p>
              <h3 className="text-lg font-bold text-slate-900">Check-in Status</h3>
            </div>
            {attendanceCount > 0 ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              </div>
            )}
          </div>
          <div className="text-sm font-medium text-slate-600 leading-relaxed">
            {attendanceCount > 0 ? (
              <p>You have successfully checked in today. Keep up the great work!</p>
            ) : (
              <p>You haven't checked in yet today. Use the office Kiosk to mark your attendance securely.</p>
            )}
          </div>
        </div>

        {/* Profile Info Card */}
        <div className="mb-6 rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/50">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">About You</p>
          <h3 className="text-lg font-bold text-slate-900 mb-4">Profile Details</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Employee ID</span>
              <span className="text-sm font-bold font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded-md">{employee.employeeId}</span>
            </div>
            {employee.email && (
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</span>
                <span className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{employee.email}</span>
              </div>
            )}
            {employee.phone && (
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Phone</span>
                <span className="text-sm font-bold text-slate-900">{employee.phone}</span>
              </div>
            )}
            {employee.salary && (
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Base Salary</span>
                <span className="text-sm font-bold text-emerald-600">₹{employee.salary.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Join Date</span>
              <span className="text-sm font-bold text-slate-900">{employee.joinDate || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Tasks Card */}
        <div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/50">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Your Queue</p>
          <h3 className="text-lg font-bold text-slate-900 mb-4">Assigned Tasks</h3>
          
          <div className="space-y-3">
            {tasks.length ? (
              tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 hover:bg-slate-100 transition-colors">
                  <div>
                    <p className="font-bold text-slate-900">{task.title}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{task.role}</p>
                  </div>
                  <a href={task.pdfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-all">
                    View Doc
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  </a>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-medium text-slate-500">
                You have no active tasks in your queue.
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  )
}
