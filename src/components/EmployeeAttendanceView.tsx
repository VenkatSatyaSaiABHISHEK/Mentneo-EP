import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  MapPin,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  History,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowLeft,
  X,
  Compass,
  Check,
  UserCheck
} from 'lucide-react'
import type { EmployeeRecord } from '../types/employee'
import type { AttendanceRecord } from '../types/attendance'
import { 
  type OfficeLocation, 
  type AttendanceTimingSettings,
  DEFAULT_TIMING_SETTINGS,
  DEFAULT_OFFICE_LOCATION,
  checkAttendanceWindowStatus,
  formatTime12Hour,
  subscribeToAttendanceTimingSettings,
  getAttendanceTimingSettings
} from '../services/settingsService'
import { saveAttendance, getAllAttendanceForEmployee } from '../services/attendanceService'

interface EmployeeAttendanceViewProps {
  employee: EmployeeRecord
  officeLocation: OfficeLocation | null
  timingSettings?: AttendanceTimingSettings
  userCoords: { lat: number; lng: number } | null
  distanceToOffice: number | null
  isInsideOffice: boolean | null
  isCheckingGps: boolean
  gpsError: string | null
  onRefreshGps: () => void
  attendanceCount: number
  attendanceHistory: AttendanceRecord[]
  onAttendanceSuccess: (updatedHistory: AttendanceRecord[]) => void
  onBackToHome: () => void
}

