import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAdmin, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Loading...
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />
  }

  return children
}
