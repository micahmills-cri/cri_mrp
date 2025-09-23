'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type WipItem = {
  id: string
  number: string
  hullId: string
  productSku: string
  status: string
  qty: number
  currentStage: {
    name: string
    code: string
    sequence: number
    workCenter: string
  } | null
  lastEvent: {
    event: string
    time: string
    user: string
    station: string
  } | null
  createdAt: string
}

type DashboardData = {
  wipData: WipItem[]
  summary: {
    statusCounts: {
      RELEASED: number
      IN_PROGRESS: number
      COMPLETED: number
      HOLD: number
    }
    avgStageTimes: Array<{
      workCenter: string
      avgTimeMinutes: number
    }>
  }
}

export default function SupervisorView() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<'table' | 'kanban'>('table')
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    fetch('/api/auth/me', { 
      credentials: 'include' 
    })
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
        // Load dashboard data
        loadDashboard()
      })
      .catch(() => router.push('/login'))
  }, [router])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/supervisor/dashboard', { 
        credentials: 'include' 
      })
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to load dashboard')
      }
    } catch (err) {
      setError('Network error loading dashboard')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RELEASED': return { bg: '#e3f2fd', color: '#1565c0' }
      case 'IN_PROGRESS': return { bg: '#e8f5e8', color: '#2e7d32' }
      case 'COMPLETED': return { bg: '#f3e5f5', color: '#7b1fa2' }
      case 'HOLD': return { bg: '#fff3e0', color: '#ef6c00' }
      default: return { bg: '#f5f5f5', color: '#424242' }
    }
  }

  const renderKanbanView = () => {
    if (!data) return null

    const columns = [
      { title: 'Released', status: 'RELEASED' },
      { title: 'In Progress', status: 'IN_PROGRESS' },
      { title: 'On Hold', status: 'HOLD' },
      { title: 'Completed', status: 'COMPLETED' }
    ]

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        {columns.map(column => (
          <div key={column.status} style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.1rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              {column.title}
              <span style={{
                backgroundColor: '#f0f0f0',
                padding: '0.25rem 0.5rem',
                borderRadius: '12px',
                fontSize: '0.75rem'
              }}>
                {data.wipData.filter(item => item.status === column.status).length}
              </span>
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.wipData
                .filter(item => item.status === column.status)
                .map(item => (
                  <div key={item.id} style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    padding: '0.75rem',
                    fontSize: '0.875rem'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                      {item.number}
                    </div>
                    <div style={{ color: '#666', marginBottom: '0.25rem' }}>
                      Hull: {item.hullId} | SKU: {item.productSku}
                    </div>
                    {item.currentStage && (
                      <div style={{ color: '#666', fontSize: '0.75rem' }}>
                        Stage: {item.currentStage.name} ({item.currentStage.workCenter})
                      </div>
                    )}
                    {item.lastEvent && (
                      <div style={{ color: '#888', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        Last: {item.lastEvent.event} at {item.lastEvent.station}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif'
      }}>
        Loading dashboard...
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      fontFamily: 'system-ui, sans-serif',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <h1 style={{ 
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#333'
          }}>
            Supervisor Dashboard
          </h1>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setView('table')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: view === 'table' ? '#007bff' : 'white',
                color: view === 'table' ? 'white' : '#007bff',
                border: '1px solid #007bff',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Table View
            </button>
            <button
              onClick={() => setView('kanban')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: view === 'kanban' ? '#007bff' : 'white',
                color: view === 'kanban' ? 'white' : '#007bff',
                border: '1px solid #007bff',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Kanban View
            </button>
            <button
              onClick={loadDashboard}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}

        {/* Summary Metrics */}
        {data && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* Status Counts */}
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
                Work Order Status (Today)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries(data.summary.statusCounts).map(([status, count]) => {
                  const colors = getStatusColor(status)
                  return (
                    <div key={status} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>{status.replace('_', ' ')}</span>
                      <span style={{
                        backgroundColor: colors.bg,
                        color: colors.color,
                        padding: '0.25rem 0.5rem',
                        borderRadius: '12px',
                        fontWeight: '600',
                        fontSize: '0.875rem'
                      }}>
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Average Stage Times */}
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
                Avg Stage Times (Minutes)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.summary.avgStageTimes.map(item => (
                  <div key={item.workCenter} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.875rem' }}>{item.workCenter}</span>
                    <span style={{
                      backgroundColor: '#e3f2fd',
                      color: '#1565c0',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '12px',
                      fontWeight: '600',
                      fontSize: '0.875rem'
                    }}>
                      {item.avgTimeMinutes}m
                    </span>
                  </div>
                ))}
                {data.summary.avgStageTimes.length === 0 && (
                  <span style={{ color: '#666', fontSize: '0.875rem' }}>
                    No completed stages yet
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Work in Progress */}
        {data && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e0e0e0'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                Work in Progress ({data.wipData.length})
              </h2>
            </div>

            <div style={{ padding: view === 'kanban' ? '1.5rem' : 0 }}>
              {view === 'kanban' ? renderKanbanView() : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>WO Number</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Hull ID</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>SKU</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Current Stage</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Work Center</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Last Event</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.wipData.map((item, index) => {
                        const colors = getStatusColor(item.status)
                        return (
                          <tr key={item.id} style={{
                            borderBottom: '1px solid #e0e0e0',
                            backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa'
                          }}>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600' }}>
                              {item.number}
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                              {item.hullId}
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                              {item.productSku}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{
                                backgroundColor: colors.bg,
                                color: colors.color,
                                padding: '0.25rem 0.5rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}>
                                {item.status}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                              {item.currentStage ? `${item.currentStage.name} (#${item.currentStage.sequence})` : 'N/A'}
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                              {item.currentStage?.workCenter || 'N/A'}
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#666' }}>
                              {item.lastEvent ? (
                                <>
                                  <div>{item.lastEvent.event} at {item.lastEvent.station}</div>
                                  <div>{formatDate(item.lastEvent.time)}</div>
                                </>
                              ) : 'No events'}
                            </td>
                          </tr>
                        )
                      })}
                      {data.wipData.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{
                            padding: '2rem',
                            textAlign: 'center',
                            color: '#666',
                            fontSize: '0.875rem'
                          }}>
                            No work orders in progress
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}