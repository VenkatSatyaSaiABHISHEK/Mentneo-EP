import { useEffect, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import { useAuth } from '../context/AuthContext'
import { getKioskSettings, updateKioskSettings } from '../services/settingsService'

export default function Profile() {
  const { user } = useAuth()
  const [attendanceMethod, setAttendanceMethod] = useState<'camera' | 'pin'>('camera')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Determine display name. Fallback to extracting from email or hardcoding based on known user.
  const displayName = user?.displayName || (user?.email?.includes('abhi31mahi') ? 'Ch VSS Abhishek' : 'Mentneo Admin')

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getKioskSettings()
      setAttendanceMethod(settings.attendanceMethod)
    }
    loadSettings()
  }, [])

  const handleSaveSettings = async () => {
    setIsSaving(true)
    setSaveMessage('')
    try {
      await updateKioskSettings({ attendanceMethod })
      setSaveMessage('Settings updated successfully!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (err) {
      console.error(err)
      setSaveMessage('Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-rise">
      <Card>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Profile</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Admin account</h2>
        <p className="mt-2 text-sm text-muted">
          Manage your access, notification settings, and security details.
        </p>
      </Card>

      <div className="max-w-2xl space-y-6">
        <Card>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700 shadow-sm border border-emerald-200">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{displayName}</h3>
              <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest mt-0.5">Administrator</p>
            </div>
          </div>
          
          <div className="space-y-4 text-sm mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Address</span>
              <span className="font-bold text-slate-800">{user?.email || 'admin@mentneo.com'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Role</span>
              <span className="font-bold text-slate-800">Super Admin</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Authentication</span>
              <span className="font-bold text-emerald-600">Google Secure Auth</span>
            </div>
          </div>
        </Card>

        {/* Kiosk Attendance Settings Card */}
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Kiosk Configuration</p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">Attendance Settings</h3>
          <p className="mt-2 text-sm text-muted">
            Select the verification method used by the fullscreen kiosk to register check-ins.
          </p>

          <div className="mt-6 space-y-4">
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50 transition cursor-pointer">
              <input 
                type="radio" 
                name="attendanceMethod" 
                value="camera" 
                checked={attendanceMethod === 'camera'}
                onChange={() => setAttendanceMethod('camera')}
                className="mt-1 h-4 w-4 text-emerald-600 border-slate-300 focus:ring-emerald-500" 
              />
              <div>
                <span className="block text-sm font-bold text-slate-900">Camera Scanner (QR)</span>
                <span className="block text-xs text-slate-500 mt-0.5">Mark attendance by scanning a personal QR code using the camera.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50 transition cursor-pointer">
              <input 
                type="radio" 
                name="attendanceMethod" 
                value="pin" 
                checked={attendanceMethod === 'pin'}
                onChange={() => setAttendanceMethod('pin')}
                className="mt-1 h-4 w-4 text-emerald-600 border-slate-300 focus:ring-emerald-500" 
              />
              <div>
                <span className="block text-sm font-bold text-slate-900">Secure PIN Entry</span>
                <span className="block text-xs text-slate-500 mt-0.5">Mark attendance manually by entering an Employee ID and secure PIN.</span>
              </div>
            </label>
          </div>

          {saveMessage && (
            <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-100">
              {saveMessage}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSaveSettings} disabled={isSaving} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-md">
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
