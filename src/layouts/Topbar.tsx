import { NavLink, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { useAuth } from '../context/AuthContext'
import { signOutUser } from '../services/authService'
import Logo from '../components/Logo'

const allNavItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Employees', path: '/employees' },
  { label: 'Attendance', path: '/attendance' },
  { label: 'Tasks', path: '/tasks' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Profile', path: '/profile' },
]

export default function Topbar() {
  const { user, isSuperAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOutUser()
    navigate('/login')
  }

  const visibleNavItems = isSuperAdmin
    ? allNavItems.filter(item => ['Employees', 'Attendance', 'Analytics', 'Profile'].includes(item.label))
    : allNavItems.filter(item => ['Dashboard', 'Employees', 'Attendance', 'Tasks', 'Profile'].includes(item.label))

  return (
    <header className="px-6 pt-6 md:px-8">
      <div className="glass-panel rounded-2xl px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo size="sm" className="md:hidden" />
            <div className="hidden h-8 w-[1px] bg-slate-200 md:block"></div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-medium">Mentneo Admin</p>
              <p className="text-xs text-muted">{user?.email ?? 'mentneo@admin.com'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
        <nav className="mt-4 flex flex-wrap gap-2 md:hidden">
          {visibleNavItems.map((item) => (
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
