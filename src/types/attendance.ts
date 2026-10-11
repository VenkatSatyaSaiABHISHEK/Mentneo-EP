export type AttendanceStatus = 'present' | 'absent' | 'half-day' | 'leave'

export interface AttendanceRecord {
  id: string
  empId: string
  name: string
  date: string // 'YYYY-MM-DD'
  time: string
  checkInTime?: string
  checkOutTime?: string
  status: 'present' | 'absent' | 'half-day' | 'leave' | string
  imageUrl?: string // points to localPhotoPath while pending, or cloudinaryUrl after upload
  checkOutImageUrl?: string
  localPhotoPath?: string
  cloudinaryUrl?: string
  cloudinaryPublicId?: string
  uploadStatus?: 'pending' | 'uploaded' | 'failed'
  uploadError?: string
  retryCount?: number
  totalHoursWorked?: number | string
  timeSlab?: 'on-time' | 'late' | 'half-day'
  location?: {
    latitude: number
    longitude: number
    distanceMeters?: number
    officeName?: string
  }
  isEdited?: boolean
  editedBy?: string
  editedAt?: string
  editReason?: string
  originalStatus?: string
  timestampMs?: number
}
