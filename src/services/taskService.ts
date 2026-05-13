import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
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

export const createTask = async (payload: Omit<TaskRecord, 'id' | 'uploadedAt'>) => {
  const uploadedAt = new Date().toISOString()
  const docRef = await addDoc(collection(db, TASK_COLLECTION), {
    ...payload,
    uploadedAt,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export const updateTask = async (taskId: string, payload: Partial<TaskRecord>) => {
  const docRef = doc(db, TASK_COLLECTION, taskId)
  await updateDoc(docRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  })
}

const mapTaskDoc = (docItem: any): TaskRecord => {
  const data = docItem.data()
  return {
    id: docItem.id,
    title: data.title || '',
    role: data.role,
    pdfUrl: data.pdfUrl,
    fileName: data.fileName,
    uploadedAt: data.uploadedAt || new Date().toISOString(),
    
    description: data.description,
    deadline: data.deadline,
    priority: data.priority,
    status: data.status,
    assignedTo: data.assignedTo,
    department: data.department,
    contactPerson: data.contactPerson,
    createdBy: data.createdBy,
    
    clientName: data.clientName,
    clientContact: data.clientContact,
    isInterested: data.isInterested,
    selectedPackage: data.selectedPackage,
    totalAmount: data.totalAmount,
    paidAmount: data.paidAmount,
    pendingAmount: data.pendingAmount,
    videoStatus: data.videoStatus,
    packageDuration: data.packageDuration,
    deliveryDate: data.deliveryDate,
    assignedEditor: data.assignedEditor,
    
    totalVideos: data.totalVideos,
    completedVideos: data.completedVideos,
    instructions: data.instructions,
    timeline: data.timeline,
  }
}

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
  return tasks.sort((a, b) => {
    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  })
}

export const getTasksForEmployee = async (employeeId: string): Promise<TaskRecord[]> => {
  // Query tasks where assignedTo == employeeId
  const snapshot = await getDocs(
    query(
      collection(db, TASK_COLLECTION),
      where('assignedTo', '==', employeeId)
    )
  )

  const tasks = snapshot.docs.map(mapTaskDoc)
  return tasks.sort((a, b) => {
    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  })
}
