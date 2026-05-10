import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppLayout() {
  return (
    <div className="min-h-screen w-full">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-auto px-6 pb-10 pt-6 md:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
