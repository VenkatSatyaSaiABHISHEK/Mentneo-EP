import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAttendanceCountForEmployee, getTodayKey } from '../services/attendanceService'
import { getEmployeeByEmployeeId } from '../services/employeeService'
import { getTasksForRole, getTasksForEmployee } from '../services/taskService'
import EmployeeTaskModule from '../components/EmployeeTaskModule'
import type { EmployeeRecord } from '../types/employee'
import type { TaskRecord } from '../types/task'

export default function EmployeeApp() {
  const { employeeId } = useParams()
  const navigate = useNavigate()
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null)
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [attendanceCount, setAttendanceCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'home' | 'tasks'>('home')
  const [hasNewTasks, setHasNewTasks] = useState(false)
  
  // Basic mock auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [authError, setAuthError] = useState('')
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0)

  useEffect(() => {
    let timer: number
    if (lockoutTimeLeft > 0) {
      timer = window.setInterval(() => {
        setLockoutTimeLeft((prev) => {
          if (prev <= 1) {
            setFailedAttempts(0)
            setAuthError('')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [lockoutTimeLeft])

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
        let empTasks: TaskRecord[] = []
        try { 
          roleTasks = await getTasksForRole(record.role)
          empTasks = await getTasksForEmployee(record.employeeId)
        } catch(e) { console.error(e) }
        setAttendanceCount(count)
        setTasks(roleTasks)
        setHasNewTasks(empTasks.some(t => t.status === 'New'))
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [employeeId, todayKey])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee || lockoutTimeLeft > 0) return
    const validPassword = employee.password || '1234'
    if (pin === validPassword) {
      setIsAuthenticated(true)
      setFailedAttempts(0)
      setAuthError('')
    } else {
      const newAttempts = failedAttempts + 1
      setFailedAttempts(newAttempts)
      if (newAttempts >= 3) {
        setLockoutTimeLeft(60)
        setAuthError('Too many failed attempts. Please wait 1 minute.')
        setPin('')
      } else {
        setAuthError(`Incorrect Password. ${3 - newAttempts} attempts left.`)
      }
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
                placeholder={lockoutTimeLeft > 0 ? `Locked for ${lockoutTimeLeft}s` : "Enter Secure Password"}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={lockoutTimeLeft > 0}
                className={`w-full rounded-2xl border-2 px-6 py-4 text-center text-lg tracking-[0.2em] transition-all shadow-inner focus:outline-none ${
                  lockoutTimeLeft > 0 
                    ? 'border-rose-200 bg-rose-50 text-rose-500 cursor-not-allowed placeholder-rose-400' 
                    : 'border-slate-100 bg-slate-50 text-slate-900 focus:border-emerald-500 focus:bg-white'
                }`}
              />
            </div>
            {authError && <p className="text-center text-sm font-semibold text-rose-500 animate-pulse">{authError}</p>}
            <button 
              type="submit" 
              disabled={lockoutTimeLeft > 0}
              className={`w-full rounded-2xl py-4 text-sm font-bold text-white transition shadow-lg ${
                lockoutTimeLeft > 0 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : 'bg-slate-900 hover:bg-slate-800 hover:-translate-y-1'
              }`}
            >
              {lockoutTimeLeft > 0 ? `Try again in ${lockoutTimeLeft}s` : 'Unlock Portal'}
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

        {/* Tab Content Rendering */}
        {activeTab === 'home' ? (
          <>
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

            {/* Legacy PDF Tasks Card */}
            {tasks.length > 0 && (
              <div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/50">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Company Docs</p>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Role Attachments</h3>
                
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 hover:bg-slate-100 transition-colors">
                      <div>
                        <p className="font-bold text-slate-900">{task.title}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{task.role}</p>
                      </div>
                      {task.pdfUrl && (
                        <a href={task.pdfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-all">
                          View Doc
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <EmployeeTaskModule employee={employee} />
        )}
        
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full max-w-lg left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border-t border-slate-100 pb-safe z-50 rounded-t-[2rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="flex justify-around items-center p-4">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            <span className="text-[10px] font-bold tracking-wider uppercase">Home</span>
          </button>
          
          <button 
            onClick={() => {
              setActiveTab('tasks')
              setHasNewTasks(false)
            }}
            className={`flex flex-col items-center gap-1 relative transition-colors ${activeTab === 'tasks' ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className="relative">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
              {hasNewTasks && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
              )}
            </div>
            <span className="text-[10px] font-bold tracking-wider uppercase">Task</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
