import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday
} from 'date-fns'
import { getAttendanceForDate, cleanupOldImages } from '../services/attendanceService'
import { getEmployees } from '../services/employeeService'
import type { AttendanceRecord } from '../types/attendance'
import type { EmployeeRecord } from '../types/employee'
import Button from '../components/Button'
import Card from '../components/Card'

export default function Attendance() {
  const navigate = useNavigate()
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Ensure format matches getTodayKey ('yyyy-MM-dd')
  const dateKey = format(selectedDate, 'yyyy-MM-dd')

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        void cleanupOldImages()
        const [records, emps] = await Promise.all([
          getAttendanceForDate(dateKey),
          getEmployees()
        ])
        setAttendance(records)
        setEmployees(emps)
      } finally {
        setIsLoading(false)
      }
    }
    void loadData()
  }, [dateKey])

  const presentCount = attendance.length
  const totalCount = employees.length
  const absentCount = Math.max(0, totalCount - presentCount)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const downloadImage = (url: string, name: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = `Verification_${name}_${dateKey}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadMonthlyCSV = async () => {
    setIsLoading(true)
    try {
      let csvContent = "Date,Employee Name,Employee ID,Check-in Time\n"
      // Loop over each day in the selected month
      for (const day of daysInMonth) {
        const dayKey = format(day, 'yyyy-MM-dd')
        const records = await getAttendanceForDate(dayKey)
        records.forEach(r => {
          csvContent += `${dayKey},"${r.name}",${r.empId},${r.time}\n`
        })
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `Attendance_${format(currentMonth, 'MMMM_yyyy')}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 pb-24 max-w-6xl mx-auto">
      {/* Top Header & Kiosk Launcher */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Attendance Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage logs, view calendar, and monitor daily check-ins.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleDownloadMonthlyCSV}
            variant="outline"
            className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 shadow-sm"
          >
            Export Monthly CSV
          </Button>
          <Button 
            onClick={() => navigate('/kiosk')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 px-6 py-2.5 rounded-full font-bold whitespace-nowrap"
          >
            Launch Fullscreen Kiosk
          </Button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="animate-rise p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Selected Date</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">{format(selectedDate, 'MMM dd, yyyy')}</h3>
          <p className="text-xs text-slate-400 mt-1">{isToday(selectedDate) ? 'Today' : 'Historical Record'}</p>
        </Card>
        <Card className="animate-rise p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Employees</p>
          <h3 className="mt-2 text-3xl font-bold text-sky-600">{totalCount}</h3>
          <p className="text-xs text-slate-400 mt-1">Active roster</p>
        </Card>
        <Card className="animate-rise p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Present</p>
          <h3 className="mt-2 text-3xl font-bold text-emerald-600">{presentCount}</h3>
          <p className="text-xs text-slate-400 mt-1">Checked in</p>
        </Card>
        <Card className="animate-rise p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Absent</p>
          <h3 className="mt-2 text-3xl font-bold text-rose-500">{absentCount}</h3>
          <p className="text-xs text-slate-400 mt-1">Not checked in</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        {/* Calendar Sidebar */}
        <Card className="animate-rise p-5 self-start">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900">{format(currentMonth, 'MMMM yyyy')}</h3>
            <div className="flex gap-2">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <div key={day}>{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots for start of month alignment */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
            {daysInMonth.map(day => {
              const isSelected = isSameDay(day, selectedDate)
              const isCurrentDay = isToday(day)
              return (
                <button
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    flex h-10 w-full items-center justify-center rounded-lg text-sm transition-all
                    ${isSelected ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20' : 
                      isCurrentDay ? 'bg-emerald-50 text-emerald-600 font-bold border border-emerald-200' : 
                      'text-slate-700 hover:bg-slate-100'}
                  `}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>
        </Card>

        {/* Attendance Logs List */}
        <Card className="animate-rise">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Attendance Log <span className="text-slate-400 font-normal ml-2">({dateKey})</span></h3>
          </div>
          
          <div className="space-y-3">
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl"></div>)}
              </div>
            ) : attendance.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <p>No check-ins found for this date.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 border-separate border-spacing-y-2">
                  <thead className="text-xs uppercase tracking-wider text-slate-400 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 rounded-l-xl font-semibold">Employee</th>
                      <th className="px-4 py-3 font-semibold">ID</th>
                      <th className="px-4 py-3 font-semibold">Check-in Time</th>
                      <th className="px-4 py-3 text-right rounded-r-xl font-semibold">Verification Photo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record) => (
                      <tr key={record.id} className="bg-white hover:bg-slate-50 transition-colors shadow-sm border border-slate-100 rounded-xl overflow-hidden">
                        <td className="px-4 py-3 font-bold text-slate-900 border-y border-l border-slate-100 rounded-l-xl">{record.name}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono border-y border-slate-100">{record.empId}</td>
                        <td className="px-4 py-3 text-emerald-600 font-semibold border-y border-slate-100">{record.time}</td>
                        <td className="px-4 py-3 text-right border-y border-r border-slate-100 rounded-r-xl">
                          {record.imageUrl ? (
                            <div className="flex items-center justify-end gap-3">
                              <img src={record.imageUrl} alt="Verification" className="h-10 w-10 rounded-lg object-cover border border-slate-200" />
                              <button onClick={() => downloadImage(record.imageUrl!, record.name)} className="text-slate-400 hover:text-sky-500" title="Download Image">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 px-2 py-1 bg-slate-100 rounded-md">Expired / No Photo</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
