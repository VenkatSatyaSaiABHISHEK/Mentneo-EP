import { useEffect, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import { useAuth } from '../context/AuthContext'
import { 
  getKioskSettings, 
  updateKioskSettings, 
  getOfficeLocation, 
  updateOfficeLocation,
  getAttendanceTimingSettings,
  updateAttendanceTimingSettings,
  DEFAULT_TIMING_SETTINGS,
  formatTime12Hour,
  checkAttendanceWindowStatus,
  type OfficeLocation,
  type AttendanceTimingSettings 
} from '../services/settingsService'
import { verifyCurrentAdminPassword } from '../services/authService'

export default function Profile() {
  const { user } = useAuth()
  const [attendanceMethod, setAttendanceMethod] = useState<'camera' | 'pin'>('camera')
  const [isSavingKiosk, setIsSavingKiosk] = useState(false)
  const [kioskSaveMessage, setKioskSaveMessage] = useState('')

  // Attendance Timing Settings States
  const [timingSettings, setTimingSettings] = useState<AttendanceTimingSettings>(DEFAULT_TIMING_SETTINGS)
  const [isTimingLoading, setIsTimingLoading] = useState(true)
  const [timingSaveMessage, setTimingSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Office Location States
  const [officeLocation, setOfficeLocation] = useState<OfficeLocation>({
    officeName: 'Mentneo Headquarters',
    address: 'Mentneo Office Premises',
    latitude: 16.964691,
    longitude: 82.217716,
    radiusMeters: 150,
  })
  const [isLocLoading, setIsLocLoading] = useState(true)
  const [locSaveMessage, setLocSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Password Verification Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [securityTarget, setSecurityTarget] = useState<'location' | 'timing' | null>(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false)
  const [isDetectingGps, setIsDetectingGps] = useState(false)

  // Determine display name. Fallback to extracting from email or hardcoding based on known user.
  const displayName = user?.displayName || (user?.email?.includes('abhi31mahi') ? 'Ch VSS Abhishek' : 'Mentneo Admin')

  useEffect(() => {
    const loadAllSettings = async () => {
      try {
        const [settings, loc, timing] = await Promise.all([
          getKioskSettings(),
          getOfficeLocation(),
          getAttendanceTimingSettings()
        ])
        setAttendanceMethod(settings.attendanceMethod)
        if (loc) {
          setOfficeLocation(loc)
          void updateOfficeLocation(loc).catch(() => {})
        }
        if (timing) {
          setTimingSettings(timing)
          void updateAttendanceTimingSettings(timing).catch(() => {})
        }
      } catch (err) {
        console.error('Failed to load profile settings:', err)
      } finally {
        setIsLocLoading(false)
        setIsTimingLoading(false)
      }
    }
    loadAllSettings()
  }, [])

  const handleSaveKiosk = async () => {
    setIsSavingKiosk(true)
    setKioskSaveMessage('')
    try {
      await updateKioskSettings({ attendanceMethod })
      setKioskSaveMessage('Kiosk settings updated successfully!')
      setTimeout(() => setKioskSaveMessage(''), 3500)
    } catch (err) {
      console.error(err)
      setKioskSaveMessage('Failed to save kiosk settings. Please try again.')
    } finally {
      setIsSavingKiosk(false)
    }
  }

  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }

    setIsDetectingGps(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOfficeLocation((prev) => ({
          ...prev,
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        }))
        setIsDetectingGps(false)
      },
      (error) => {
        setIsDetectingGps(false)
        alert(`Failed to get GPS location: ${error.message}`)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const handleOpenLocationPasswordModal = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setAdminPassword('')
    setSecurityTarget('location')
    setIsPasswordModalOpen(true)
  }

  const handleOpenTimingPasswordModal = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setAdminPassword('')
    setSecurityTarget('timing')
    setIsPasswordModalOpen(true)
  }

  const handleConfirmSecurityUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setIsVerifyingPassword(true)

    try {
      // 1. Re-authenticate / verify admin password
      await verifyCurrentAdminPassword(adminPassword)

      // 2. Execute authorized setting update
      if (securityTarget === 'location') {
        await updateOfficeLocation(officeLocation)
        setLocSaveMessage({
          type: 'success',
          text: 'Office location & geofence updated successfully with admin authorization!'
        })
        setTimeout(() => setLocSaveMessage(null), 5000)
      } else if (securityTarget === 'timing') {
        await updateAttendanceTimingSettings(timingSettings)
        setTimingSaveMessage({
          type: 'success',
          text: `Attendance operating hours updated successfully (Window: ${formatTime12Hour(timingSettings.openTime)} - ${formatTime12Hour(timingSettings.closeTime)}) with admin authorization!`
        })
        setTimeout(() => setTimingSaveMessage(null), 5000)
      }

      setIsPasswordModalOpen(false)
      setAdminPassword('')
    } catch (err) {
      setPasswordError(
        err instanceof Error && err.message.includes('auth/invalid-credential')
          ? 'Incorrect admin password. Authorization failed.'
          : 'Failed to verify password or save changes. Please check your password and try again.'
      )
    } finally {
      setIsVerifyingPassword(false)
    }
  }

  return (
    <div className="space-y-6 animate-rise pb-20">
      <Card>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Settings & Security</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Admin Portal & Office Settings</h2>
        <p className="mt-2 text-sm text-muted">
          Manage admin profile, configure company geofence location, and secure check-in policies.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Admin Account Profile */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-2xl font-black text-white shadow-lg shadow-emerald-500/20">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{displayName}</h3>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Super Administrator</p>
                <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
              </div>
            </div>
            
            <div className="space-y-3.5 text-sm pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between py-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Email</span>
                <span className="font-semibold text-slate-800">{user?.email || 'admin@mentneo.com'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">System Role</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  Full Control
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Security Gate</span>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">Password Verification Active</span>
              </div>
            </div>
          </Card>

          {/* Attendance Operating Hours & Window Card */}
          <Card className="border-2 border-indigo-500/20 bg-gradient-to-b from-white to-slate-50/50">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 bg-indigo-100 text-indigo-800">
                  <span className={`h-2 w-2 rounded-full ${timingSettings.enforceWindow ? 'bg-indigo-600 animate-pulse' : 'bg-slate-400'}`}></span>
                  {timingSettings.enforceWindow ? 'Operating Window Active' : 'Unrestricted 24/7 Mode'}
                </div>
                <h3 className="text-xl font-bold text-slate-900">Attendance Operating Hours</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Configure when morning attendance opens and turns off. Outside these hours, employee check-in is locked.
                </p>
              </div>
            </div>

            {/* Current Real-Time Window Status Indicator */}
            {(() => {
              const status = checkAttendanceWindowStatus(timingSettings)
              return (
                <div className={`mt-4 flex items-center justify-between p-3.5 rounded-2xl border text-xs font-semibold ${
                  status.isOpen 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${status.isOpen ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`}></span>
                    <span>Status: <strong className="font-bold">{status.isOpen ? 'OPEN NOW' : 'CLOSED NOW'}</strong></span>
                  </div>
                  <span className="font-mono text-[11px] bg-white/80 px-2 py-0.5 rounded-md border border-slate-200/60 text-slate-700">
                    Local Time: {formatTime12Hour(status.currentTimeStr)}
                  </span>
                </div>
              )
            })()}

            {isTimingLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading timing configuration...</div>
            ) : (
              <form onSubmit={handleOpenTimingPasswordModal} className="mt-5 space-y-4">
                {/* Morning Open & Close Times */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Morning Open Time
                    </label>
                    <input
                      type="time"
                      required
                      value={timingSettings.openTime}
                      onChange={(e) => setTimingSettings({ ...timingSettings, openTime: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">Default: 08:00 AM</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Morning Close Time
                    </label>
                    <input
                      type="time"
                      required
                      value={timingSettings.closeTime}
                      onChange={(e) => setTimingSettings({ ...timingSettings, closeTime: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">Default: 09:30 AM</p>
                  </div>
                </div>

                {/* Enforce Window Toggle */}
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 hover:bg-slate-50 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={timingSettings.enforceWindow}
                    onChange={(e) => setTimingSettings({ ...timingSettings, enforceWindow: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-900">
                      Enforce Operating Window Restriction
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Keep check-in open only from {formatTime12Hour(timingSettings.openTime)} to {formatTime12Hour(timingSettings.closeTime)}. Outside this window, attendance is locked.
                    </span>
                  </div>
                </label>

                {/* Cutoff Settings for Attendance Grading */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      On-Time Cutoff
                    </label>
                    <input
                      type="time"
                      required
                      value={timingSettings.onTimeCutoff}
                      onChange={(e) => setTimingSettings({ ...timingSettings, onTimeCutoff: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">After this = Late</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Half-Day Cutoff
                    </label>
                    <input
                      type="time"
                      required
                      value={timingSettings.halfDayCutoff}
                      onChange={(e) => setTimingSettings({ ...timingSettings, halfDayCutoff: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">After this = Half Day</p>
                  </div>
                </div>

                {/* Status alert */}
                {timingSaveMessage && (
                  <div className={`rounded-xl p-3 text-xs font-semibold border ${
                    timingSaveMessage.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {timingSaveMessage.text}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    Password required to change hours
                  </span>
                  <Button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20"
                  >
                    Save Operating Hours
                  </Button>
                </div>
              </form>
            )}
          </Card>

          {/* Kiosk Configuration Card */}
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Kiosk Configuration</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">Kiosk Scanner Method</h3>
            <p className="mt-1 text-xs text-slate-500">
              Select how employees check in when using the dedicated fullscreen office kiosk.
            </p>

            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-3.5 hover:bg-slate-50 transition cursor-pointer">
                <input 
                  type="radio" 
                  name="attendanceMethod" 
                  value="camera" 
                  checked={attendanceMethod === 'camera'}
                  onChange={() => setAttendanceMethod('camera')}
                  className="mt-1 h-4 w-4 text-emerald-600 border-slate-300 focus:ring-emerald-500" 
                />
                <div>
                  <span className="block text-sm font-bold text-slate-900">Camera QR Scanner</span>
                  <span className="block text-xs text-slate-500">Scan employee digital QR badge with camera capture.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-3.5 hover:bg-slate-50 transition cursor-pointer">
                <input 
                  type="radio" 
                  name="attendanceMethod" 
                  value="pin" 
                  checked={attendanceMethod === 'pin'}
                  onChange={() => setAttendanceMethod('pin')}
                  className="mt-1 h-4 w-4 text-emerald-600 border-slate-300 focus:ring-emerald-500" 
                />
                <div>
                  <span className="block text-sm font-bold text-slate-900">Manual PIN / ID Entry</span>
                  <span className="block text-xs text-slate-500">Enter Employee ID & PIN to check in.</span>
                </div>
              </label>
            </div>

            {kioskSaveMessage && (
              <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-100">
                {kioskSaveMessage}
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <Button onClick={handleSaveKiosk} disabled={isSavingKiosk} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2">
                {isSavingKiosk ? 'Saving...' : 'Save Kiosk Mode'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Company Office Location & Geofence Settings */}
        <div className="space-y-6">
          <Card className="border-2 border-emerald-500/20 bg-gradient-to-b from-white to-slate-50/50">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Geofence Protected
                </div>
                <h3 className="text-xl font-bold text-slate-900">Company Office Location</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Defines the authorized GPS boundaries for employee mobile check-ins.
                </p>
              </div>
            </div>

            {isLocLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading office coordinates...</div>
            ) : (
              <form onSubmit={handleOpenLocationPasswordModal} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Office / Branch Name
                  </label>
                  <input
                    type="text"
                    required
                    value={officeLocation.officeName}
                    onChange={(e) => setOfficeLocation({ ...officeLocation, officeName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    placeholder="e.g., Mentneo HQ"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Office Street Address
                  </label>
                  <input
                    type="text"
                    required
                    value={officeLocation.address}
                    onChange={(e) => setOfficeLocation({ ...officeLocation, address: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    placeholder="Street, City, Landmark"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={officeLocation.latitude}
                      onChange={(e) => setOfficeLocation({ ...officeLocation, latitude: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={officeLocation.longitude}
                      onChange={(e) => setOfficeLocation({ ...officeLocation, longitude: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>

                {/* Auto-detect button & Map link */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDetectCurrentLocation}
                    disabled={isDetectingGps}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                    {isDetectingGps ? 'Detecting GPS...' : 'Use My Current GPS Position'}
                  </button>

                  <a
                    href={`https://www.google.com/maps?q=${officeLocation.latitude},${officeLocation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800 hover:underline"
                  >
                    View on Google Maps
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  </a>
                </div>

                {/* Allowed Radius Slider & Input */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Allowed Check-in Radius</span>
                      <p className="text-[11px] text-slate-500">Employees within this distance can mark attendance</p>
                    </div>
                    <span className="text-base font-black text-emerald-600 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                      {officeLocation.radiusMeters}m
                    </span>
                  </div>

                  <input
                    type="range"
                    min="20"
                    max="1000"
                    step="10"
                    value={officeLocation.radiusMeters}
                    onChange={(e) => setOfficeLocation({ ...officeLocation, radiusMeters: parseInt(e.target.value, 10) || 50 })}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>20m (Strict)</span>
                    <span>150m (Recommended)</span>
                    <span>500m</span>
                    <span>1000m (Campus)</span>
                  </div>
                </div>

                {/* Status alerts */}
                {locSaveMessage && (
                  <div className={`rounded-xl p-3 text-xs font-semibold border ${
                    locSaveMessage.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {locSaveMessage.text}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    Password required to save changes
                  </span>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
                  >
                    Save Office Location
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>

      {/* Password Confirmation Security Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-rise">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Security Verification</h4>
                <p className="text-xs text-slate-500">
                  {securityTarget === 'timing'
                    ? 'Enter admin password to update attendance operating hours'
                    : 'Enter admin password to modify office location'}
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100">
              {securityTarget === 'timing'
                ? 'Changing attendance operating hours immediately opens or locks employee check-in permissions.'
                : 'Changing the company office location directly affects employee GPS attendance verification for all staff.'}
            </div>

            <form onSubmit={handleConfirmSecurityUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Admin Password
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter your current password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {passwordError && (
                <p className="text-xs font-bold text-rose-600 animate-pulse">{passwordError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={isVerifyingPassword}
                  className="border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isVerifyingPassword}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
                >
                  {isVerifyingPassword ? 'Verifying...' : 'Authorize & Save'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
