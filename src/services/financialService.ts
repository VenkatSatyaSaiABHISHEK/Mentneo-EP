import { collection, doc, getDocs, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { db } from './firebase'

export interface FinancialData {
  id: string;
  month: string;
  year: number;
  revenue: number;
  payout: number; // Total payout across all deps
  deductions: number;
  otherExpenses: number;
  // Department-Wise Breakdown tracking
  departmentPayouts: {
    engineering: number;
    sales: number;
    marketing: number;
    hrAdmin: number;
    other: number;
  };
  createdAt: number;
}

const COLLECTION_NAME = 'financials'

export async function getFinancialData(): Promise<FinancialData[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('year', 'asc'), orderBy('createdAt', 'asc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialData))
  } catch (error) {
    console.error('Error fetching financial data:', error)
    return []
  }
}

export async function saveFinancialData(data: FinancialData): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, data.id)
    await setDoc(docRef, data)
  } catch (error) {
    console.error('Error saving financial data:', error)
    throw error
  }
}

export async function deleteFinancialData(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id))
  } catch (error) {
    console.error('Error deleting financial data:', error)
    throw error
  }
}
