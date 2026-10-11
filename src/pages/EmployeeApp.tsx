import { useEffect, useMemo, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { 
  getAttendanceCountForEmployee, 
  getTodayKey, 
  getAllAttendanceForEmployee 
} from '../services/attendanceService'
import { 
  getEmployeeByEmployeeId, 
  verifyEmployeeLogin 
} from '../services/employeeService'
import { 
  getOfficeLocation, 
  calculateDistanceMeters, 
  getAttendanceTimingSettings,
  subscribeToAttendanceTimingSettings,
  DEFAULT_TIMING_SETTINGS,
  checkAttendanceWindowStatus,
  formatTime12Hour,
  type OfficeLocation,
  type AttendanceTimingSettings 
} from '../services/settingsService'
import { getTasksForRole, getTasksForEmployee } from '../services/taskService'
import EmployeeTaskModule from '../components/EmployeeTaskModule'
import EmployeeAttendanceView from '../components/EmployeeAttendanceView'
import type { EmployeeRecord } from '../types/employee'
import type { TaskRecord } from '../types/task'
import type { AttendanceRecord } from '../types/attendance'
import QRCode from 'qrcode'
import {
  Home as HomeIcon,
  ShieldCheck,
  CheckSquare,
  LogOut,
  Smartphone,
  Download,
  Mail,
  Phone,
  Calendar,
  IndianRupee,
  FileText,
  UserCheck,
  Sparkles,
  ArrowRight
} from 'lucide-react'

const AUTH_STORAGE_KEY = 'mentneo_employee_session'

interface EmployeeAppProps {
  initialTab?: 'home' | 'attendance' | 'tasks'
}

export default function EmployeeApp({ initialTab }: EmployeeAppProps = {}) {
  const { employeeId: paramEmployeeId } = useParams()
  const location = useLocation()

  // Determine initial active tab based on route or prop
  const isDirectAttendance = 
    initialTab === 'attendance' || 
    location.pathname.includes('/attendance') ||
    location.pathname.includes('/attendance-checkin')

  // Employee state
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null)
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [attendanceCount, setAttendanceCount] = useState(0)
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'home' | 'attendance' | 'tasks'>(
    isDirectAttendance ? 'attendance' : 'home'
  )
  const [hasNewTasks, setHasNewTasks] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  // Login form state
  const [loginEmpId, setLoginEmpId] = useState(paramEmployeeId || '')
  const [loginPassword, setLoginPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0)

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  // Geolocation & Attendance State
  const [officeLocation, setOfficeLocation] = useState<OfficeLocation | null>(null)
  const [timingSettings, setTimingSettings] = useState<AttendanceTimingSettings>(DEFAULT_TIMING_SETTINGS)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [distanceToOffice, setDistanceToOffice] = useState<number | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [isCheckingGps, setIsCheckingGps] = useState(false)
  const [isInsideOffice, setIsInsideOffice] = useState<boolean | null>(null)

  const todayKey = useMemo(() => getTodayKey(), [])

  // Listen for PWA beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Real-time synchronization of attendance timing settings from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToAttendanceTimingSettings((settings) => {
      setTimingSettings(settings)
    })
    return () => unsubscribe()
  }, [])

  // Lockout countdown timer
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

  // Check saved session or param on initial load
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      try {
        const savedSession = localStorage.getItem(AUTH_STORAGE_KEY)
        let targetId = paramEmployeeId

        if (!targetId && savedSession) {
          try {
            const parsed = JSON.parse(savedSession)
            if (parsed?.employeeId) {
              targetId = parsed.employeeId
            }
          } catch (e) {
            console.error(e)
          }
        }

        if (targetId) {
          const emp = await getEmployeeByEmployeeId(targetId)
          if (emp) {
            if (savedSession) {
              try {
                const parsed = JSON.parse(savedSession)
                if (parsed.employeeId === emp.employeeId && (parsed.password === (emp.password || '1234'))) {
                  setEmployee(emp)
                  setLoginEmpId(emp.employeeId)
                } else {
                  setLoginEmpId(emp.employeeId)
                }
              } catch {
                setLoginEmpId(emp.employeeId)
              }
            } else {
              setLoginEmpId(emp.employeeId)
            }
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    void initAuth()
  }, [paramEmployeeId])

  // Load employee data (tasks, attendance, QR code, office settings, operating hours)
  useEffect(() => {
    if (!employee) return

    const loadEmpData = async () => {
      try {
        const [officeLoc, count, roleTasks, empTasks, history, timings] = await Promise.all([
          getOfficeLocation(),
          getAttendanceCountForEmployee(employee.employeeId, todayKey).catch(() => 0),
          getTasksForRole(employee.role).catch(() => []),
          getTasksForEmployee(employee.employeeId).catch(() => []),
          getAllAttendanceForEmployee(employee.employeeId).catch(() => []),
          getAttendanceTimingSettings().catch(() => DEFAULT_TIMING_SETTINGS)
        ])

        setOfficeLocation(officeLoc)
        setAttendanceCount(count)
        setTasks(roleTasks)
        setHasNewTasks(empTasks.some((t) => t.status === 'New'))
        setAttendanceHistory(history)
        setTimingSettings(timings)

        // Generate Attendance QR Code
        const qrUrl = await QRCode.toDataURL(employee.employeeId, {
          margin: 1,
          width: 320,
          color: { dark: '#0f172a', light: '#ffffff' }
        })
        setQrCodeUrl(qrUrl)
      } catch (err) {
        console.error('Error loading employee details:', err)
      }
    }

    void loadEmpData()
  }, [employee, todayKey])

  // Handle Employee Login
  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmpId.trim() || !loginPassword.trim() || lockoutTimeLeft > 0) return

    setAuthError('')
    setIsLoggingIn(true)

    try {
      const emp = await verifyEmployeeLogin(loginEmpId, loginPassword)
      setEmployee(emp)
      setFailedAttempts(0)
      
      // Save session to localStorage for PWA persistent login
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          employeeId: emp.employeeId,
          password: loginPassword.trim(),
          loginTime: new Date().toISOString()
        })
      )
    } catch (err) {
      const newAttempts = failedAttempts + 1
      setFailedAttempts(newAttempts)
      if (newAttempts >= 3) {
        setLockoutTimeLeft(60)
        setAuthError('Too many failed attempts. Please wait 1 minute.')
        setLoginPassword('')
      } else {
        setAuthError(err instanceof Error ? err.message : 'Invalid Employee ID or Password')
      }
    } finally {
      setIsLoggingIn(false)
    }
  }

  // Handle Employee Logout
  const handleEmployeeLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setEmployee(null)
    setLoginPassword('')
    setAuthError('')
  }

  // Request & Calculate Geolocation with robust mobile fallbacks
  const checkCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your mobile device or browser.')
      return
    }

    setIsCheckingGps(true)
    setGpsError(null)

    const processCoords = async (userLat: number, userLng: number) => {
      setUserCoords({ lat: userLat, lng: userLng })

      const office = officeLocation || (await getOfficeLocation())
      const distance = calculateDistanceMeters(
        userLat,
        userLng,
        office.latitude,
        office.longitude
      )

      setDistanceToOffice(Math.round(distance))
      const allowedRadius = office.radiusMeters || 150
      const inOffice = distance <= allowedRadius
      setIsInsideOffice(inOffice)
      setIsCheckingGps(false)
    }

    // Try high accuracy first, then fall back immediately to standard/cached accuracy if indoors
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void processCoords(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        // Fallback for indoor or satellite timeouts
        if (err.code === 2 || err.code === 3) {
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => {
              void processCoords(fallbackPos.coords.latitude, fallbackPos.coords.longitude)
            },
            (fallbackErr) => {
              setIsCheckingGps(false)
              let msg = 'Unable to acquire satellite GPS signal.'
              if (fallbackErr.code === 1) {
                msg = 'Location permission was denied. Please allow location in browser settings, or use Office Indoor Mode below.'
              } else if (fallbackErr.code === 2) {
                msg = 'GPS location unavailable. Please ensure location is enabled, or use Office Indoor Mode below.'
              } else if (fallbackErr.code === 3) {
                msg = 'Location request timed out. You can tap "Use Office Indoor Mode" below to proceed.'
              }
              setGpsError(msg)
            },
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 60000,
            }
          )
          return
        }

        setIsCheckingGps(false)
        let msg = 'Location signal unavailable.'
        if (err.code === 1) {
          msg = 'Location permission was denied. Please allow location in browser settings, or use Office Indoor Mode below.'
        }
        setGpsError(msg)
      },
      {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 30000,
      }
    )
  }

  // Handle PWA Install CTA
  const handleInstallPwa = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setIsInstallable(false)
    }
    setDeferredPrompt(null)
  }

  // Auto trigger GPS detection when employee is available or Attendance tab is active
  useEffect(() => {
    if (employee && !userCoords && !isCheckingGps) {
      checkCurrentLocation()
    }
  }, [activeTab, employee])

  // -------------------------------------------------------------
  // 1. Loading Screen (Day Mode)
  // -------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600"></div>
          <p className="font-mono text-xs uppercase tracking-widest text-slate-400">
            Loading Mentneo Portal...
          </p>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // 2. Employee Login Screen
  // -------------------------------------------------------------
  if (!employee) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-5 py-10 font-sans text-slate-900 selection:bg-emerald-500/30">
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-sky-100/50 via-emerald-50/40 to-transparent pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-md rounded-[2.5rem] bg-white border border-slate-200/80 p-8 sm:p-10 shadow-2xl shadow-slate-200/60 animate-rise">
          {/* Logo & Header */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-3xl font-black text-white shadow-lg shadow-emerald-500/25">
              M
            </div>
            <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900">Employee Portal</h1>
            <p className="mt-1.5 text-xs font-medium text-slate-500 max-w-xs">
              Sign in with your Employee ID and password to access check-in & tasks.
            </p>
          </div>

          {/* PWA Install Banner on Login */}
          {isInstallable && (
            <div className="mb-6 flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-200/80 p-3.5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-emerald-900">Install Mentneo App</p>
                  <p className="text-[10px] text-emerald-700">Add to home screen for quick access</p>
                </div>
              </div>
              <button
                onClick={handleInstallPwa}
                className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
            </div>
          )}

          <form onSubmit={handleEmployeeLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Employee ID
              </label>
              <input
                type="text"
                required
                placeholder="e.g. EPMN0001"
                value={loginEmpId}
                onChange={(e) => setLoginEmpId(e.target.value.toUpperCase())}
                disabled={lockoutTimeLeft > 0 || isLoggingIn}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-mono font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-inner transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                placeholder={lockoutTimeLeft > 0 ? `Locked for ${lockoutTimeLeft}s` : "Enter your password"}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={lockoutTimeLeft > 0 || isLoggingIn}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-inner transition"
              />
            </div>

            {authError && (
              <p className="text-center text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-2.5 animate-pulse">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={lockoutTimeLeft > 0 || isLoggingIn}
              className={`w-full rounded-2xl py-4 text-sm font-bold text-white transition shadow-lg ${
                lockoutTimeLeft > 0 || isLoggingIn
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] shadow-emerald-600/25'
              }`}
            >
              {isLoggingIn
                ? 'Authenticating...'
                : lockoutTimeLeft > 0
                ? `Locked (${lockoutTimeLeft}s)`
                : 'Sign In to Portal'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[11px] text-slate-400">
              Need assistance? Contact your Mentneo HR department.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // 3. Authenticated Employee Dashboard & Zero-Scroll Attendance
  // -------------------------------------------------------------
  return (
    <div className={`min-h-screen ${activeTab === 'attendance' ? 'bg-slate-100/70 overflow-hidden' : 'bg-slate-50 pb-28'} font-sans text-slate-900 selection:bg-emerald-500/30`}>
      
      {/* ========================================================= */}
      {/* ATTENDANCE TAB: ZERO-SCROLL BIOMETRIC HUD TERMINAL        */}
      {/* ========================================================= */}
      {activeTab === 'attendance' ? (
        <div className="h-[100dvh] max-h-[100dvh] p-3 pb-24 flex flex-col justify-between overflow-hidden">
          <EmployeeAttendanceView
            employee={employee}
            officeLocation={officeLocation}
            timingSettings={timingSettings}
            userCoords={userCoords}
            distanceToOffice={distanceToOffice}
            isInsideOffice={isInsideOffice}
            isCheckingGps={isCheckingGps}
            gpsError={gpsError}
            onRefreshGps={checkCurrentLocation}
            attendanceCount={attendanceCount}
            attendanceHistory={attendanceHistory}
            onAttendanceSuccess={(updatedHistory) => {
              setAttendanceCount(1)
              setAttendanceHistory(updatedHistory)
            }}
            onBackToHome={() => setActiveTab('home')}
          />
        </div>
      ) : (
        /* ========================================================= */
        /* STANDARD OVERVIEW TABS (HOME & TASKS)                     */
        /* ========================================================= */
        <>
          {/* Top Header Background Banner */}
          <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-slate-900 to-slate-800 z-0 rounded-b-[2.5rem] shadow-xl"></div>

          <div className="relative z-10 mx-auto max-w-lg px-5 pt-8">
            {/* Top Navbar */}
            <div className="flex items-center justify-between text-white mb-6">
              <div className="flex items-center gap-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="font-mono text-xs font-bold tracking-widest text-slate-200 uppercase">
                  Mentneo EP
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isInstalled && (
                  <span className="rounded-full bg-white/10 border border-white/20 px-2.5 py-1 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                    <Smartphone className="w-3 h-3" />
                    <span>Active</span>
                  </span>
                )}
                {isInstallable && (
                  <button
                    onClick={handleInstallPwa}
                    className="flex items-center gap-1 rounded-full bg-white/15 border border-white/20 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/25 transition backdrop-blur-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Install</span>
                  </button>
                )}
                <button
                  onClick={handleEmployeeLogout}
                  className="flex items-center gap-1 rounded-full bg-white/10 border border-white/20 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 hover:border-rose-500 transition backdrop-blur-sm"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit</span>
                </button>
              </div>
            </div>

            {/* Employee Profile Header Card */}
            <div className="mb-6 flex items-center gap-4 rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
              {employee.profileImageUrl ? (
                <img
                  src={employee.profileImageUrl}
                  alt=""
                  className="h-16 w-16 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-md"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-slate-800 to-slate-900 text-2xl font-black text-emerald-400 shadow-md">
                  {employee.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-black text-slate-900 truncate">{employee.name}</h1>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">{employee.role}</p>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">{employee.employeeId}</p>
              </div>
              {attendanceCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Present
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                  Not In
                </span>
              )}
            </div>

            {/* TAB 1: HOME OVERVIEW */}
            {activeTab === 'home' && (
              <div className="space-y-5 animate-rise">
                {/* Quick Location Attendance Action Banner */}
                <div className="rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-5 shadow-xl shadow-emerald-500/20 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-200" />
                      Daily Check-In
                    </p>
                    <h3 className="text-base font-black text-white mt-0.5">
                      {attendanceCount > 0 ? 'Checked In for Today' : 'Location & Face Check-In'}
                    </h3>
                    <p className="text-xs text-emerald-50/90 mt-1 max-w-[220px]">
                      {attendanceCount > 0
                        ? 'Your presence has been confirmed by GPS & selfie.'
                        : 'Verify office coordinates & scan your selfie to punch in.'}
                    </p>
                    {/* Operating Window Timing Indicator */}
                    {(() => {
                      const status = checkAttendanceWindowStatus(timingSettings)
                      return (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-sm border border-white/30 text-white">
                          <span className={`h-1.5 w-1.5 rounded-full ${status.isOpen ? 'bg-emerald-300 animate-pulse' : 'bg-amber-300'}`}></span>
                          <span>
                            {status.isOpen
                              ? `Window Open (${formatTime12Hour(timingSettings.openTime)} - ${formatTime12Hour(timingSettings.closeTime)})`
                              : `Closed (Opens at ${formatTime12Hour(timingSettings.openTime)})`}
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                  <button
                    onClick={() => setActiveTab('attendance')}
                    className="shrink-0 flex items-center gap-1.5 rounded-2xl bg-white hover:bg-slate-100 px-4 py-2.5 text-xs font-black text-emerald-800 transition shadow-md active:scale-95"
                  >
                    <span>{attendanceCount > 0 ? 'Status' : 'Punch In'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-3xl bg-white border border-slate-200/80 p-5 text-center shadow-lg shadow-slate-200/40">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Work Days</p>
                    <p className="text-3xl font-black text-slate-900">{attendanceHistory.length || 0}</p>
                    <p className="mt-1 text-[10px] font-bold text-emerald-600 uppercase flex items-center justify-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      Logged
                    </p>
                  </div>
                  <div className="rounded-3xl bg-white border border-slate-200/80 p-5 text-center shadow-lg shadow-slate-200/40">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Assigned Tasks</p>
                    <p className="text-3xl font-black text-slate-900">{tasks.length}</p>
                    <p className="mt-1 text-[10px] font-bold text-sky-600 uppercase flex items-center justify-center gap-1">
                      <CheckSquare className="w-3 h-3" />
                      Active
                    </p>
                  </div>
                </div>

                {/* Digital Identity QR Pass Card */}
                <div className="rounded-3xl bg-white border border-slate-200/80 p-6 text-center shadow-xl shadow-slate-200/40">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 text-left">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Digital ID Pass</p>
                      <h3 className="text-base font-bold text-slate-900">Office Kiosk QR Badge</h3>
                    </div>
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  </div>

                  <div className="flex flex-col items-center">
                    {qrCodeUrl ? (
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl shadow-inner inline-block">
                        <img src={qrCodeUrl} alt="QR Code" className="w-44 h-44 object-contain" />
                      </div>
                    ) : (
                      <div className="w-44 h-44 bg-slate-100 rounded-2xl animate-pulse"></div>
                    )}
                    <p className="text-xs font-mono font-bold text-slate-800 tracking-wider mt-3">
                      {employee.employeeId}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Scan at office tablet kiosk</p>
                  </div>
                </div>

                {/* Profile Info Card */}
                <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xl shadow-slate-200/40 space-y-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Personal Details</p>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                      <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        Email
                      </span>
                      <span className="font-semibold text-slate-800">{employee.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                      <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        Phone
                      </span>
                      <span className="font-semibold text-slate-800">{employee.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                      <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Join Date
                      </span>
                      <span className="font-semibold text-slate-800">{employee.joinDate || 'N/A'}</span>
                    </div>
                    {employee.salary && (
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                          Base Salary
                        </span>
                        <span className="font-bold text-emerald-600 font-mono">₹{employee.salary.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Role Attachments / Company Docs */}
                {tasks.length > 0 && (
                  <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xl shadow-slate-200/40 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Company Documents</p>
                    <div className="space-y-2.5">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900">{task.title}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{task.role}</p>
                          </div>
                          {task.pdfUrl && (
                            <a
                              href={task.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition"
                            >
                              <FileText className="w-3 h-3" />
                              <span>View PDF</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: TASKS MODULE */}
            {activeTab === 'tasks' && (
              <div className="animate-rise">
                <EmployeeTaskModule employee={employee} />
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* BOTTOM FLOATING NAVIGATION BAR WITH DAY MODE & COLOR PILL  */}
      {/* ========================================================= */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white/95 border-t border-slate-200/90 backdrop-blur-xl pb-safe z-50 rounded-t-[2rem] shadow-2xl shadow-slate-300/40">
        <div className="flex justify-around items-center p-2">
          {/* Home Tab */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 transition-all py-1.5 px-4 rounded-2xl ${
              activeTab === 'home'
                ? 'text-emerald-700 font-bold bg-emerald-50 border border-emerald-200/70'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <HomeIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-wider uppercase">Home</span>
          </button>

          {/* Attendance Tab with Live Color-Coded Proximity Badge & Label */}
          <button
            onClick={() => {
              setActiveTab('attendance')
              if (!userCoords && !isCheckingGps) {
                checkCurrentLocation()
              }
            }}
            className={`flex flex-col items-center gap-0.5 transition-all py-1 px-3.5 rounded-2xl relative ${
              activeTab === 'attendance'
                ? isInsideOffice === true
                  ? 'text-emerald-700 font-bold bg-emerald-50 border border-emerald-300 shadow-sm'
                  : 'text-slate-800 font-bold bg-slate-100 border border-slate-300 shadow-sm'
                : isInsideOffice === true
                ? 'text-emerald-600 hover:bg-emerald-50/60'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="relative">
              <ShieldCheck
                className={`w-5 h-5 ${
                  isInsideOffice === true
                    ? 'text-emerald-600'
                    : isInsideOffice === false
                    ? 'text-amber-500'
                    : 'text-slate-500'
                }`}
              />
              
              {/* Dynamic Dot Badge showing Live Proximity Color */}
              {attendanceCount > 0 ? (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white"></span>
              ) : isCheckingGps ? (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-sky-400 rounded-full ring-2 ring-white animate-ping"></span>
              ) : isInsideOffice === true ? (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-white"></span>
                </span>
              ) : (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-white animate-pulse"></span>
              )}
            </div>

            {/* Attendance Text Label */}
            <span className="text-[10px] font-black tracking-wider uppercase">
              Attendance
            </span>

            {/* Dynamic Proximity Label showing live Color status */}
            {isCheckingGps ? (
              <span className="text-[8px] font-bold text-sky-600 uppercase tracking-tight">Locating...</span>
            ) : isInsideOffice === true ? (
              <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tight flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                In Range {distanceToOffice !== null ? `(${distanceToOffice}m)` : ''}
              </span>
            ) : isInsideOffice === false ? (
              <span className="text-[8px] font-bold text-amber-600 uppercase tracking-tight">
                Away {distanceToOffice !== null ? `(${distanceToOffice}m)` : ''}
              </span>
            ) : (
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">GPS Ready</span>
            )}
          </button>

          {/* Tasks Tab */}
          <button
            onClick={() => {
              setActiveTab('tasks')
              setHasNewTasks(false)
            }}
            className={`flex flex-col items-center gap-1 transition-all py-1.5 px-4 rounded-2xl relative ${
              activeTab === 'tasks'
                ? 'text-emerald-700 font-bold bg-emerald-50 border border-emerald-200/70'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="relative">
              <CheckSquare className="w-5 h-5" />
              {hasNewTasks && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse"></span>
              )}
            </div>
            <span className="text-[10px] font-bold tracking-wider uppercase">Tasks</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
