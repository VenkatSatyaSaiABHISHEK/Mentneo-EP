
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import QRCode from 'qrcode'
import { db } from './firebase'
import type { EmployeeRecord, CsvEmployeeRow } from '../types/employee'

const EMPLOYEE_COLLECTION = 'employees'
const COUNTER_DOC = 'metadata/employeeCounter'

export const generateStrongPassword = (name: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const namePrefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase() || 'EM'
  let password = namePrefix
  for (let i = 0; i < 4; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

const formatEmployeeId = (index: number) => `EPMN${String(index).padStart(4, '0')}`

const parseSalary = (value: string) => {
  const normalized = value.replace(/[^0-9.]/g, '')
  return Number.parseFloat(normalized)
}

const generateQrDataUrl = async (employeeId: string) => {
  try {
    const url = `${window.location.origin}/employee/${employeeId}`
    return await QRCode.toDataURL(url, {
      margin: 1,
      width: 512,
      color: {
        dark: '#000000',
        light: '#0000' // transparent
      }
    })
  } catch (err) {
    console.error('Error generating QR code:', err)
    return ''
  }
}

const reserveEmployeeIds = async (count: number) => {
  if (count <= 0) {
    return []
  }

  return runTransaction(db, async (transaction) => {
    const counterRef = doc(db, COUNTER_DOC)
    const snapshot = await transaction.get(counterRef)
    const next = snapshot.exists() ? Number(snapshot.data().next ?? 1) : 1
    const start = Number.isNaN(next) ? 1 : next
    transaction.set(counterRef, { next: start + count }, { merge: true })

    return Array.from({ length: count }, (_, index) => formatEmployeeId(start + index))
  })
}

export const getEmployees = async (): Promise<EmployeeRecord[]> => {
  const employeesRef = collection(db, EMPLOYEE_COLLECTION)
  const snapshot = await getDocs(query(employeesRef, orderBy('employeeId', 'asc')))

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    employeeId: docItem.data().employeeId,
    name: docItem.data().name,
    email: docItem.data().email,
    phone: docItem.data().phone,
    role: docItem.data().role,
    salary: docItem.data().salary,
    joinDate: docItem.data().joinDate,
    qrUrl: docItem.data().qrUrl,
    profileImageUrl: docItem.data().profileImageUrl,
    password: docItem.data().password,
  }))
}

export const getEmployeeByEmployeeId = async (employeeId: string) => {
  const employeesRef = collection(db, EMPLOYEE_COLLECTION)
  const snapshot = await getDocs(
    query(employeesRef, where('employeeId', '==', employeeId), limit(1))
  )

  if (snapshot.empty) {
    return null
  }

  const docItem = snapshot.docs[0]

  return {
    id: docItem.id,
    employeeId: docItem.data().employeeId,
    name: docItem.data().name,
    email: docItem.data().email,
    phone: docItem.data().phone,
    role: docItem.data().role,
    salary: docItem.data().salary,
    joinDate: docItem.data().joinDate,
    qrUrl: docItem.data().qrUrl,
    profileImageUrl: docItem.data().profileImageUrl,
    password: docItem.data().password,
  } as EmployeeRecord
}

export const uploadEmployees = async (rows: CsvEmployeeRow[]) => {
  const ids = await reserveEmployeeIds(rows.length)
  const batch = writeBatch(db)
  const collectionRef = collection(db, EMPLOYEE_COLLECTION)

  const payloads = await Promise.all(
    rows.map(async (row, index) => {
      const employeeId = ids[index]
      const qrDataUrl = await generateQrDataUrl(employeeId)

      return {
        employeeId,
        name: row.name.trim(),
        email: row.email.trim(),
        phone: row.phone.trim(),
        role: row.role.trim(),
        salary: parseSalary(row.salary),
        joinDate: row.joinDate.trim(),
        qrUrl: qrDataUrl,
        password: generateStrongPassword(row.name.trim()),
      }
    })
  )

  payloads.forEach((payload) => {
    const docRef = doc(collectionRef)
    batch.set(docRef, {
      ...payload,
      createdAt: serverTimestamp(),
    })
  })

  await batch.commit()
}

export const addEmployee = async (data: Omit<EmployeeRecord, 'id' | 'employeeId' | 'qrUrl'>) => {
  const ids = await reserveEmployeeIds(1)
  const employeeId = ids[0]
  const qrDataUrl = await generateQrDataUrl(employeeId)

  const docRef = doc(collection(db, EMPLOYEE_COLLECTION))
  await writeBatch(db).set(docRef, {
    employeeId,
    name: data.name.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    role: data.role.trim(),
    salary: typeof data.salary === 'string' ? parseSalary(data.salary) : data.salary,
    joinDate: data.joinDate.trim(),
    qrUrl: qrDataUrl,
    profileImageUrl: data.profileImageUrl || '',
    password: data.password || generateStrongPassword(data.name.trim()),
    createdAt: serverTimestamp(),
  }).commit()

  return employeeId
}

export const updateEmployee = async (id: string, data: Partial<EmployeeRecord>) => {
  const docRef = doc(db, EMPLOYEE_COLLECTION, id)
  const updateData = { ...data }
  
  if (updateData.salary && typeof updateData.salary === 'string') {
    updateData.salary = parseSalary(updateData.salary)
  }
  
  await writeBatch(db).update(docRef, updateData).commit()
}
