'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export default function SupervisorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Check authentication
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(authData => {
        if (!authData.ok) {
          router.push('/login')
          return
        }
        if (authData.user.role === 'OPERATOR') {
          router.push('/operator')
          return
        }
        setLoading(false)
      })
      .catch(() => router.push('/login'))
  }, [router])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '1rem',
        borderBottom: '1px solid #dee2e6',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>
          Supervisor Dashboard
        </h1>
      </div>
      
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Supervisor page is being fixed. Please refresh in a moment.</p>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    </div>
  )
}