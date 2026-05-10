import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { signInAdmin } from '../services/authService'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await signInAdmin(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md animate-rise">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Admin access</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Only authorized accounts can access the admin portal.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              placeholder="admin@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              placeholder="Enter admin password"
              required
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
