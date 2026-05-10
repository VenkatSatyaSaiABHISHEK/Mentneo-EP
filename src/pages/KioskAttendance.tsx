import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAttendanceForDate, getTodayKey, saveAttendance } from '../services/attendanceService'
import { getEmployeeByEmployeeId } from '../services/employeeService'
import type { AttendanceRecord } from '../types/attendance'
import Button from '../components/Button'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../services/firebase'
import { useAuth } from '../context/AuthContext'

const DUP_WINDOW_MS = 60 * 1000

export default function KioskAttendance() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pin, setPin] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<'idle' | 'success' | 'error' | 'saving'>('idle')
  const [showExitPrompt, setShowExitPrompt] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [exitError, setExitError] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastScanRef = useRef<Map<string, number>>(new Map())

  const todayKey = useMemo(() => getTodayKey(), [])

  // Force Kiosk constraints and Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent ESC from exiting fullscreen naturally if possible, or trigger our own exit
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowExitPrompt(true)
        return
      }

      // Ignore keyboard if modal is open
      if (showExitPrompt) return

      if (e.key >= '0' && e.key <= '9') {
        setPin((prev) => (prev.length < 4 ? prev + e.key : prev))
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        setPin((prev) => prev.slice(0, -1))
      } else if (e.key === 'Enter') {
        // We'll call a dedicated submit ref or depend on a state, 
        // but React effects closure traps state, so we use a hidden button trick or dispatch
        document.getElementById('kiosk-submit-btn')?.click()
      }
    }

    const preventClose = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    const checkFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement)
      if (!document.fullscreenElement && !showExitPrompt) {
        // If they managed to exit fullscreen, force the prompt
        setShowExitPrompt(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('beforeunload', preventClose)
    document.addEventListener('fullscreenchange', checkFullscreen)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('beforeunload', preventClose)
      document.removeEventListener('fullscreenchange', checkFullscreen)
    }
  }, [showExitPrompt])

  const requestFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error("Error attempting to enable full-screen mode:", err.message)
      })
    }
    setIsFullscreen(true)
  }

  const loadAttendance = useCallback(async () => {
    setIsLoading(true)
    try {
      const records = await getAttendanceForDate(todayKey)
      setAttendance(records)
    } finally {
      setIsLoading(false)
    }
  }, [todayKey])

  useEffect(() => {
    void loadAttendance()
  }, [loadAttendance])

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        streamRef.current = stream
      })
      .catch((err) => {
        console.error('Camera error:', err)
        setStatusMessage('Camera access denied.')
        setStatusTone('error')
      })

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const handleKeypad = (num: string) => {
    if (pin.length < 4) setPin((prev) => prev + num)
  }

  const handleDelete = () => setPin((prev) => prev.slice(0, -1))

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return null
    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = 320
    canvas.height = 240
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      return canvas.toDataURL('image/jpeg', 0.6)
    }
    return null
  }

  const handleCheckIn = async () => {
    if (pin.length < 4 || statusTone === 'saving') return

    const employeeId = `EPMN${pin}`
    const lastScan = lastScanRef.current.get(employeeId)
    if (lastScan && Date.now() - lastScan < DUP_WINDOW_MS) {
      setStatusMessage(`Duplicate check-in blocked. Wait a moment.`)
      setStatusTone('error')
      setPin('')
      return
    }

    setStatusTone('saving')
    setStatusMessage('Verifying...')

    try {
      const employee = await getEmployeeByEmployeeId(employeeId)
      if (!employee) {
        setStatusMessage(`Employee ID ${employeeId} not found.`)
        setStatusTone('error')
        setPin('')
        return
      }

      const imageUrl = capturePhoto() || undefined
      await saveAttendance({ empId: employee.employeeId, name: employee.name, imageUrl })
      lastScanRef.current.set(employeeId, Date.now())
      
      setStatusMessage(`Welcome, ${employee.name}! Attendance marked.`)
      setStatusTone('success')
      setPin('')
      await loadAttendance()
      
      setTimeout(() => {
        setStatusMessage('')
        setStatusTone('idle')
      }, 4000)

    } catch (err) {
      setStatusMessage('Network error. Try again.')
      setStatusTone('error')
    }
  }

  const handleExit = async (e: React.FormEvent) => {
    e.preventDefault()
    setExitError('')
    
    // Backup dev bypass
    if (adminPassword === 'admin') {
      if (document.fullscreenElement) document.exitFullscreen()
      navigate('/attendance')
      return
    }

    if (!user || !user.email) {
      setExitError('Authentication required. Try default "admin".')
      return
    }

    try {
      await signInWithEmailAndPassword(auth, user.email, adminPassword)
      if (document.fullscreenElement) {
        document.exitFullscreen()
      }
      navigate('/attendance')
    } catch (err) {
      setExitError('Incorrect password. Try again.')
    }
  }

  return (
    <div className="flex min-h-screen flex-col gap-8 bg-[#f3f4f6] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] p-6 md:flex-row items-center justify-center relative overflow-hidden select-none">
      
      {/* Fullscreen Overlay enforcing Kiosk mode initially */}
      {!isFullscreen && !showExitPrompt && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 backdrop-blur-md">
          <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-sm border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Mentneo Kiosk</h2>
            <p className="text-slate-500 mb-8">Click below to start the secure attendance kiosk mode.</p>
            <Button onClick={requestFullscreen} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-full py-4 text-lg font-semibold shadow-lg shadow-emerald-500/30">
              Start Kiosk
            </Button>
          </div>
        </div>
      )}

      {/* Exit Prompt Modal */}
      {showExitPrompt && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-md">
          <form onSubmit={handleExit} className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Exit Kiosk Mode</h3>
            <p className="text-sm text-slate-500 mb-4">Enter your HR account password to exit.</p>
            {exitError && (
              <p className="mb-4 text-xs font-bold text-rose-500 bg-rose-50 p-2 rounded border border-rose-100">{exitError}</p>
            )}
            <input 
              type="password" 
              placeholder="Admin Password"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-6"
              autoFocus
            />
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => {setShowExitPrompt(false); setAdminPassword(''); setExitError(''); if(!document.fullscreenElement) requestFullscreen();}}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-slate-900 text-white hover:bg-slate-800 border-none">Exit Kiosk</Button>
            </div>
          </form>
        </div>
      )}

      {/* Secret Exit Button (Bottom Left Corner) */}
      <button 
        onClick={() => setShowExitPrompt(true)}
        className="absolute bottom-4 left-4 h-12 w-12 rounded-full opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-slate-400 bg-white shadow-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      </button>

      {/* Left Panel: Glassmorphic Keypad */}
      <div className="flex w-full max-w-[420px] flex-col justify-center rounded-[2.5rem] bg-white/70 backdrop-blur-xl p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white h-full max-h-[800px] relative z-10">
        <div className="mx-auto w-full">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Attendance</h2>
            <p className="mt-2 text-sm text-slate-500">Type or tap your 4-digit ID</p>
          </div>

          <div className="mb-10 flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-5 text-4xl font-mono tracking-widest text-emerald-600 shadow-inner">
            EPMN<span className="ml-2 text-slate-900">{pin.padEnd(4, '_')}</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleKeypad(num.toString())}
                className="flex h-20 items-center justify-center rounded-2xl bg-white text-3xl font-semibold text-slate-800 shadow-sm border border-slate-100 transition-transform active:scale-95 hover:bg-slate-50"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleDelete}
              className="flex h-20 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm border border-rose-100 transition-transform active:scale-95 hover:bg-rose-100 text-2xl"
            >
              ⌫
            </button>
            <button
              onClick={() => handleKeypad('0')}
              className="flex h-20 items-center justify-center rounded-2xl bg-white text-3xl font-semibold text-slate-800 shadow-sm border border-slate-100 transition-transform active:scale-95 hover:bg-slate-50"
            >
              0
            </button>
            <button
              id="kiosk-submit-btn"
              onClick={handleCheckIn}
              disabled={pin.length < 4 || statusTone === 'saving'}
              className="flex h-20 items-center justify-center rounded-2xl bg-emerald-500 text-xl font-bold text-white shadow-lg shadow-emerald-500/30 transition-transform active:scale-95 hover:bg-emerald-600 disabled:opacity-50 disabled:active:scale-100"
            >
              Enter
            </button>
          </div>

          {statusMessage && (
            <div className={`absolute -bottom-16 left-0 right-0 rounded-2xl p-4 text-center text-sm font-semibold shadow-lg backdrop-blur-md transition-all ${
              statusTone === 'error' ? 'bg-rose-500/90 text-white' : 
              statusTone === 'success' ? 'bg-emerald-500/90 text-white' : 
              statusTone === 'saving' ? 'bg-sky-500/90 text-white' : 'opacity-0'
            }`}>
              {statusMessage}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Glassmorphic Camera & Logs */}
      <div className="flex w-full max-w-[420px] flex-col gap-6 h-full max-h-[800px] relative z-10">
        <div className="relative h-[45%] overflow-hidden rounded-[2.5rem] bg-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-4 border-white">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            playsInline
            muted
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-6 right-6 flex items-center justify-between text-white">
            <div>
              <p className="text-sm font-semibold tracking-wide">Live Verification</p>
              <p className="text-xs text-slate-300">Smile for the camera!</p>
            </div>
            <div className="flex h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,1)] animate-pulse" />
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-[2.5rem] bg-white/70 backdrop-blur-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
          <div className="mb-6 flex items-center justify-between border-b border-slate-200/50 pb-4">
            <h3 className="text-lg font-bold text-slate-900">Recent Logs</h3>
            <span className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold text-white shadow-sm">
              {attendance.length} Today
            </span>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-4">
              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-200/50 rounded-2xl w-full"></div>)}
                </div>
              ) : attendance.length === 0 ? (
                <div className="flex h-full items-center justify-center flex-col text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  <p className="text-sm font-medium">No check-ins yet today.</p>
                </div>
              ) : (
                attendance.slice(0, 8).map((record) => (
                  <div key={record.id} className="flex items-center gap-4 rounded-2xl bg-white p-3 shadow-sm border border-slate-100 transition-all hover:shadow-md">
                    {record.imageUrl ? (
                      <img src={record.imageUrl} alt="" className="h-12 w-12 rounded-xl object-cover shadow-sm" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 font-bold">
                        {record.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{record.name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{record.empId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-700">{record.time}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mt-0.5 bg-emerald-50 inline-block px-2 py-0.5 rounded-full">Present</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
