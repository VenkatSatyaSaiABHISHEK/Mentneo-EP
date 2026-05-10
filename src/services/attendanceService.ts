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

const ATTENDANCE_COLLECTION = 'attendance'

export const getTodayKey = () =>
  new Date().toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

export const saveAttendance = async (payload: {
  empId: string
  name: string
  time?: string
  imageUrl?: string
}) => {
  const now = new Date()
  const date = getTodayKey()
  const time =
    payload.time ??
    now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })

  await addDoc(collection(db, ATTENDANCE_COLLECTION), {
    empId: payload.empId,
    name: payload.name,
    date,
    time,
    status: 'present',
    imageUrl: payload.imageUrl || null,
    createdAt: serverTimestamp(),
    timestampMs: Date.now(), // Store raw timestamp for exact 24hr calculation
  })
}

export const getAttendanceForDate = async (date: string): Promise<AttendanceRecord[]> => {
  const snapshot = await getDocs(
    query(
      collection(db, ATTENDANCE_COLLECTION),
      where('date', '==', date),
      orderBy('createdAt', 'desc')
    )
  )

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    empId: docItem.data().empId,
    name: docItem.data().name,
    date: docItem.data().date,
    time: docItem.data().time,
    status: docItem.data().status ?? 'present',
    imageUrl: docItem.data().imageUrl ?? undefined,
  }))
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

  const records = snapshot.docs.map((docItem) => ({
    id: docItem.id,
    empId: docItem.data().empId,
    name: docItem.data().name,
    date: docItem.data().date,
    time: docItem.data().time,
    status: docItem.data().status ?? 'present',
    imageUrl: docItem.data().imageUrl ?? undefined,
  }))

  // Sort locally by date descending
  return records.sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * Automatically remove images for records older than 24 hours.
 * Keeping the text record, but stripping the base64 payload to optimize storage.
 */
export const cleanupOldImages = async () => {
  try {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    // Query where timestampMs < oneDayAgo
    const snapshot = await getDocs(
      query(
        collection(db, ATTENDANCE_COLLECTION),
        where('timestampMs', '<', oneDayAgo)
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
