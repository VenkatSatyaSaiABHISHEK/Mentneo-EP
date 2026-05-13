import { useEffect, useState } from 'react'
import { getEmployees } from '../services/employeeService'
import { getAllTasks, createTask } from '../services/taskService'
import type { EmployeeRecord } from '../types/employee'
import type { TaskRecord } from '../types/task'

export default function Tasks() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    deadline: '',
    priority: 'Medium' as const,
    assignedTo: '',
    department: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const empData = await getEmployees()
      const taskData = await getAllTasks()
      setEmployees(empData)
      setTasks(taskData)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.title || !newTask.assignedTo) return

    setIsSubmitting(true)
    try {
      await createTask({
        title: newTask.title,
        description: newTask.description,
        deadline: newTask.deadline,
        priority: newTask.priority,
        status: 'New',
        assignedTo: newTask.assignedTo,
        department: newTask.department,
        createdBy: 'HR', // Hardcoded for HR admin panel
      })
      
      // Reset form
      setNewTask({
        title: '',
        description: '',
        deadline: '',
        priority: 'Medium',
        assignedTo: '',
        department: '',
      })
      await loadData()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Task Management</h1>
          <p className="text-sm text-slate-500">Assign and track employee tasks.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Task Form */}
        <div className="lg:col-span-1 rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/50">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Assign New Task</h2>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Task Title</label>
              <input
                type="text"
                required
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="e.g. Frontend Design Update"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Description</label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all h-24 resize-none"
                placeholder="Task details..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Assign To</label>
                <select
                  required
                  value={newTask.assignedTo}
                  onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.employeeId} value={emp.employeeId}>{emp.name} ({emp.employeeId})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Department</label>
                <input
                  type="text"
                  value={newTask.department}
                  onChange={(e) => setNewTask({ ...newTask, department: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="e.g. AI Dev"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Deadline</label>
                <input
                  type="date"
                  value={newTask.deadline}
                  onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {isSubmitting ? 'Assigning...' : 'Assign Task'}
            </button>
          </form>
        </div>

        {/* Task List */}
        <div className="lg:col-span-2 rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/50 flex flex-col h-[700px]">
          <h2 className="text-lg font-bold text-slate-900 mb-4">All Tasks</h2>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {isLoading ? (
              <div className="text-center py-10 text-slate-500">Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-10 text-slate-500">No tasks assigned yet.</div>
            ) : (
              tasks.map(task => {
                const assignedEmp = employees.find(e => e.employeeId === task.assignedTo)
                return (
                  <div key={task.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50 hover:bg-slate-100 transition-colors relative">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-slate-900">{task.title}</h3>
                        <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.status === 'New' && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">New</span>}
                        {task.status === 'Pending' && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">Pending</span>}
                        {task.status === 'In Progress' && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">In Progress</span>}
                        {task.status === 'Completed' && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">Completed</span>}
                        {task.status === 'Delivered' && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">Delivered</span>}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200">
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned To</span>
                        <span className="text-sm font-semibold text-slate-700">{assignedEmp?.name || task.assignedTo || 'Unassigned'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Deadline</span>
                        <span className="text-sm font-semibold text-slate-700">{task.deadline || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Priority</span>
                        <span className="text-sm font-semibold text-slate-700">{task.priority || 'Medium'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Department</span>
                        <span className="text-sm font-semibold text-slate-700">{task.department || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
