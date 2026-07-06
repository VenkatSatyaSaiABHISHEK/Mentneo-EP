import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

export interface KioskSettings {
  attendanceMethod: 'camera' | 'pin'
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
