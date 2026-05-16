import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './layouts/AppLayout'
import Attendance from './pages/Attendance'
import KioskAttendance from './pages/KioskAttendance'
import Dashboard from './pages/Dashboard'
import EmployeeApp from './pages/EmployeeApp'
import EmployeeProfile from './pages/EmployeeProfile'
import Employees from './pages/Employees'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Tasks from './pages/Tasks'
import OfferLetterMaker from './pages/OfferLetterMaker'
import ClientData from './pages/ClientData'
import Analytics from './pages/Analytics'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Full-screen Locked Kiosk Route */}
        <Route 
          path="/kiosk" 
          element={
            <ProtectedRoute>
              <KioskAttendance />
            </ProtectedRoute>
          } 
        />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/offer-letters" element={<OfferLetterMaker />} />
          <Route path="/client-data" element={<ClientData />} />
          <Route path="/analytics" element={<Analytics />} />
        </Route>
        
        <Route path="/employee/:employeeId" element={<EmployeeProfile />} />
        <Route path="/app/:employeeId" element={<EmployeeApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
