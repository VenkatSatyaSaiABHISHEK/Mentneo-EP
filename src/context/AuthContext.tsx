import { onAuthStateChanged, type User } from 'firebase/auth'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { auth, db } from '../services/firebase'
import { doc, getDoc } from 'firebase/firestore'

type AuthState = {
  user: User | null
  isAdmin: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthState>({
  user: null,
  isAdmin: false,
  isLoading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser)
      
      if (nextUser) {
        try {
          // Check if the user exists in the 'admins' collection
          const adminDoc = await getDoc(doc(db, 'admins', nextUser.uid))
          setIsAdmin(adminDoc.exists())
        } catch (error) {
          console.error("Error checking admin status:", error)
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
      }
      
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAdmin,
      isLoading,
    }),
    [user, isAdmin, isLoading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
