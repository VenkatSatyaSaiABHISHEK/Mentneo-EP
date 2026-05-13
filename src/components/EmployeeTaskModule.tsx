import { useEffect, useState } from 'react'
import { getEmployees } from '../services/employeeService'
import { getTasksForEmployee, createTask, updateTask } from '../services/taskService'
import type { EmployeeRecord } from '../types/employee'
import type { TaskRecord } from '../types/task'

interface EmployeeTaskModuleProps {
  employee: EmployeeRecord
}

export default function EmployeeTaskModule({ employee }: EmployeeTaskModuleProps) {
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [allEmployees, setAllEmployees] = useState<EmployeeRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Telecaller Form State
  const [showClientForm, setShowClientForm] = useState(false)
  const [clientData, setClientData] = useState({
    clientName: '',
    clientContact: '',
    isInterested: 'No' as 'Yes' | 'No',
    selectedPackage: '',
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    videoStatus: 'Video Pending' as 'Video Sent' | 'Video Pending',
    packageDuration: '',
    deliveryDate: '',
    assignedEditor: '',
  })

  // Selected Task State for modal or expanding
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [employee.employeeId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const emps = await getEmployees()
      setAllEmployees(emps)
      const empTasks = await getTasksForEmployee(employee.employeeId)
      setTasks(empTasks)
    } finally {
      setIsLoading(false)
    }
  }

  const editors = allEmployees.filter(emp => emp.role.toLowerCase().includes('editor') || emp.role.toLowerCase().includes('video'))
  // Mock AI Suggestion - pick the one with least tasks, for now just pick the first available
  const suggestedEditor = editors.length > 0 ? editors[0] : null

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (clientData.isInterested === 'Yes' && !clientData.assignedEditor) {
        alert("Please assign an editor")
        setIsSubmitting(false)
        return
      }
      
      const targetEmp = clientData.isInterested === 'Yes' ? clientData.assignedEditor : employee.employeeId

      await createTask({
        title: `Client: ${clientData.clientName}`,
        description: `New lead created by telecaller. Interested: ${clientData.isInterested}`,
        priority: clientData.isInterested === 'Yes' ? 'High' : 'Low',
        status: clientData.isInterested === 'Yes' ? 'New' : 'Completed',
        assignedTo: targetEmp,
        createdBy: employee.employeeId,
        department: 'Video Editing',
        
        // Client details
        clientName: clientData.clientName,
        clientContact: clientData.clientContact,
        isInterested: clientData.isInterested,
        selectedPackage: clientData.selectedPackage,
        totalAmount: clientData.totalAmount,
        paidAmount: clientData.paidAmount,
        pendingAmount: clientData.pendingAmount,
        videoStatus: clientData.videoStatus,
        packageDuration: clientData.packageDuration,
        deliveryDate: clientData.deliveryDate,
        assignedEditor: clientData.assignedEditor,
        
        totalVideos: 15, // Example default
        completedVideos: 0,
        timeline: [{
          status: 'Created',
          timestamp: new Date().toISOString(),
          note: 'Task created by Telecaller'
        }]
      })
      
      setShowClientForm(false)
      setClientData({
        clientName: '',
        clientContact: '',
        isInterested: 'No',
        selectedPackage: '',
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        videoStatus: 'Video Pending',
        packageDuration: '',
        deliveryDate: '',
        assignedEditor: '',
      })
      await loadData()
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateProgress = async (taskId: string, current: number, total: number) => {
    if (current < total) {
      await updateTask(taskId, { completedVideos: current + 1 })
    } else {
      await updateTask(taskId, { status: 'Completed' })
    }
    loadData()
  }

  const isTelecaller = employee.role.toLowerCase().includes('telecall')
  const newTasksCount = tasks.filter(t => t.status === 'New').length
  const pendingTasksCount = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length
  const completedTasksCount = tasks.filter(t => t.status === 'Completed' || t.status === 'Delivered').length

  return (
    <div className="space-y-6 pb-6 animate-rise">
      {/* Daily Target Section */}
      <div className="rounded-[2rem] bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 shadow-xl shadow-emerald-200/50 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13.5h-13L12 6.5z"/></svg>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-100 mb-1">Daily Targets</p>
        <h3 className="text-xl font-bold mb-4">Your Performance</h3>
        <div className="flex gap-4">
          <div className="bg-black/20 rounded-2xl p-4 flex-1 text-center backdrop-blur-md">
            <p className="text-3xl font-black">{newTasksCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 mt-1">New</p>
          </div>
          <div className="bg-black/20 rounded-2xl p-4 flex-1 text-center backdrop-blur-md">
            <p className="text-3xl font-black">{pendingTasksCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 mt-1">Pending</p>
          </div>
          <div className="bg-black/20 rounded-2xl p-4 flex-1 text-center backdrop-blur-md">
            <p className="text-3xl font-black">{completedTasksCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 mt-1">Completed</p>
          </div>
        </div>
      </div>

      {/* Telecaller Add Client Form */}
      {isTelecaller && (
        <div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/50">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Telecaller Tools</p>
              <h3 className="text-lg font-bold text-slate-900">New Client Entry</h3>
            </div>
            <button 
              onClick={() => setShowClientForm(!showClientForm)}
              className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-full transition-transform hover:scale-105"
            >
              {showClientForm ? 'Cancel' : '+ Add Client'}
            </button>
          </div>

          {showClientForm && (
            <form onSubmit={handleClientSubmit} className="space-y-4 animate-rise mt-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Client Name</label>
                <input required type="text" value={clientData.clientName} onChange={e => setClientData({...clientData, clientName: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Enter full name" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Contact Number</label>
                <input required type="text" value={clientData.clientContact} onChange={e => setClientData({...clientData, clientContact: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Enter WhatsApp number" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Interested?</label>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setClientData({...clientData, isInterested: 'Yes'})} className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${clientData.isInterested === 'Yes' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>Yes</button>
                  <button type="button" onClick={() => setClientData({...clientData, isInterested: 'No'})} className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${clientData.isInterested === 'No' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>No</button>
                </div>
              </div>

              {clientData.isInterested === 'Yes' && (
                <div className="space-y-4 animate-rise p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Package</label>
                    <input required type="text" value={clientData.selectedPackage} onChange={e => setClientData({...clientData, selectedPackage: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500" placeholder="e.g. Pro Edit Package" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Total (₹)</label>
                      <input required type="number" value={clientData.totalAmount} onChange={e => setClientData({...clientData, totalAmount: Number(e.target.value)})} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Paid (₹)</label>
                      <input required type="number" value={clientData.paidAmount} onChange={e => setClientData({...clientData, paidAmount: Number(e.target.value), pendingAmount: clientData.totalAmount - Number(e.target.value)})} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Delivery Date</label>
                      <input required type="date" value={clientData.deliveryDate} onChange={e => setClientData({...clientData, deliveryDate: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Video Status</label>
                      <select value={clientData.videoStatus} onChange={e => setClientData({...clientData, videoStatus: e.target.value as any})} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500">
                        <option value="Video Pending">Pending</option>
                        <option value="Video Sent">Sent</option>
                      </select>
                    </div>
                  </div>

                  {/* Editor Selection System */}
                  <div className="pt-4 border-t border-slate-200">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Assign Editor</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                      {suggestedEditor && (
                        <div 
                          onClick={() => setClientData({...clientData, assignedEditor: suggestedEditor.employeeId})}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${clientData.assignedEditor === suggestedEditor.employeeId ? 'border-emerald-500 bg-emerald-50' : 'border-emerald-200 bg-white hover:border-emerald-300'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">{suggestedEditor.name.charAt(0)}</div>
                            <div>
                              <p className="font-bold text-sm text-slate-900">{suggestedEditor.name}</p>
                              <p className="text-[10px] text-emerald-600 font-bold uppercase flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                AI Suggested Match
                              </p>
                            </div>
                          </div>
                          <span className="text-emerald-500">★</span>
                        </div>
                      )}
                      {editors.filter(e => e.employeeId !== suggestedEditor?.employeeId).map(editor => (
                        <div 
                          key={editor.employeeId}
                          onClick={() => setClientData({...clientData, assignedEditor: editor.employeeId})}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${clientData.assignedEditor === editor.employeeId ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">{editor.name.charAt(0)}</div>
                            <div>
                              <p className="font-bold text-sm text-slate-900">{editor.name}</p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Available
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="w-full mt-4 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800 shadow-lg disabled:opacity-50">
                {isSubmitting ? 'Saving...' : 'Save & Assign'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Task List */}
      <div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/50">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Your Queue</p>
        <h3 className="text-lg font-bold text-slate-900 mb-4">Assigned Tasks</h3>
        
        {isLoading ? (
          <div className="text-center py-8">
            <div className="h-8 w-8 mx-auto rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-500 font-medium">No tasks assigned yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map(task => {
              const isExpanded = expandedTaskId === task.id
              const totalVids = task.totalVideos || 15
              const compVids = task.completedVideos || 0
              const progressPct = Math.round((compVids / totalVids) * 100)
              
              return (
                <div key={task.id} className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Task Header - Always visible */}
                  <div 
                    onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                    className="p-4 flex items-center justify-between cursor-pointer bg-slate-50/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {task.status === 'New' && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
                        <h4 className="font-bold text-slate-900 truncate">{task.title}</h4>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{task.clientName ? `Client: ${task.clientName}` : task.department || 'Internal Task'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider
                        ${task.status === 'New' ? 'bg-blue-100 text-blue-700' : 
                          task.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                          task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                          'bg-slate-100 text-slate-700'}`}
                      >
                        {task.status || 'New'}
                      </span>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>

                  {/* Task Details - Expanded */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-100 animate-rise space-y-4">
                      
                      {/* Description */}
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">{task.description || 'No description provided.'}</p>
                      
                      {/* Editor Specific Details */}
                      {task.clientName && (
                        <div className="grid grid-cols-2 gap-4 text-sm bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                          <div><span className="block text-[10px] font-bold uppercase text-slate-400">Package</span> <span className="font-semibold text-slate-700">{task.selectedPackage}</span></div>
                          <div><span className="block text-[10px] font-bold uppercase text-slate-400">Delivery By</span> <span className="font-semibold text-slate-700">{task.deliveryDate}</span></div>
                          <div className="col-span-2 flex justify-between items-center bg-white p-2 rounded-lg mt-1 border border-slate-100">
                            <span className="font-medium text-slate-600">{task.clientContact}</span>
                            <a href={`https://wa.me/${task.clientContact}`} target="_blank" rel="noreferrer" className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-1 px-3 rounded-full flex items-center gap-1 transition-colors">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                              WhatsApp
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Progress Tracker (For editors/videos) */}
                      {task.clientName && task.status !== 'Completed' && (
                        <div className="bg-white border border-slate-200 p-4 rounded-xl">
                          <div className="flex justify-between items-end mb-2">
                            <div>
                              <p className="text-[10px] font-bold uppercase text-slate-400">Progress Tracker</p>
                              <p className="text-sm font-bold text-slate-900">{compVids} / {totalVids} Videos</p>
                            </div>
                            <p className="text-xs font-bold text-emerald-500">{progressPct}%</p>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <button 
                              onClick={() => updateProgress(task.id, compVids, totalVids)}
                              disabled={compVids >= totalVids}
                              className="flex-1 bg-slate-900 text-white text-xs font-bold py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                            >
                              + Mark Video Done
                            </button>
                            <button 
                              onClick={() => updateTask(task.id, { status: 'Delivered' })}
                              className="px-4 bg-indigo-50 text-indigo-600 border border-indigo-200 text-xs font-bold py-2 rounded-lg hover:bg-indigo-100"
                            >
                              Deliver
                            </button>
                          </div>
                        </div>
                      )}

                      {/* General Tasks actions */}
                      {!task.clientName && task.status !== 'Completed' && (
                        <div className="flex gap-2 pt-2">
                          {task.status === 'New' && (
                            <button onClick={() => updateTask(task.id, { status: 'In Progress' })} className="flex-1 bg-slate-900 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-slate-800">
                              Start Work
                            </button>
                          )}
                          {task.status === 'In Progress' && (
                            <button onClick={() => updateTask(task.id, { status: 'Completed' })} className="flex-1 bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-emerald-600">
                              Mark Completed
                            </button>
                          )}
                        </div>
                      )}

                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
