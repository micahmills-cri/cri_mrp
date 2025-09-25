'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Button } from '../../components/ui'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (data.ok) {
        router.push(data.redirectTo)
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const testAccounts = [
    { role: 'Operator', email: 'operator@cri.local', password: 'Operator123!' },
    { role: 'Supervisor', email: 'supervisor@cri.local', password: 'Supervisor123!' },
    { role: 'Admin', email: 'admin@cri.local', password: 'Admin123!' }
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Boat Factory Operations
          </h1>
          <p className="text-sm text-slate-600">
            Sign in to access your manufacturing dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="email"
            label="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@company.com"
            isRequired
            disabled={loading}
            variant={error ? 'error' : 'default'}
          />

          <Input
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            isRequired
            disabled={loading}
            variant={error ? 'error' : 'default'}
          />

          {error && (
            <div className="p-3 text-sm text-danger-800 bg-danger-50 border border-danger-200 rounded-md flex items-center">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            disabled={loading || !email.trim() || !password.trim()}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-8 p-4 bg-slate-50 rounded-md border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Demo Accounts
          </h3>
          <div className="space-y-2">
            {testAccounts.map((account, index) => (
              <div key={index} className="text-xs font-mono text-slate-600 p-2 bg-white rounded border">
                <div className="font-medium text-slate-800 mb-1">{account.role}</div>
                <div className="text-slate-600">{account.email}</div>
                <div className="text-slate-500">{account.password}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}