import Card from '../components/Card'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user } = useAuth()

  // Determine display name. Fallback to extracting from email or hardcoding based on known user.
  const displayName = user?.displayName || (user?.email?.includes('abhi31mahi') ? 'Ch VSS Abhishek' : 'Mentneo Admin')

  return (
    <div className="space-y-6 animate-rise">
      <Card>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Profile</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Admin account</h2>
        <p className="mt-2 text-sm text-muted">
          Manage your access, notification settings, and security details.
        </p>
      </Card>

      <div className="max-w-2xl">
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
      </div>
    </div>
  )
}
