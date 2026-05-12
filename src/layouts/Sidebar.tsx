import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Employees', path: '/employees' },
  { label: 'Attendance', path: '/attendance' },
  { label: 'Tasks', path: '/tasks' },
  { label: 'Offer Letters', path: '/offer-letters' },
  { label: 'Profile', path: '/profile' },
]

export default function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-slate-200/70 bg-white/70 p-6 backdrop-blur-xl md:flex">
      <div className="glass-panel rounded-2xl px-4 py-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Mentneo</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">Employee Portal</p>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-2 text-sm">
        {navItems.map((item, index) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-4 py-3 transition ${
                isActive
                  ? 'bg-slate-900 text-white shadow-glass'
                  : 'text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            <span>{item.label}</span>
            <span className="text-xs text-slate-400">0{index + 1}</span>
          </NavLink>
        ))}
      </nav>

      <div className="glass-panel rounded-2xl px-4 py-4 text-sm text-slate-700">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Today's Date</p>
        <p className="mt-2 text-lg font-semibold text-slate-900">
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        <p className="text-xs text-muted mt-1">Workspace Online</p>
      </div>
    </aside>
  )
}
