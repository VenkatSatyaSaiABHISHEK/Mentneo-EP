import { useEffect, useMemo, useState } from 'react'
import Card from '../components/Card'
import Table, { type Column } from '../components/Table'
import { getAttendanceForDate, getTodayKey } from '../services/attendanceService'
import { getEmployees } from '../services/employeeService'
import { getAllTasks } from '../services/taskService'
import type { AttendanceRecord } from '../types/attendance'
import type { EmployeeRecord } from '../types/employee'
import type { TaskRecord } from '../types/task'

export default function Dashboard() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const todayKey = useMemo(() => getTodayKey(), [])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [employeeData, attendanceData, taskData] = await Promise.all([
          getEmployees(),
          getAttendanceForDate(todayKey),
          getAllTasks(),
        ])
        setEmployees(employeeData)
        setAttendance(attendanceData)
        setTasks(taskData)
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [todayKey])

  const employeeColumns: Column<EmployeeRecord>[] = [
    { key: 'employeeId', header: 'Employee ID' },
    { key: 'name', header: 'Name' },
    { key: 'role', header: 'Role' },
    { key: 'joinDate', header: 'Join Date' },
  ]

  const totalEmployees = employees.length
  const presentToday = attendance.length
  const tasksAssigned = tasks.length

  return (
    <div className="space-y-6">
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card
          title="Total Employees"
          value={String(totalEmployees)}
          subtitle="Active in directory"
          className="animate-rise stagger-1"
        >
          <div className="mt-4 flex items-center justify-between text-xs text-muted">
            <span>Synced from Firestore</span>
            <span className="rounded-full bg-slate-100 px-2 py-1">Live</span>
          </div>
        </Card>
        <Card
          title="Present Today"
          value={String(presentToday)}
          subtitle={`Check-ins on ${todayKey}`}
          className="animate-rise stagger-2"
        >
          <div className="mt-4 flex items-center justify-between text-xs text-muted">
            <span>Scanner active</span>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
              Verified
            </span>
          </div>
        </Card>
        <Card
          title="Tasks Assigned"
          value={String(tasksAssigned)}
          subtitle="Role-based uploads"
          className="animate-rise stagger-3"
        >
          <div className="mt-4 flex items-center justify-between text-xs text-muted">
            <span>Storage linked</span>
            <span className="rounded-full bg-slate-100 px-2 py-1">PDF</span>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card className="animate-rise">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Employees</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Directory snapshot</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
              {isLoading ? 'Loading...' : 'Updated now'}
            </span>
          </div>
          <Table
            columns={employeeColumns}
            rows={employees.slice(0, 5)}
            rowKey={(row) => row.id}
          />
        </Card>

        <div className="space-y-6">
          <Card className="animate-rise">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recent check-ins</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Attendance feed</h2>
            <div className="mt-4 space-y-2">
              {attendance.slice(0, 4).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{record.name}</p>
                    <p className="text-xs text-muted">{record.empId}</p>
                  </div>
                  <div className="text-right text-xs text-slate-600">
                    <p>{record.time}</p>
                    <p className="uppercase tracking-[0.2em] text-emerald-600">Present</p>
                  </div>
                </div>
              ))}
              {!attendance.length && (
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-muted">
                  No check-ins yet.
                </div>
              )}
            </div>
          </Card>
          <Card className="animate-rise">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Task Board</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Latest uploads</h2>
            <div className="mt-4 space-y-3">
              {tasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                >
                  <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                    <span>Role: {task.role}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1">PDF</span>
                  </div>
                </div>
              ))}
              {!tasks.length && (
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-muted">
                  No tasks uploaded yet.
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
