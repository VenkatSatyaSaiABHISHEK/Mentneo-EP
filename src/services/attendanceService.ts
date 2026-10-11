import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
  updateDoc,
  doc,
  deleteField
} from 'firebase/firestore'
import { db } from './firebase'
import type { AttendanceRecord } from '../types/attendance'
import { compressImage } from '../utils/imageCompressor'
import { getAttendanceTimingSettings } from './settingsService'

const ATTENDANCE_COLLECTION = 'attendance'

export const getTodayKey = () =>
  new Date().toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

/**
 * Determine time slab (On time / Late / Half-day) based on configured cutoff
 */
export const calculateTimeSlab = (
  checkInTimeStr: string,
  onTimeCutoff = '09:30',
  halfDayCutoff = '13:00'
): 'on-time' | 'late' | 'half-day' => {
  try {
    // Parse checkInTimeStr e.g. "09:15 AM" or "09:15"
    const parseTimeToMinutes = (tStr: string) => {
      const match = tStr.match(/(\d+):(\d+)\s*(AM|PM)?/i)
      if (!match) return 0
      let hours = parseInt(match[1], 10)
      const minutes = parseInt(match[2], 10)
      const period = match[3]?.toUpperCase()

      if (period === 'PM' && hours < 12) hours += 12
      if (period === 'AM' && hours === 12) hours = 0
      return hours * 60 + minutes
    }

    const checkInMin = parseTimeToMinutes(checkInTimeStr)
    const onTimeMin = parseTimeToMinutes(onTimeCutoff)
    const halfDayMin = parseTimeToMinutes(halfDayCutoff)

    if (checkInMin <= onTimeMin) return 'on-time'
    if (checkInMin > halfDayMin) return 'half-day'
    return 'late'
  } catch {
    return 'on-time'
  }
}

/**
 * Saves attendance record with local-first image persistence.
 * Compresses the image on client, saves to local server storage immediately,
 * and marks uploadStatus = 'pending' for background Cloudinary sync.
 */
export const saveAttendance = async (payload: {
  empId: string
  name: string
  time?: string
  imageUrl?: string
  status?: 'present' | 'absent' | 'half-day' | 'leave'
  location?: {
    latitude: number
    longitude: number
    distanceMeters?: number
    officeName?: string
  }
}) => {
  const now = new Date()
  const date = getTodayKey()
  const time =
    payload.time ??
    now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })

  // Get current timing settings
  const timingSettings = await getAttendanceTimingSettings().catch(() => ({
    onTimeCutoff: '09:30',
    halfDayCutoff: '13:00',
    endOfDayCutoff: '19:00',
    photoRetentionDays: 30,
  }))

  const timeSlab = calculateTimeSlab(time, timingSettings.onTimeCutoff, timingSettings.halfDayCutoff)

  let localPhotoPath = ''
  let compressedPhoto = payload.imageUrl || null

  // 1. Compress image in browser (max 1024px, JPEG 0.82)
  if (compressedPhoto && compressedPhoto.startsWith('data:image')) {
    try {
      compressedPhoto = await compressImage(compressedPhoto, 1024, 0.82)
    } catch (e) {
      console.warn('Image compression fallback:', e)
    }
  }

  // 2. Local-first backend save: attempt local server endpoint
  if (compressedPhoto) {
    try {
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empId: payload.empId,
          name: payload.name,
          date,
          time,
          imageBase64: compressedPhoto,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.localPhotoPath) {
          localPhotoPath = data.localPhotoPath
        }
      }
    } catch {
      // Local API unavailable (static dev or server down); fallback to inline dataUrl
    }
  }

  // If localPhotoPath was generated, use it as imageUrl so UI renders instantly from local file
  const displayImageUrl = localPhotoPath || compressedPhoto || null

  // 3. Save attendance record in Firestore immediately
  const docRef = await addDoc(collection(db, ATTENDANCE_COLLECTION), {
    empId: payload.empId,
    name: payload.name,
    date,
    time,
    checkInTime: time,
    status: payload.status ?? (timeSlab === 'half-day' ? 'half-day' : 'present'),
    imageUrl: displayImageUrl,
    localPhotoPath: localPhotoPath || null,
    uploadStatus: localPhotoPath ? 'pending' : 'uploaded', // pending Cloudinary background worker
    timeSlab,
    location: payload.location || null,
    createdAt: serverTimestamp(),
    timestampMs: Date.now(),
    retryCount: 0,
  })

  return docRef.id
}

