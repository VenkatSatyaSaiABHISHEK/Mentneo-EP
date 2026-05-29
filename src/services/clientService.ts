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
      paymentPhotoUrl: data.paymentPhotoUrl || '',
      clientDataUrl: data.clientDataUrl || '',
      pendingAmount: Number(data.pendingAmount) || 0,
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

export const uploadClientFile = async (file: File, folder: 'payments' | 'client-data'): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary environment variables missing');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', `mentneo/clients/${folder}`);

  const resourceType = file.type.startsWith('image/') ? 'image' : 'raw';
  
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Cloudinary upload failed: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.secure_url;
}
