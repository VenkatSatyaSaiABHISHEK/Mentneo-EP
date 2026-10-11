import { 
  signInWithEmailAndPassword, 
  signOut, 
  EmailAuthProvider, 
  reauthenticateWithCredential 
} from 'firebase/auth'
import { auth } from './firebase'

export const signInAdmin = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password)
}

export const signOutUser = async () => signOut(auth)

export const verifyCurrentAdminPassword = async (password: string): Promise<boolean> => {
  if (!auth.currentUser || !auth.currentUser.email) {
    throw new Error('No admin user is currently logged in.')
  }
  const credential = EmailAuthProvider.credential(auth.currentUser.email, password)
  await reauthenticateWithCredential(auth.currentUser, credential)
  return true
}
