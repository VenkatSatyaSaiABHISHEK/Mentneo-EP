import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Client } from '../types/client'

const CLIENTS_COLLECTION = 'clients'

export const createClient = async (payload: Omit<Client, 'id'>) => {
  const docRef = await addDoc(collection(db, CLIENTS_COLLECTION), {
    ...payload,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export const getAllClients = async (): Promise<Client[]> => {
  const snapshot = await getDocs(
    query(collection(db, CLIENTS_COLLECTION), orderBy('createdAt', 'desc'))
  )

  return snapshot.docs.map((docItem) => {
    const data = docItem.data()
    return {
      id: docItem.id,
      clientName: data.clientName || '',
      phoneNumber: data.phoneNumber || '',
      telecallerName: data.telecallerName || '',
      editorName: data.editorName || '',
      status: data.status || 'Pending',
      selectedPackage: data.selectedPackage || '',
      videos: data.videos || '',
    } as Client
  })
}

export const updateClient = async (clientId: string, payload: Partial<Client>) => {
  const docRef = doc(db, CLIENTS_COLLECTION, clientId)
  await updateDoc(docRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  })
}
