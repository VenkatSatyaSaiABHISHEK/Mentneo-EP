import { collection, doc, getDocs, setDoc, deleteDoc, query } from 'firebase/firestore'
import { db } from './firebase'

export interface FinancialData {
  id: string;
  date: string; // YYYY-MM-DD format
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
    const q = query(collection(db, COLLECTION_NAME))
    const snapshot = await getDocs(q)
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialData))
    
    return docs.sort((a, b) => {
      const dateA = a.date || ''
      const dateB = b.date || ''
      return dateA.localeCompare(dateB) || (a.createdAt || 0) - (b.createdAt || 0)
    })
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
