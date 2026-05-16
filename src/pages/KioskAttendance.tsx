import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAttendanceForDate, getTodayKey, saveAttendance, getAttendanceCountForEmployee } from '../services/attendanceService'
import { getEmployeeByEmployeeId } from '../services/employeeService'
import type { AttendanceRecord } from '../types/attendance'
import Button from '../components/Button'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import QrScanner from '../components/QrScanner'

const DUP_WINDOW_MS = 60 * 1000

const playSuccessChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (err) {
    console.error("Audio playback failed", err);
  }
};

const playErrorChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2); 

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (err) {
    console.error("Audio playback failed", err);
  }
};

export default function KioskAttendance() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<'idle' | 'success' | 'error' | 'saving'>('idle')
  const [showExitPrompt, setShowExitPrompt] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [exitError, setExitError] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualEmpId, setManualEmpId] = useState('')
  const [manualPin, setManualPin] = useState('')
  const [manualError, setManualError] = useState('')
  const [isManualLoading, setIsManualLoading] = useState(false)
  
  const lastScanRef = useRef<Map<string, number>>(new Map())

  const todayKey = useMemo(() => getTodayKey(), [])

  // Screensaver Logic
  const [isIdle, setIsIdle] = useState(false)
  const idleTimerRef = useRef<number | null>(null)

  const resetIdle = useCallback(() => {
    setIsIdle(false)
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
    // Only enable screensaver if in fullscreen
    if (document.fullscreenElement) {
      idleTimerRef.current = window.setTimeout(() => setIsIdle(true), 60000) // 60 seconds
    }
  }, [])

  useEffect(() => {
    resetIdle()
    const handleActivity = () => resetIdle()
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('touchstart', handleActivity)
    window.addEventListener('click', handleActivity)
    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
      window.removeEventListener('click', handleActivity)
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
    }
  }, [resetIdle])

  // Force Kiosk constraints and Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent ESC from exiting fullscreen naturally if possible, or trigger our own exit
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowExitPrompt(true)
        return
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
    resetIdle()
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

  const handleQrScan = async (decodedText: string) => {
    resetIdle()
    if (statusTone === 'saving') return

    let employeeId = decodedText.trim()
    // If the QR contains the full PWA URL (e.g. https://domain.com/employee/EPMN1234)
    if (employeeId.includes('/employee/')) {
      employeeId = employeeId.split('/employee/').pop() || employeeId
    }

    const lastScan = lastScanRef.current.get(employeeId)
    if (lastScan && Date.now() - lastScan < DUP_WINDOW_MS) {
      setStatusMessage(`Duplicate scan. Please wait a moment.`)
      setStatusTone('error')
      playErrorChime()
      setTimeout(() => {
        setStatusMessage('')
        setStatusTone('idle')
      }, 3000)
      return
    }

    setStatusTone('saving')
    setStatusMessage('Verifying QR Code...')

    try {
      const employee = await getEmployeeByEmployeeId(employeeId)
      if (!employee) {
        setStatusMessage(`Invalid QR Code. Employee not found.`)
        setStatusTone('error')
        playErrorChime()
        setTimeout(() => {
          setStatusMessage('')
          setStatusTone('idle')
        }, 3000)
        return
      }

      // Prevent multiple check-ins on the same day
      const count = await getAttendanceCountForEmployee(employee.employeeId, todayKey)
      if (count > 0) {
        setStatusMessage(`${employee.name} is already checked in today.`)
        setStatusTone('error')
        playErrorChime()
        setTimeout(() => {
          setStatusMessage('')
          setStatusTone('idle')
        }, 4000)
        return
      }

      await saveAttendance({ empId: employee.employeeId, name: employee.name, imageUrl: undefined })
      lastScanRef.current.set(employeeId, Date.now())
      
      setStatusMessage(`Welcome, ${employee.name}! Attendance marked.`)
      setStatusTone('success')
      playSuccessChime()
      await loadAttendance()
      
      setTimeout(() => {
        setStatusMessage('')
        setStatusTone('idle')
      }, 4000)

    } catch (err) {
      console.error(err)
      setStatusMessage('Network error. Try again.')
      setStatusTone('error')
      playErrorChime()
      setTimeout(() => {
        setStatusMessage('')
        setStatusTone('idle')
      }, 3000)
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setManualError('')
    resetIdle()
    
    if (!manualEmpId.trim() || !manualPin.trim()) {
      setManualError('Please enter both Employee ID and PIN.')
      playErrorChime()
      return
    }

    setIsManualLoading(true)
    try {
      const employee = await getEmployeeByEmployeeId(manualEmpId.trim().toUpperCase())
      if (!employee) {
        setManualError('Invalid Employee ID.')
        playErrorChime()
        setIsManualLoading(false)
        return
      }

      const validPin = employee.password || '1234'
      if (manualPin !== validPin) {
        setManualError('Incorrect PIN.')
        playErrorChime()
        setIsManualLoading(false)
        return
      }

      // Check dup
      const lastScan = lastScanRef.current.get(employee.employeeId)
      if (lastScan && Date.now() - lastScan < DUP_WINDOW_MS) {
        setManualError('Duplicate entry. Please wait a moment.')
        playErrorChime()
        setIsManualLoading(false)
        return
      }

      // Prevent multiple check-ins on the same day
      const count = await getAttendanceCountForEmployee(employee.employeeId, todayKey)
      if (count > 0) {
        setManualError('Already checked in today.')
        playErrorChime()
        setIsManualLoading(false)
        return
      }

      await saveAttendance({ empId: employee.employeeId, name: employee.name, imageUrl: undefined })
      lastScanRef.current.set(employee.employeeId, Date.now())
      
      setStatusMessage(`Welcome, ${employee.name}! Attendance marked.`)
      setStatusTone('success')
      playSuccessChime()
      await loadAttendance()
      
      setShowManualEntry(false)
      setManualEmpId('')
      setManualPin('')
      
      setTimeout(() => {
        setStatusMessage('')
        setStatusTone('idle')
      }, 4000)

    } catch (err) {
      console.error(err)
      setManualError('Network error. Try again.')
      playErrorChime()
    } finally {
      setIsManualLoading(false)
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
      
      {/* Idle Screensaver */}
      {isIdle && isFullscreen && !showExitPrompt && !showManualEntry && (
        <div 
          className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-xl transition-opacity duration-1000 cursor-pointer"
          onClick={resetIdle}
        >
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
          <h1 className="text-[10rem] font-black text-white tracking-tighter drop-shadow-2xl tabular-nums leading-none mb-4">
             {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </h1>
          <p className="text-3xl text-slate-400 font-semibold tracking-widest uppercase relative z-10">
             {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <div className="mt-24 flex flex-col items-center gap-4 relative z-10">
             <div className="h-16 w-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
             <p className="text-emerald-400 text-2xl animate-pulse font-bold tracking-widest uppercase">
                Show QR to Check In
             </p>
          </div>
        </div>
      )}

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

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-md">
          <form onSubmit={handleManualSubmit} className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Manual Check-in</h3>
            <p className="text-sm text-slate-500 mb-6">Enter your Employee ID and secure PIN.</p>
            
            {manualError && (
              <p className="mb-4 text-xs font-bold text-rose-500 bg-rose-50 p-3 rounded-xl border border-rose-100">{manualError}</p>
            )}
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Employee ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. EPMN0001"
                  value={manualEmpId}
                  onChange={e => setManualEmpId(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Secure PIN</label>
                <input 
                  type="password" 
                  placeholder="••••"
                  value={manualPin}
                  onChange={e => setManualPin(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-[0.2em]"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => {setShowManualEntry(false); setManualEmpId(''); setManualPin(''); setManualError('');}}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600 border-none shadow-lg shadow-emerald-500/30" disabled={isManualLoading}>
                {isManualLoading ? 'Verifying...' : 'Check In'}
              </Button>
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

      {/* Left Panel: QR Scanner */}
      <div className="flex w-full max-w-[420px] flex-col justify-center rounded-[2.5rem] bg-white/70 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white h-full max-h-[800px] relative z-10">
        <div className="mx-auto w-full">
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Scan ID</h2>
            <p className="mt-2 text-sm text-slate-500">Show your Employee QR Code</p>
          </div>

          <div className="rounded-3xl overflow-hidden shadow-inner bg-white/50">
            <QrScanner onScan={handleQrScan} />
          </div>

          <div className="mt-4 flex justify-center">
            <button 
              onClick={() => { setShowManualEntry(true); setStatusMessage(''); setStatusTone('idle'); }}
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-4"
            >
              Forgot QR Code? Enter PIN
            </button>
          </div>

          {statusMessage && (
            <div className={`mt-6 rounded-2xl p-4 text-center text-sm font-bold shadow-lg backdrop-blur-md transition-all ${
              statusTone === 'error' ? 'bg-rose-500 text-white' : 
              statusTone === 'success' ? 'bg-emerald-500 text-white' : 
              statusTone === 'saving' ? 'bg-sky-500 text-white' : 'opacity-0'
            }`}>
              {statusMessage}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Recent Logs */}
      <div className="flex w-full max-w-[420px] flex-col gap-6 h-full max-h-[800px] relative z-10">

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
