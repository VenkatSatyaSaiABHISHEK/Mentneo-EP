import { onAuthStateChanged, type User } from 'firebase/auth'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { auth, db } from '../services/firebase'
import { doc, getDoc } from 'firebase/firestore'

type AuthState = {
  user: User | null
  isAdmin: boolean
  isSuperAdmin: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthState>({
  user: null,
  isAdmin: false,
  isSuperAdmin: false,
  isLoading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser)
      
      if (nextUser) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', nextUser.uid))
          if (adminDoc.exists()) {
            setIsAdmin(true)
            const role = adminDoc.data()?.role
            setIsSuperAdmin(role === 'superadmin')
          } else if (nextUser.email === 'abhi31mahi@gmail.com') {
            // Automatically make the owner a superadmin
            try {
              const { setDoc } = await import('firebase/firestore')
              await setDoc(doc(db, 'admins', nextUser.uid), {
                email: nextUser.email,
                role: 'superadmin',
                createdAt: new Date().toISOString()
              })
              setIsAdmin(true)
              setIsSuperAdmin(true)
            } catch (e) {
              console.error("Failed to auto-create admin doc", e)
              setIsAdmin(true) // Still let them in for this session
              setIsSuperAdmin(true)
            }
          } else {
            setIsAdmin(false)
            setIsSuperAdmin(false)
          }
        } catch (error) {
          console.error("Error checking admin status:", error)
          setIsAdmin(false)
          setIsSuperAdmin(false)
        }
      } else {
        setIsAdmin(false)
        setIsSuperAdmin(false)
      }
      
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAdmin,
      isSuperAdmin,
      isLoading,
    }),
    [user, isAdmin, isSuperAdmin, isLoading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
