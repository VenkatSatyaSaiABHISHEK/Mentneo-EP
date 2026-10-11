import { NavLink } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Employees', path: '/employees' },
  { label: 'Attendance', path: '/attendance' },
  { label: 'Salary', path: '/salary' },
  { label: 'Tasks', path: '/tasks' },
  { label: 'Client Data', path: '/client-data' },
  { label: 'Offer Letters', path: '/offer-letters' },
  { label: 'Intern Offer Letters', path: '/intern-offer-letters' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Profile', path: '/profile' },
]

export default function Sidebar() {
  const { isSuperAdmin } = useAuth()

  const visibleNavItems = isSuperAdmin
    ? navItems.filter(item => ['Employees', 'Attendance', 'Salary', 'Analytics', 'Profile'].includes(item.label))
    : navItems

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-col justify-between border-r border-slate-200/70 bg-white/80 p-4 backdrop-blur-xl md:flex overflow-y-auto z-40 select-none">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="glass-panel mb-1 rounded-2xl px-3.5 py-2.5 shrink-0">
          <Logo size="md" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-medium">Employee Portal</p>
        </div>

        <nav className="my-2 flex flex-1 flex-col gap-1 text-xs overflow-y-auto pr-0.5">
          {visibleNavItems.map((item, index) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-xl px-3.5 py-2 transition font-medium ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-glass font-bold'
                    : 'text-slate-700 hover:bg-slate-100/90'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span>{item.label}</span>
                  <span className={`text-[10px] font-mono ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                    {index < 9 ? `0${index + 1}` : index + 1}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="glass-panel rounded-2xl px-3.5 py-2.5 text-xs text-slate-700 mt-2 shrink-0">
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Today's Date</p>
        <p className="mt-1 text-sm font-bold text-slate-900">
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        <p className="text-[10px] text-muted mt-0.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
          Workspace Online
        </p>
      </div>
    </aside>
  )
}
