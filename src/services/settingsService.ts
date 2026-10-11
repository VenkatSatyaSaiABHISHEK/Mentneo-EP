import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'

export interface KioskSettings {
  attendanceMethod: 'camera' | 'pin'
}

export interface AttendanceTimingSettings {
  openTime: string // e.g. "08:00" (morning open time)
  closeTime: string // e.g. "09:30" (morning close time)
  enforceWindow: boolean // whether punch-in is only allowed inside the window
  onTimeCutoff: string // e.g. "09:30"
  halfDayCutoff: string // e.g. "13:00"
  endOfDayCutoff: string // e.g. "19:00"
  photoRetentionDays: number // e.g. 30
}

export const DEFAULT_TIMING_SETTINGS: AttendanceTimingSettings = {
  openTime: '08:00',
  closeTime: '09:30',
  enforceWindow: true,
  onTimeCutoff: '09:30',
  halfDayCutoff: '13:00',
  endOfDayCutoff: '19:00',
  photoRetentionDays: 30,
}

export const formatTime12Hour = (time24: string): string => {
  if (!time24) return ''
  const [hStr, mStr] = time24.split(':')
  const h = parseInt(hStr, 10)
  if (isNaN(h)) return time24
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${String(h12).padStart(2, '0')}:${mStr || '00'} ${ampm}`
}

export const checkAttendanceWindowStatus = (
  settings?: AttendanceTimingSettings,
  testTime?: string
): { isOpen: boolean; message: string; currentTimeStr: string } => {
  const s = settings || DEFAULT_TIMING_SETTINGS
  const now = new Date()
  const currentTimeStr =
    testTime ||
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  if (!s.enforceWindow) {
    return {
      isOpen: true,
      message: 'Attendance is currently open (Window restriction inactive).',
      currentTimeStr,
    }
  }

  const openFormatted = formatTime12Hour(s.openTime)
  const closeFormatted = formatTime12Hour(s.closeTime)
  const currentFormatted = formatTime12Hour(currentTimeStr)

  if (currentTimeStr < s.openTime) {
    return {
      isOpen: false,
      message: `Attendance opens at ${openFormatted}. Current time is ${currentFormatted}.`,
      currentTimeStr,
    }
  }

  if (currentTimeStr > s.closeTime) {
    return {
      isOpen: false,
      message: `Attendance closed at ${closeFormatted}. Current time is ${currentFormatted}.`,
      currentTimeStr,
    }
  }

  return {
    isOpen: true,
    message: `Attendance is OPEN (${openFormatted} - ${closeFormatted}).`,
    currentTimeStr,
  }
}

export const getAttendanceTimingSettings = async (): Promise<AttendanceTimingSettings> => {
  try {
    const docRef = doc(db, 'settings', 'attendance_timing')
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return { ...DEFAULT_TIMING_SETTINGS, ...docSnap.data() } as AttendanceTimingSettings
    }
  } catch (err) {
    console.error('Error getting timing settings:', err)
  }
  return DEFAULT_TIMING_SETTINGS
}

export const subscribeToAttendanceTimingSettings = (
  callback: (settings: AttendanceTimingSettings) => void
): (() => void) => {
  const docRef = doc(db, 'settings', 'attendance_timing')
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback({ ...DEFAULT_TIMING_SETTINGS, ...docSnap.data() } as AttendanceTimingSettings)
      } else {
        callback(DEFAULT_TIMING_SETTINGS)
      }
    },
    (err) => {
      console.error('Error listening to timing settings:', err)
      callback(DEFAULT_TIMING_SETTINGS)
    }
  )
}

export const updateAttendanceTimingSettings = async (
  settings: Partial<AttendanceTimingSettings>
): Promise<void> => {
  const docRef = doc(db, 'settings', 'attendance_timing')
  await setDoc(docRef, { ...settings, updatedAt: new Date().toISOString() }, { merge: true })
}

export interface OfficeLocation {
  officeName: string
  address: string
  latitude: number
  longitude: number
  radiusMeters: number // e.g., 100 meters
  updatedAt?: string
  updatedBy?: string
}

export const DEFAULT_OFFICE_LOCATION: OfficeLocation = {
  officeName: 'Mentneo Headquarters',
  address: 'Mentneo Office Premises',
  latitude: 16.964691,
  longitude: 82.217716,
  radiusMeters: 150,
}

export const getKioskSettings = async (): Promise<KioskSettings> => {
  try {
    const docRef = doc(db, 'settings', 'kiosk')
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return docSnap.data() as KioskSettings
    }
  } catch (err) {
    console.error('Error getting kiosk settings:', err)
  }
  return { attendanceMethod: 'camera' }
}

export const updateKioskSettings = async (settings: KioskSettings): Promise<void> => {
  const docRef = doc(db, 'settings', 'kiosk')
  await setDoc(docRef, settings, { merge: true })
}

export const getOfficeLocation = async (): Promise<OfficeLocation> => {
  try {
    const docRef = doc(db, 'settings', 'office_location')
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return { ...DEFAULT_OFFICE_LOCATION, ...docSnap.data() } as OfficeLocation
    }
  } catch (err) {
    console.error('Error getting office location settings:', err)
  }
  return DEFAULT_OFFICE_LOCATION
}

export const updateOfficeLocation = async (location: OfficeLocation): Promise<void> => {
  const docRef = doc(db, 'settings', 'office_location')
  await setDoc(
    docRef,
    {
      ...location,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  )
}

/**
 * Calculates distance between two GPS coordinates in meters using the Haversine formula.
 */
export const calculateDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000 // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const radLat1 = toRad(lat1)
  const radLat2 = toRad(lat2)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(radLat1) * Math.cos(radLat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

