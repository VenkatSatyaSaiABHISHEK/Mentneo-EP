import { NavLink, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { useAuth } from '../context/AuthContext'
import { signOutUser } from '../services/authService'

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Employees', path: '/employees' },
  { label: 'Attendance', path: '/attendance' },
  { label: 'Tasks', path: '/tasks' },
  { label: 'Profile', path: '/profile' },
]

export default function Topbar() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOutUser()
    navigate('/login')
  }

  return (
    <header className="px-6 pt-6 md:px-8">
      <div className="glass-panel rounded-2xl px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Welcome back</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Admin</h1>
            <p className="text-sm text-muted">{user?.email ?? 'mentneo@admin.com'}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
        <nav className="mt-4 flex flex-wrap gap-2 md:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 text-slate-600'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
