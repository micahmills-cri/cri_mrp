'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Station = {
  id: string
  code: string
  name: string
}

type QueueWorkOrder = {
  id: string
  number: string
  hullId: string
  productSku: string
  status: string
  qty: number
  currentStage: {
    id: string
    code: string
    name: string
    sequence: number
    workCenter: {
      id: string
      name: string
    }
    stations: Station[]
  }
  lastEvent: {
    event: string
    createdAt: string
    station: string
    user: string
  } | null
  currentStageIndex: number
  totalEnabledStages: number
  createdAt: string
}

type WorkOrderDetails = {
  workOrder: {
    id: string
    number: string
    hullId: string
    productSku: string
    status: string
    qty: number
    currentStageIndex: number
    specSnapshot: any
    currentStage: {
      id: string
      code: string
      name: string
      sequence: number
      enabled: boolean
      standardSeconds: number
      workCenter: {
        id: string
        name: string
        department: {
          id: string
          name: string
        }
        stations: Station[]
      }
      workInstruction: {
        id: string
        version: number
        contentMd: string
      } | null
    }
    lastEvent: {
      event: string
      createdAt: string
      station: string
      user: string
      note: string | null
      goodQty: number
      scrapQty: number
    } | null
    enabledStagesCount: number
  }
}

export default function OperatorConsole() {
  const [department, setDepartment] = useState<{ id: string; name: string } | null>(null)
  const [queue, setQueue] = useState<QueueWorkOrder[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderDetails | null>(null)
  const [selectedStation, setSelectedStation] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [goodQty, setGoodQty] = useState('')
  const [scrapQty, setScrapQty] = useState('')
  const [isActionPanelOpen, setIsActionPanelOpen] = useState(false)
  const router = useRouter()

  // Load station from localStorage
  useEffect(() => {
    const savedStation = localStorage.getItem('operator-selected-station')
    if (savedStation) {
      setSelectedStation(savedStation)
    }
  }, [])

  // Save station to localStorage when changed
  useEffect(() => {
    if (selectedStation) {
      localStorage.setItem('operator-selected-station', selectedStation)
    }
  }, [selectedStation])

  // Check authentication and fetch initial data
  useEffect(() => {
    fetch('/api/auth/me', { 
      credentials: 'include' 
    })
      .then(res => res.json())
      .then(data => {
        if (!data.ok) {
          router.push('/login')
        }
      })
      .catch(() => router.push('/login'))
  }, [router])

  // Fetch queue data
  const fetchQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/queues/my-department', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setQueue(data.queue || [])
        if (!department && data.department) {
          setDepartment(data.department)
        }
      } else if (response.status === 401) {
        router.push('/login')
      }
    } catch (err) {
      console.error('Error fetching queue:', err)
    }
  }, [router, department])

  // Poll queue every 5 seconds
  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 5000)
    return () => clearInterval(interval)
  }, [fetchQueue])

  // Search for work order
  const searchWorkOrder = async () => {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    setError('')
    setMessage('')
    
    try {
      const response = await fetch(`/api/work-orders/find?query=${encodeURIComponent(searchQuery.trim())}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedWorkOrder(data)
        setIsActionPanelOpen(true)
        // Set station if only one available
        if (data.workOrder.currentStage.workCenter.stations.length === 1) {
          setSelectedStation(data.workOrder.currentStage.workCenter.stations[0].id)
        }
      } else {
        const data = await response.json()
        setError(data.error || 'Work order not found')
        setSelectedWorkOrder(null)
      }
    } catch (err) {
      setError('Network error searching for work order')
      setSelectedWorkOrder(null)
    } finally {
      setLoading(false)
    }
  }

  // Open work order from queue
  const openWorkOrder = async (woId: string) => {
    setLoading(true)
    setError('')
    setMessage('')
    
    try {
      const wo = queue.find(q => q.id === woId)
      if (wo) {
        const response = await fetch(`/api/work-orders/find?query=${encodeURIComponent(wo.number)}`, {
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          setSelectedWorkOrder(data)
          setIsActionPanelOpen(true)
          // Set station if only one available
          if (data.workOrder.currentStage.workCenter.stations.length === 1) {
            setSelectedStation(data.workOrder.currentStage.workCenter.stations[0].id)
          }
        } else {
          const data = await response.json()
          setError(data.error || 'Failed to load work order details')
        }
      }
    } catch (err) {
      setError('Network error loading work order')
    } finally {
      setLoading(false)
    }
  }

  // Perform action (start, pause, complete)
  const performAction = async (action: 'start' | 'pause' | 'complete') => {
    if (!selectedWorkOrder || !selectedStation) {
      setError('Please select a station')
      return
    }

    if (action === 'complete' && !goodQty) {
      setError('Please enter good quantity')
      return
    }

    setActionLoading(true)
    setError('')
    setMessage('')

    try {
      let requestBody: any = {
        workOrderId: selectedWorkOrder.workOrder.id,
        stationId: selectedStation,
        note: note || undefined
      }

      if (action === 'complete') {
        requestBody.goodQty = parseInt(goodQty) || 0
        requestBody.scrapQty = parseInt(scrapQty) || 0
      }

      const response = await fetch(`/api/work-orders/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        setMessage(data.message)
        setNote('')
        setGoodQty('')
        setScrapQty('')
        
        // Refresh work order and queue
        await fetchQueue()
        
        // If completed, close panel and clear selection
        if (action === 'complete' && data.isComplete) {
          setTimeout(() => {
            setIsActionPanelOpen(false)
            setSelectedWorkOrder(null)
            setMessage('')
          }, 2000)
        } else {
          // Refresh work order details
          const refreshResponse = await fetch(
            `/api/work-orders/find?query=${encodeURIComponent(selectedWorkOrder.workOrder.number)}`,
            { credentials: 'include' }
          )
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            setSelectedWorkOrder(refreshData)
          }
        }
      } else {
        setError(data.error || `Failed to ${action}`)
      }
    } catch (err) {
      setError(`Network error during ${action}`)
    } finally {
      setActionLoading(false)
    }
  }

  const canStart = selectedWorkOrder && 
    selectedWorkOrder.workOrder.currentStage.enabled && 
    selectedWorkOrder.workOrder.status !== 'HOLD'
    
  const canPause = selectedWorkOrder && 
    selectedWorkOrder.workOrder.status === 'IN_PROGRESS'
    
  const canComplete = selectedWorkOrder && 
    selectedWorkOrder.workOrder.status === 'IN_PROGRESS'

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Top Bar */}
      <div style={{
        backgroundColor: 'white',
        padding: '1rem',
        borderBottom: '1px solid #dee2e6',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>
              Operator Console
            </h1>
            {department && (
              <div style={{ fontSize: '1.1rem', fontWeight: '500', color: '#495057' }}>
                Department: {department.name}
              </div>
            )}
          </div>
          
          {/* Search Bar */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Enter WO Number or Hull ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchWorkOrder()}
              style={{
                flex: 1,
                maxWidth: '400px',
                padding: '0.5rem 0.75rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
            <button
              onClick={searchWorkOrder}
              disabled={loading}
              style={{
                padding: '0.5rem 1.25rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                fontSize: '1rem'
              }}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
        {/* Messages */}
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

        {message && (
          <div style={{
            backgroundColor: '#d4edda',
            color: '#155724',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            border: '1px solid #c3e6cb'
          }}>
            {message}
          </div>
        )}

        {/* Queue Table */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1rem 1.25rem',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #dee2e6'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
              Work Order Queue
            </h2>
          </div>
          
          {queue.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>WO Number</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Hull ID</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>SKU</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Current Stage</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Work Center</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Progress</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Last Activity</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((wo) => (
                    <tr key={wo.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          backgroundColor: wo.status === 'IN_PROGRESS' ? '#e7f3ff' : '#f8f9fa',
                          color: wo.status === 'IN_PROGRESS' ? '#0056b3' : '#6c757d'
                        }}>
                          {wo.status === 'IN_PROGRESS' ? 'IN PROGRESS' : 'READY'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: '500' }}>{wo.number}</td>
                      <td style={{ padding: '0.75rem' }}>{wo.hullId}</td>
                      <td style={{ padding: '0.75rem' }}>{wo.productSku}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <div>{wo.currentStage.name}</div>
                        <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                          {wo.currentStage.code}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{wo.currentStage.workCenter.name}</td>
                      <td style={{ padding: '0.75rem' }}>
                        Stage {wo.currentStageIndex + 1} of {wo.totalEnabledStages}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {wo.lastEvent ? (
                          <div>
                            <div style={{ fontSize: '0.875rem' }}>{wo.lastEvent.event}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                              {new Date(wo.lastEvent.createdAt).toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#6c757d' }}>No activity</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <button
                          onClick={() => openWorkOrder(wo.id)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                          }}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              color: '#6c757d'
            }}>
              No work orders in queue
            </div>
          )}
        </div>

        {/* Action Panel */}
        {isActionPanelOpen && selectedWorkOrder && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1rem 1.25rem',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #dee2e6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                Work Order Action Panel
              </h2>
              <button
                onClick={() => {
                  setIsActionPanelOpen(false)
                  setSelectedWorkOrder(null)
                  setMessage('')
                  setError('')
                }}
                style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  color: '#6c757d'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '1.25rem' }}>
              {/* Work Order Info */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
                paddingBottom: '1.5rem',
                borderBottom: '1px solid #dee2e6'
              }}>
                <div>
                  <strong>WO Number:</strong> {selectedWorkOrder.workOrder.number}
                </div>
                <div>
                  <strong>Hull ID:</strong> {selectedWorkOrder.workOrder.hullId}
                </div>
                <div>
                  <strong>SKU:</strong> {selectedWorkOrder.workOrder.productSku}
                </div>
                <div>
                  <strong>Quantity:</strong> {selectedWorkOrder.workOrder.qty}
                </div>
                <div>
                  <strong>Status:</strong>{' '}
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: selectedWorkOrder.workOrder.status === 'IN_PROGRESS' ? '#e7f3ff' : 
                                   selectedWorkOrder.workOrder.status === 'HOLD' ? '#fff3cd' : '#f8f9fa',
                    color: selectedWorkOrder.workOrder.status === 'IN_PROGRESS' ? '#0056b3' : 
                           selectedWorkOrder.workOrder.status === 'HOLD' ? '#856404' : '#6c757d',
                    fontSize: '0.875rem'
                  }}>
                    {selectedWorkOrder.workOrder.status}
                  </span>
                </div>
              </div>

              {/* Current Stage Info */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
                  Current Stage: {selectedWorkOrder.workOrder.currentStage.name}
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}>
                  <div>
                    <strong>Stage Code:</strong> {selectedWorkOrder.workOrder.currentStage.code}
                  </div>
                  <div>
                    <strong>Sequence:</strong> {selectedWorkOrder.workOrder.currentStage.sequence}
                  </div>
                  <div>
                    <strong>Work Center:</strong> {selectedWorkOrder.workOrder.currentStage.workCenter.name}
                  </div>
                  <div>
                    <strong>Department:</strong> {selectedWorkOrder.workOrder.currentStage.workCenter.department.name}
                  </div>
                  <div>
                    <strong>Standard Time:</strong> {selectedWorkOrder.workOrder.currentStage.standardSeconds} seconds
                  </div>
                </div>
                
                {/* Last Event */}
                {selectedWorkOrder.workOrder.lastEvent && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px'
                  }}>
                    <strong>Last Activity:</strong> {selectedWorkOrder.workOrder.lastEvent.event} at station{' '}
                    {selectedWorkOrder.workOrder.lastEvent.station} on{' '}
                    {new Date(selectedWorkOrder.workOrder.lastEvent.createdAt).toLocaleString()}
                    {selectedWorkOrder.workOrder.lastEvent.note && (
                      <div style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                        Note: {selectedWorkOrder.workOrder.lastEvent.note}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Work Instruction Link */}
                {selectedWorkOrder.workOrder.currentStage.workInstruction && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#e7f3ff',
                    borderRadius: '4px'
                  }}>
                    <strong>Work Instruction Available</strong> (Version {selectedWorkOrder.workOrder.currentStage.workInstruction.version})
                  </div>
                )}
              </div>

              {/* Controls */}
              <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
                  Actions
                </h3>
                
                {/* Station Selection */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Station:
                  </label>
                  <select
                    value={selectedStation}
                    onChange={(e) => setSelectedStation(e.target.value)}
                    style={{
                      width: '100%',
                      maxWidth: '300px',
                      padding: '0.5rem',
                      border: '1px solid #ced4da',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="">Select a station...</option>
                    {selectedWorkOrder.workOrder.currentStage.workCenter.stations.map(station => (
                      <option key={station.id} value={station.id}>
                        {station.code} - {station.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantities for Complete action */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Good Qty:
                    </label>
                    <input
                      type="number"
                      value={goodQty}
                      onChange={(e) => setGoodQty(e.target.value)}
                      min="0"
                      style={{
                        width: '120px',
                        padding: '0.5rem',
                        border: '1px solid #ced4da',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Scrap Qty (optional):
                    </label>
                    <input
                      type="number"
                      value={scrapQty}
                      onChange={(e) => setScrapQty(e.target.value)}
                      min="0"
                      style={{
                        width: '120px',
                        padding: '0.5rem',
                        border: '1px solid #ced4da',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>

                {/* Note */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Note (optional):
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note..."
                    rows={3}
                    style={{
                      width: '100%',
                      maxWidth: '500px',
                      padding: '0.5rem',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => performAction('start')}
                    disabled={!canStart || actionLoading || !selectedStation}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: canStart && selectedStation ? '#28a745' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: canStart && selectedStation && !actionLoading ? 'pointer' : 'not-allowed',
                      opacity: canStart && selectedStation && !actionLoading ? 1 : 0.6
                    }}
                  >
                    {actionLoading ? 'Processing...' : 'Start'}
                  </button>
                  
                  <button
                    onClick={() => performAction('pause')}
                    disabled={!canPause || actionLoading || !selectedStation}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: canPause && selectedStation ? '#ffc107' : '#6c757d',
                      color: canPause && selectedStation ? '#212529' : 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: canPause && selectedStation && !actionLoading ? 'pointer' : 'not-allowed',
                      opacity: canPause && selectedStation && !actionLoading ? 1 : 0.6
                    }}
                  >
                    {actionLoading ? 'Processing...' : 'Pause'}
                  </button>
                  
                  <button
                    onClick={() => performAction('complete')}
                    disabled={!canComplete || actionLoading || !selectedStation || !goodQty}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: canComplete && selectedStation && goodQty ? '#007bff' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: canComplete && selectedStation && goodQty && !actionLoading ? 'pointer' : 'not-allowed',
                      opacity: canComplete && selectedStation && goodQty && !actionLoading ? 1 : 0.6
                    }}
                  >
                    {actionLoading ? 'Processing...' : 'Complete'}
                  </button>
                </div>
                
                {/* Status Messages */}
                {!selectedWorkOrder.workOrder.currentStage.enabled && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#fff3cd',
                    color: '#856404',
                    borderRadius: '4px',
                    border: '1px solid #ffeaa7'
                  }}>
                    This stage is not currently enabled
                  </div>
                )}
                
                {selectedWorkOrder.workOrder.status === 'HOLD' && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#fff3cd',
                    color: '#856404',
                    borderRadius: '4px',
                    border: '1px solid #ffeaa7'
                  }}>
                    Work order is on HOLD - actions are not available
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}