const mapDocToRecord = (docItem: any): AttendanceRecord => {
  const data = docItem.data()
  return {
    id: docItem.id,
    empId: data.empId,
    name: data.name,
    date: data.date,
    time: data.time || data.checkInTime || '',
    checkInTime: data.checkInTime || data.time || '',
    checkOutTime: data.checkOutTime || undefined,
    status: data.status ?? 'present',
    imageUrl: data.imageUrl ?? data.cloudinaryUrl ?? data.localPhotoPath ?? undefined,
    checkOutImageUrl: data.checkOutImageUrl ?? undefined,
    localPhotoPath: data.localPhotoPath ?? undefined,
    cloudinaryUrl: data.cloudinaryUrl ?? undefined,
    cloudinaryPublicId: data.cloudinaryPublicId ?? undefined,
    uploadStatus: data.uploadStatus ?? (data.imageUrl ? 'uploaded' : undefined),
    uploadError: data.uploadError ?? undefined,
    retryCount: data.retryCount ?? 0,
    totalHoursWorked: data.totalHoursWorked ?? undefined,
    timeSlab: data.timeSlab ?? 'on-time',
    location: data.location ?? undefined,
    isEdited: data.isEdited ?? false,
    editedBy: data.editedBy ?? undefined,
    editedAt: data.editedAt ?? undefined,
    editReason: data.editReason ?? undefined,
    originalStatus: data.originalStatus ?? undefined,
    timestampMs: data.timestampMs ?? undefined,
  }
}

export const getAttendanceForDate = async (date: string): Promise<AttendanceRecord[]> => {
  const snapshot = await getDocs(
    query(
      collection(db, ATTENDANCE_COLLECTION),
      where('date', '==', date),
      orderBy('createdAt', 'desc')
    )
  )

  return snapshot.docs.map(mapDocToRecord)
}

export const getAttendanceCountForEmployee = async (empId: string, date: string) => {
  const snapshot = await getDocs(
    query(
      collection(db, ATTENDANCE_COLLECTION),
      where('empId', '==', empId),
      where('date', '==', date)
    )
  )

  return snapshot.size
}

export const getAllAttendanceForEmployee = async (empId: string): Promise<AttendanceRecord[]> => {
  const snapshot = await getDocs(
    query(
      collection(db, ATTENDANCE_COLLECTION),
      where('empId', '==', empId)
    )
  )

  const records = snapshot.docs.map(mapDocToRecord)
  return records.sort((a, b) => b.date.localeCompare(a.date))
}

export const getAttendanceForMonth = async (monthKey: string): Promise<AttendanceRecord[]> => {
  const snapshot = await getDocs(
    query(
      collection(db, ATTENDANCE_COLLECTION),
      where('date', '>=', `${monthKey}-01`),
      where('date', '<=', `${monthKey}-31`)
    )
  )

  return snapshot.docs.map(mapDocToRecord)
}

/**
 * HR manual attendance cell correction with audit record
 */
export const updateAttendanceRecord = async (
  recordId: string,
  updates: {
    status: 'present' | 'absent' | 'half-day' | 'leave'
    reason: string
    hrName: string
    originalStatus?: string
  }
): Promise<void> => {
  const docRef = doc(db, ATTENDANCE_COLLECTION, recordId)
  await updateDoc(docRef, {
    status: updates.status,
    isEdited: true,
    editedBy: updates.hrName,
    editedAt: new Date().toISOString(),
    editReason: updates.reason,
    originalStatus: updates.originalStatus || 'present',
    updatedAt: serverTimestamp(),
  })
}

/**
 * Trigger Cloudinary background retry for an attendance record
 */
export const retryPhotoUpload = async (recordId: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const res = await fetch(`/api/attendance/retry-upload/${recordId}`, {
      method: 'POST',
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.error('Retry API error:', err)
  }
  return { success: false, message: 'Server upload worker unreachable.' }
}

/**
 * Cleanup old images past configured retention period
 */
export const cleanupOldImages = async () => {
  try {
    const settings = await getAttendanceTimingSettings().catch(() => ({ photoRetentionDays: 30 }))
    const retentionDays = settings.photoRetentionDays || 30

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
    const cutoffMs = cutoffDate.getTime()

    const snapshot = await getDocs(
      query(
        collection(db, ATTENDANCE_COLLECTION),
        where('timestampMs', '<', cutoffMs)
      )
    )

    const updates = snapshot.docs
      .filter((d) => d.data().imageUrl !== null && d.data().imageUrl !== undefined)
      .map((d) => updateDoc(doc(db, ATTENDANCE_COLLECTION, d.id), { imageUrl: deleteField() }))
    
    await Promise.all(updates)
  } catch (err) {
    console.error('Error cleaning up old images:', err)
  }
}