export default function EmployeeAttendanceView({
  employee,
  officeLocation,
  timingSettings,
  userCoords,
  distanceToOffice,
  isInsideOffice,
  isCheckingGps,
  gpsError,
  onRefreshGps,
  attendanceCount,
  attendanceHistory,
  onAttendanceSuccess,
  onBackToHome,
}: EmployeeAttendanceViewProps) {
  // Indoor mode fallback bypass state
  const [indoorBypass, setIndoorBypass] = useState(false)
  const [, setCurrentTimeTick] = useState(Date.now())
  const [isSyncingHours, setIsSyncingHours] = useState(false)

  // Real-time timing settings state
  const [liveTiming, setLiveTiming] = useState<AttendanceTimingSettings>(
    timingSettings || DEFAULT_TIMING_SETTINGS
  )

  // Camera & selfie state
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccessLocal, setIsSuccessLocal] = useState(attendanceCount > 0)
  const [showHistoryModal, setShowHistoryModal] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Sync prop changes
  useEffect(() => {
    if (timingSettings) {
      setLiveTiming(timingSettings)
    }
  }, [timingSettings])

  // Real-time Firestore snapshot subscription + live 1-second clock
  useEffect(() => {
    const unsub = subscribeToAttendanceTimingSettings((fresh) => {
      setLiveTiming(fresh)
    })
    const timer = setInterval(() => {
      setCurrentTimeTick(Date.now())
    }, 1000)
    return () => {
      unsub()
      clearInterval(timer)
    }
  }, [])

  const effectiveOffice = officeLocation || DEFAULT_OFFICE_LOCATION
  const effectiveIsInsideOffice = isInsideOffice === true || indoorBypass
  const windowStatus = checkAttendanceWindowStatus(liveTiming)
  const isWindowClosed = Boolean(liveTiming.enforceWindow && !windowStatus.isOpen)

  // Start camera when inside office (or indoor bypass) & not checked in & window is open (or bypassed)
  useEffect(() => {
    if (effectiveIsInsideOffice && !attendanceCount && !capturedPhoto && !isWindowClosed) {
      startCamera()
    }
    return () => {
      stopCameraStream()
    }
  }, [effectiveIsInsideOffice, attendanceCount, isWindowClosed])

  // Stop camera stream
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }

  // Initialize camera
  const startCamera = async () => {
    setCameraError(null)
    setCapturedPhoto(null)
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream
      setIsCameraActive(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(console.error)
      }
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError('Camera access required. Please allow camera permissions in your browser.')
      setIsCameraActive(false)
    }
  }

  // Connect video element when stream is active
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(console.error)
    }
  }, [isCameraActive])

  // Capture selfie with horizontal flip matching mirror view
  const handleCaptureSelfie = () => {
    if (!videoRef.current) return

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    const size = Math.min(video.videoWidth || 640, video.videoHeight || 640)
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext('2d')
    if (ctx) {
      // Mirror flip horizontally
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)

      const startX = ((video.videoWidth || size) - size) / 2
      const startY = ((video.videoHeight || size) - size) / 2
      ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size)

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      setCapturedPhoto(dataUrl)
      stopCameraStream()
    }
  }

  // Retake photo
  const handleRetake = () => {
    setCapturedPhoto(null)
    startCamera()
  }

  // Submit attendance
  const handleSubmitAttendance = async () => {
    if (!employee || !capturedPhoto || !effectiveIsInsideOffice) return

    setIsSubmitting(true)
    try {
      await saveAttendance({
        empId: employee.employeeId,
        name: employee.name,
        imageUrl: capturedPhoto,
        status: 'present',
        location: {
          latitude: userCoords?.lat || effectiveOffice.latitude,
          longitude: userCoords?.lng || effectiveOffice.longitude,
          distanceMeters: indoorBypass ? 0 : (distanceToOffice || 0),
          officeName: `${effectiveOffice.officeName}${indoorBypass ? ' (Indoor Verified)' : ''}`,
        },
      })

      setIsSuccessLocal(true)
      const updated = await getAllAttendanceForEmployee(employee.employeeId)
      onAttendanceSuccess(updated)
    } catch (err) {
      console.error('Attendance submit error:', err)
      alert('Failed to record attendance. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Today's attendance record (if already submitted)
  const todayRecord = attendanceHistory[0]

  return (
    <div className="relative flex flex-col h-[calc(100dvh-5.5rem)] max-h-[820px] w-full max-w-lg mx-auto select-none overflow-hidden animate-rise">
      {/* ---------------------------------------------------------------- */}
      {/* 1. TOP STATUS BAR (DAY MODE)                                     */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 text-slate-900 shadow-md shrink-0 mb-3">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBackToHome}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition"
            title="Back to Overview"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="truncate">
            <h2 className="text-xs font-black tracking-wide uppercase text-slate-900 truncate flex items-center gap-1.5">
              <ShieldCheck className={`w-4 h-4 ${effectiveIsInsideOffice ? 'text-emerald-600' : 'text-slate-500'} shrink-0`} />
              <span>Face Check-In</span>
            </h2>
            <p className="text-[10px] text-slate-400 truncate font-mono">
              {effectiveOffice.officeName}
            </p>
          </div>
        </div>

        {/* Right: Operating Window Pill + Proximity Pill + GPS Refresh + History */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Operating Hours Window Pill */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border shadow-sm ${
            windowStatus.isOpen 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <Clock className={`w-3 h-3 ${windowStatus.isOpen ? 'text-emerald-600' : 'text-amber-600'} shrink-0`} />
            <span className="hidden sm:inline">
              {windowStatus.isOpen ? `Open (${formatTime12Hour(liveTiming.openTime)} - ${formatTime12Hour(liveTiming.closeTime)})` : `Closed (${formatTime12Hour(liveTiming.openTime)} - ${formatTime12Hour(liveTiming.closeTime)})`}
            </span>
            <span className="sm:hidden">
              {windowStatus.isOpen ? 'Window Open' : 'Window Closed'}
            </span>
          </span>

          {/* Proximity / Geofence Status Badge */}
          {indoorBypass ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Indoor Mode</span>
            </span>
          ) : isCheckingGps ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200">
              <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
              <span>Locating</span>
            </span>
          ) : isInsideOffice === true ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>In Office ({distanceToOffice !== null ? `${distanceToOffice}m` : 'Near'})</span>
            </span>
          ) : isInsideOffice === false ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-800 border border-rose-200">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>Outside ({distanceToOffice !== null ? `${distanceToOffice}m` : 'Away'})</span>
            </span>
          ) : null}

          {/* Refresh GPS Button */}
          <button
            onClick={onRefreshGps}
            disabled={isCheckingGps}
            title="Refresh GPS Coordinates"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingGps ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* History Drawer Trigger */}
          <button
            onClick={() => setShowHistoryModal(true)}
            title="Attendance Records"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 text-[10px] font-bold transition"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>{attendanceHistory.length}</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 2. MAIN DAY MODE STAGE (PROMINENT CAMERA, NO SCANLINE ANIMATION) */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col justify-between items-center rounded-3xl bg-white border border-slate-200/90 p-5 text-slate-900 shadow-xl shadow-slate-200/50 relative overflow-hidden">
        
        {/* Soft background glow accents */}
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-sky-100/60 rounded-full blur-3xl pointer-events-none"></div>

        {/* -------------------------------------------------------------- */}
        {/* STATE 0: ATTENDANCE OPERATING WINDOW IS CLOSED                 */}
        {/* -------------------------------------------------------------- */}
        {isWindowClosed && !isSuccessLocal && attendanceCount === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4 animate-rise w-full">
            <div className="relative flex items-center justify-center w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-amber-100"></div>
              <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/25">
                <Clock className="w-7 h-7" />
              </div>
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                Operating Window Closed
              </span>
              <h3 className="text-lg font-black text-slate-900">Attendance is Currently Closed</h3>
              <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                Check-in is open daily from <strong className="text-slate-900 font-bold">{formatTime12Hour(liveTiming.openTime)}</strong> to <strong className="text-slate-900 font-bold">{formatTime12Hour(liveTiming.closeTime)}</strong>.
              </p>
            </div>

            <div className="w-full max-w-xs rounded-2xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-left space-y-2">
              <div className="flex justify-between items-center text-slate-500">
                <span>Current Time:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {formatTime12Hour(windowStatus.currentTimeStr)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Allowed Window:</span>
                <span className="font-bold text-indigo-700">
                  {formatTime12Hour(liveTiming.openTime)} - {formatTime12Hour(liveTiming.closeTime)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 w-full max-w-xs pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setIsSyncingHours(true)
                    try {
                      const fresh = await getAttendanceTimingSettings()
                      setLiveTiming(fresh)
                      setCurrentTimeTick(Date.now())
                    } finally {
                      setIsSyncingHours(false)
                    }
                  }}
                  disabled={isSyncingHours}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-3 text-xs font-bold transition border border-indigo-200"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingHours ? 'animate-spin' : ''}`} />
                  <span>{isSyncingHours ? 'Syncing...' : 'Sync Live Hours'}</span>
                </button>
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white py-3 text-xs font-bold transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back Home</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* STATE A: GPS CALCULATION IN PROGRESS                           */}
        {/* -------------------------------------------------------------- */}
        {!isWindowClosed && isCheckingGps && !indoorBypass && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="relative flex items-center justify-center w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping"></div>
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-400 text-emerald-600 shadow-md">
                <Compass className="w-8 h-8 animate-spin" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-wide">Checking Office Location...</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Acquiring high-accuracy satellite GPS coordinates for office boundary check.
              </p>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* STATE B: GPS SIGNAL ISSUE OR OUTSIDE BOUNDARY                  */}
        {/* (PROVIDES ONE-TAP "USE OFFICE INDOOR MODE" SO NEVER BLOCKED!)  */}
        {/* -------------------------------------------------------------- */}
        {!isWindowClosed && !isCheckingGps && !indoorBypass && !attendanceCount && !isSuccessLocal && (gpsError || isInsideOffice === false) && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-5 space-y-4 w-full">
            <div className="relative flex items-center justify-center w-16 h-16">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 shadow-sm">
                <AlertTriangle className="w-7 h-7" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                {gpsError ? 'Location Signal Unavailable' : 'Outside Office Boundary'}
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-xs leading-relaxed">
                {gpsError 
                  ? 'Device GPS signal is weak indoors or restricted by mobile browser settings.' 
                  : `You are approximately ${distanceToOffice || 0}m away from ${effectiveOffice.officeName} perimeter (${effectiveOffice.radiusMeters}m).`}
              </p>
            </div>

            <div className="flex flex-col gap-2.5 w-full max-w-xs pt-1">
              <button
                onClick={() => {
                  setIndoorBypass(true)
                  startCamera()
                }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3.5 text-xs font-black uppercase tracking-wider transition shadow-lg shadow-emerald-600/25 active:scale-95"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Use Office Indoor Mode</span>
              </button>

              <button
                onClick={onRefreshGps}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 text-xs font-bold transition border border-slate-200"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry GPS Detection</span>
              </button>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* STATE D: ALREADY MARKED TODAY / SUCCESS STATUS                 */}
        {/* -------------------------------------------------------------- */}
        {(attendanceCount > 0 || isSuccessLocal) && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-4 w-full animate-rise">
            {/* Holographic Glowing Check Seal (Day Mode) */}
            <div className="relative flex items-center justify-center w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-emerald-100"></div>
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-500/30">
                <ShieldCheck className="w-9 h-9" />
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                <Check className="w-3 h-3 text-emerald-700 stroke-[3]" />
                Present for Today
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-2">Attendance Confirmed</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Your presence and verified selfie have been recorded in the Mentneo system.
              </p>
            </div>

            {/* Verification Card with Thumbnail */}
            <div className="w-full max-w-xs rounded-2xl bg-slate-50 border border-slate-200 p-3.5 flex items-center justify-between gap-3 text-left shadow-sm">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Logged Time:</span>
                </div>
                <p className="text-sm font-mono font-black text-slate-900">
                  {todayRecord?.time || 'Just now'}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {effectiveOffice.officeName}
                </p>
              </div>

              {(capturedPhoto || todayRecord?.imageUrl) && (
                <div className="relative shrink-0">
                  <img
                    src={capturedPhoto || todayRecord?.imageUrl}
                    alt="Selfie"
                    className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-500 shadow-md"
                  />
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-black shadow-sm">
                    ✓
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 w-full max-w-xs">
              <button
                onClick={() => setShowHistoryModal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 py-2.5 text-xs font-bold transition"
              >
                <History className="w-3.5 h-3.5" />
                <span>View Records</span>
              </button>
              <button
                onClick={onBackToHome}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 text-xs font-bold transition shadow-md shadow-emerald-600/20"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* STATE E: IN OFFICE & READY TO PUNCH IN                         */}
        {/* -------------------------------------------------------------- */}
        {!isWindowClosed && effectiveIsInsideOffice && !attendanceCount && !isSuccessLocal && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-h-full py-1">
            {/* Top Proximity Label (Shows vibrant color when near office!) */}
            <div className="text-center shrink-0 mb-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100/90 border border-emerald-300 text-emerald-800 font-black text-xs uppercase tracking-wider shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>
                  {indoorBypass 
                    ? 'Indoor Office Verified' 
                    : `In Range • Office Verified (${distanceToOffice !== null ? `${distanceToOffice}m` : 'Near'})`}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {capturedPhoto ? 'Review your photo and confirm check-in' : 'Position your face in the camera frame'}
              </p>
            </div>

            {/* Error Message if Camera Access Blocked */}
            {cameraError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 text-center mb-2">
                {cameraError}
              </div>
            )}

            {/* EXPANDED CAMERA VIEWPORT (TAKES MORE SPACE, CLEAN, NO SCANLINE ANIMATION) */}
            <div className="relative w-full max-w-[400px] flex-1 min-h-[290px] max-h-[52vh] aspect-[4/3] sm:aspect-square rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-2xl shadow-emerald-600/10 bg-slate-950 flex items-center justify-center shrink-0">
              {/* LIVE CAMERA MODE - PURE CRISP VIDEO WITHOUT ANY UGLY OVERLAYS */}
              {!capturedPhoto ? (
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                /* CAPTURED PHOTO REVIEW MODE */
                <div className="relative w-full h-full">
                  <img
                    src={capturedPhoto}
                    alt="Captured Selfie"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Photo Ready</span>
                  </div>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS (DAY MODE) */}
            <div className="w-full max-w-xs mt-3 shrink-0">
              {!capturedPhoto ? (
                /* Primary Take Selfie Button */
                <button
                  type="button"
                  onClick={handleCaptureSelfie}
                  disabled={!isCameraActive}
                  className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white py-4 px-6 text-xs font-black uppercase tracking-wider transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4 text-white" />
                  <span>Take Selfie Photo</span>
                </button>
              ) : (
                /* Confirm & Retake Dual Buttons */
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleRetake}
                    disabled={isSubmitting}
                    className="flex-1 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-98 border border-slate-200 text-slate-700 py-3.5 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retake</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitAttendance}
                    disabled={isSubmitting}
                    className="flex-[1.6] rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white py-3.5 text-xs font-black uppercase tracking-wider transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                        <span>Confirm Check-In</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SLIDE-UP HISTORY MODAL SHEET (DAY MODE)                    */}
      {/* ------------------------------------------------------------- */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-rise">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Attendance Log History</h3>
                  <p className="text-[11px] text-slate-500">Past check-ins for {employee.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
              {attendanceHistory.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No attendance records logged yet.
                </div>
              ) : (
                attendanceHistory.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-200 p-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{rec.date}</span>
                        <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          {rec.time}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{rec.location?.officeName || 'Mentneo Office'}</span>
                        {rec.location?.distanceMeters !== undefined && (
                          <span>({rec.location.distanceMeters}m)</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {rec.imageUrl ? (
                        <img
                          src={rec.imageUrl}
                          alt="Log"
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500">
                          <UserCheck className="w-4 h-4" />
                        </div>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Present
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowHistoryModal(false)}
              className="mt-2 w-full rounded-2xl bg-slate-900 hover:bg-slate-800 text-white py-3 text-xs font-bold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
