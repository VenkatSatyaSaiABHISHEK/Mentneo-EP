export type TaskRecord = {
  id: string
  title: string
  role?: string // optional now, old system used it
  pdfUrl?: string
  fileName?: string
  uploadedAt: string
  
  // Base fields
  description?: string
  deadline?: string
  priority?: 'High' | 'Medium' | 'Low'
  status?: 'New' | 'Pending' | 'In Progress' | 'Completed' | 'Delivered'
  assignedTo?: string // employeeId
  department?: string
  contactPerson?: string
  createdBy?: string // HR or telecaller employeeId
  
  // Telecaller / Client fields
  clientName?: string
  clientContact?: string
  isInterested?: 'Yes' | 'No'
  selectedPackage?: string
  totalAmount?: number
  paidAmount?: number
  pendingAmount?: number
  videoStatus?: 'Video Sent' | 'Video Pending'
  packageDuration?: string
  deliveryDate?: string
  assignedEditor?: string // employeeId
  
  // Editor fields
  totalVideos?: number
  completedVideos?: number
  instructions?: string
  
  // Updates timeline
  timeline?: {
    status: string
    timestamp: string
    note?: string
  }[]
}
