'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Station = {
  id: string
  code: string
  name: string
}

type WorkOrderDetails = {
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
    enabled: boolean
    workCenter: {
      id: string
      name: string
      department: string
    }
  }
  availableStations: Station[]
}

export default function OperatorConsole() {
  const [searchQuery, setSearchQuery] = useState('')
  const [workOrder, setWorkOrder] = useState<WorkOrderDetails | null>(null)
  const [selectedStation, setSelectedStation] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [goodQty, setGoodQty] = useState('')
  const [scrapQty, setScrapQty] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.ok) {
          router.push('/login')
        }
      })
      .catch(() => router.push('/login'))
  }, [router])

  const searchWorkOrder = async () => {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    setError('')
    setMessage('')
    
    try {
      const response = await fetch('/api/work-orders/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() })
      })

      const data = await response.json()
      
      if (data.success) {
        setWorkOrder(data.workOrder)
        setSelectedStation('')
      } else {
        setError(data.error || 'Work order not found')
        setWorkOrder(null)
      }
    } catch (err) {
      setError('Network error searching for work order')
      setWorkOrder(null)
    } finally {
      setLoading(false)
    }
  }

  const performAction = async (action: 'start' | 'pause' | 'complete') => {
    if (!workOrder || !selectedStation) {
      setError('Please select a station')
      return
    }

    if (action === 'complete' && !goodQty) {
      setError('Please enter good quantity')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      let requestBody: any = {
        workOrderNumber: workOrder.number,
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
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      
      if (data.success) {
        setMessage(data.message)
        setNote('')
        setGoodQty('')
        setScrapQty('')
        // Refresh work order details
        setTimeout(() => searchWorkOrder(), 1000)
      } else {
        setError(data.error || `Failed to ${action}`)
      }
    } catch (err) {
      setError(`Network error during ${action}`)
    } finally {
      setLoading(false)
    }
  }

  const canStart = workOrder && workOrder.currentStage.enabled && workOrder.status !== 'HOLD'
  const canPause = workOrder && workOrder.status === 'IN_PROGRESS'
  const canComplete = workOrder && workOrder.status === 'IN_PROGRESS'

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      fontFamily: 'system-ui, sans-serif',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <h1 style={{ 
            margin: '0 0 1rem 0',
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#333'
          }}>
            Operator Console
          </h1>
          
          {/* Search Section */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Enter WO Number or Hull ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchWorkOrder()}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
            <button
              onClick={searchWorkOrder}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

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

        {/* Work Order Details */}
        {workOrder && (
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '600' }}>
              Work Order Details
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <strong>WO Number:</strong> {workOrder.number}
              </div>
              <div>
                <strong>Hull ID:</strong> {workOrder.hullId}
              </div>
              <div>
                <strong>SKU:</strong> {workOrder.productSku}
              </div>
              <div>
                <strong>Status:</strong> <span style={{ 
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  backgroundColor: workOrder.status === 'IN_PROGRESS' ? '#e7f3ff' : '#f8f9fa',
                  color: workOrder.status === 'IN_PROGRESS' ? '#0056b3' : '#6c757d',
                  fontSize: '0.875rem'
                }}>
                  {workOrder.status}
                </span>
              </div>
              <div>
                <strong>Quantity:</strong> {workOrder.qty}
              </div>
            </div>

            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
              Current Stage: {workOrder.currentStage.name}
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <strong>Stage Code:</strong> {workOrder.currentStage.code}
              </div>
              <div>
                <strong>Sequence:</strong> {workOrder.currentStage.sequence}
              </div>
              <div>
                <strong>Work Center:</strong> {workOrder.currentStage.workCenter.name}
              </div>
              <div>
                <strong>Department:</strong> {workOrder.currentStage.workCenter.department}
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        {workOrder && (
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
              Station & Actions
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
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="">Select a station...</option>
                {workOrder.availableStations.map(station => (
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
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Scrap Qty:
                </label>
                <input
                  type="number"
                  value={scrapQty}
                  onChange={(e) => setScrapQty(e.target.value)}
                  min="0"
                  style={{
                    width: '120px',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
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
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => performAction('start')}
                disabled={!canStart || loading || !selectedStation}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: canStart && selectedStation ? '#28a745' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: canStart && selectedStation && !loading ? 'pointer' : 'not-allowed',
                  opacity: canStart && selectedStation && !loading ? 1 : 0.6
                }}
              >
                Start
              </button>
              
              <button
                onClick={() => performAction('pause')}
                disabled={!canPause || loading || !selectedStation}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: canPause && selectedStation ? '#ffc107' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: canPause && selectedStation && !loading ? 'pointer' : 'not-allowed',
                  opacity: canPause && selectedStation && !loading ? 1 : 0.6
                }}
              >
                Pause
              </button>
              
              <button
                onClick={() => performAction('complete')}
                disabled={!canComplete || loading || !selectedStation || !goodQty}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: canComplete && selectedStation && goodQty ? '#dc3545' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: canComplete && selectedStation && goodQty && !loading ? 'pointer' : 'not-allowed',
                  opacity: canComplete && selectedStation && goodQty && !loading ? 1 : 0.6
                }}
              >
                Complete
              </button>
            </div>
            
            {!workOrder.currentStage.enabled && (
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
          </div>
        )}
      </div>
    </div>
  )
}