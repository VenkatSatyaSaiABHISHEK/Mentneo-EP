import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from './firebase'

export const signInAdmin = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password)
}

export const signOutUser = async () => signOut(auth)
