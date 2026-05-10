import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from './firebase'
import type { TaskRecord } from '../types/task'

const TASK_COLLECTION = 'tasks'

export const uploadTask = async (payload: {
  title: string
  role: string
  file: File
}) => {
  const safeName = payload.file.name.replace(/\s+/g, '-').toLowerCase()
  const storageRef = ref(storage, `task-pdfs/${payload.role}/${Date.now()}-${safeName}`)
  await uploadBytes(storageRef, payload.file)
  const pdfUrl = await getDownloadURL(storageRef)
  const uploadedAt = new Date().toISOString()

  await addDoc(collection(db, TASK_COLLECTION), {
    title: payload.title.trim(),
    role: payload.role.trim(),
    pdfUrl,
    fileName: payload.file.name,
    uploadedAt,
    createdAt: serverTimestamp(),
  })
}

const mapTaskDoc = (docItem: any) => ({
  id: docItem.id,
  title: docItem.data().title,
  role: docItem.data().role,
  pdfUrl: docItem.data().pdfUrl,
  fileName: docItem.data().fileName,
  uploadedAt: docItem.data().uploadedAt,
}) as TaskRecord

export const getAllTasks = async (): Promise<TaskRecord[]> => {
  const snapshot = await getDocs(
    query(collection(db, TASK_COLLECTION), orderBy('createdAt', 'desc'))
  )

  return snapshot.docs.map(mapTaskDoc)
}

export const getTasksForRole = async (role: string): Promise<TaskRecord[]> => {
  const snapshot = await getDocs(
    query(
      collection(db, TASK_COLLECTION),
      where('role', 'in', [role, 'All'])
    )
  )

  const tasks = snapshot.docs.map(mapTaskDoc)
  // Sort locally to avoid needing a composite index in Firestore
  return tasks.sort((a, b) => {
    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  })
}
