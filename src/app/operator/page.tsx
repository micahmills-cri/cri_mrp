'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Alert from '../../components/ui/Alert'

interface Station {
  id: string
  code: string
  name: string
}

export default function OperatorPage() {
  const [workOrderInput, setWorkOrderInput] = useState('')
  const [selectedStation, setSelectedStation] = useState('')
  const [stations, setStations] = useState<Station[]>([])
  const [currentStage, setCurrentStage] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null)
  const [quantities, setQuantities] = useState({ good: 1, scrap: 0 })
  const [note, setNote] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Load stations for user's department - this would need an API endpoint
    // For now, using mock data
    setStations([
      { id: 'station1', code: 'RIG-1', name: 'Rigging Station 1' },
      { id: 'station2', code: 'RIG-2', name: 'Rigging Station 2' }
    ])
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleWorkOrderLookup = async () => {
    if (!workOrderInput.trim()) return

    setLoading(true)
    setMessage(null)

    try {
      // This would need an API endpoint to get work order details
      setCurrentStage({
        name: 'Hull Rigging',
        sequence: 3,
        canStart: true
      })
      setMessage({text: `Found work order: ${workOrderInput}`, type: 'success'})
    } catch (error) {
      setMessage({text: 'Work order not found', type: 'error'})
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async () => {
    if (!selectedStation) {
      setMessage({text: 'Please select a station', type: 'error'})
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/work-orders/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderNumber: workOrderInput,
          stationId: selectedStation,
          note: note
        })
      })

      const data = await response.json()
      setMessage({
        text: data.message || 'Work started successfully', 
        type: response.ok ? 'success' : 'error'
      })
    } catch (error) {
      setMessage({text: 'Error starting work', type: 'error'})
    } finally {
      setLoading(false)
    }
  }

  const handlePause = async () => {
    if (!selectedStation) {
      setMessage({text: 'Please select a station', type: 'error'})
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/work-orders/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderNumber: workOrderInput,
          stationId: selectedStation,
          note: note
        })
      })

      const data = await response.json()
      setMessage({
        text: data.message || 'Work paused successfully', 
        type: response.ok ? 'success' : 'error'
      })
    } catch (error) {
      setMessage({text: 'Error pausing work', type: 'error'})
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!selectedStation) {
      setMessage({text: 'Please select a station', type: 'error'})
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/work-orders/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderNumber: workOrderInput,
          stationId: selectedStation,
          goodQty: quantities.good,
          scrapQty: quantities.scrap,
          note: note
        })
      })

      const data = await response.json()
      setMessage({
        text: data.message || 'Work completed successfully', 
        type: response.ok ? 'success' : 'error'
      })
      
      if (data.isComplete) {
        setCurrentStage(null)
        setWorkOrderInput('')
      }
    } catch (error) {
      setMessage({text: 'Error completing work', type: 'error'})
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="bg-white shadow-sm">
        <div className="container py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Operator Console</h1>
          </div>
          <Button onClick={handleLogout} variant="secondary" size="sm">
            Logout
          </Button>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Work Order Lookup</h2>
            
            <div className="space-y-4">
              <div>
                <label className="form-label">
                  Work Order Number or Hull ID
                </label>
                <input
                  type="text"
                  value={workOrderInput}
                  onChange={(e) => setWorkOrderInput(e.target.value)}
                  className="form-input"
                  placeholder="Enter WO number or Hull ID"
                />
              </div>

              <Button onClick={handleWorkOrderLookup} disabled={loading} className="w-full">
                {loading ? "Looking up..." : "Lookup Work Order"}
              </Button>

              <div>
                <label className="form-label">
                  Station
                </label>
                <select
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                  className="form-input"
                >
                  <option value="">Select Station</option>
                  {stations.map(station => (
                    <option key={station.id} value={station.id}>
                      {station.code} - {station.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Current Stage</h2>
            
            {currentStage ? (
              <div className="space-y-4">
                <Alert variant="info">
                  <div>
                    <h3 className="font-medium">{currentStage.name}</h3>
                    <p className="text-sm opacity-80">Sequence: {currentStage.sequence}</p>
                  </div>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      Good Qty
                    </label>
                    <input
                      type="number"
                      value={quantities.good}
                      onChange={(e) => setQuantities(prev => ({
                        ...prev,
                        good: parseInt(e.target.value) || 0
                      }))}
                      className="form-input"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Scrap Qty
                    </label>
                    <input
                      type="number"
                      value={quantities.scrap}
                      onChange={(e) => setQuantities(prev => ({
                        ...prev,
                        scrap: parseInt(e.target.value) || 0
                      }))}
                      className="form-input"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    Note (Optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="form-input"
                    rows={3}
                    placeholder="Add any notes about the work performed..."
                  />
                </div>

                <div className="flex space-x-2">
                  <Button onClick={handleStart} disabled={loading} className="flex-1">
                    Start Work
                  </Button>
                  <Button onClick={handlePause} variant="secondary" disabled={loading} className="flex-1">
                    Pause
                  </Button>
                  <Button onClick={handleComplete} variant="primary" disabled={loading} className="flex-1">
                    Complete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>Enter a work order number above to see current stage</p>
              </div>
            )}
          </Card>
        </div>

        {message && (
          <div className="mt-6">
            <Alert variant={message.type}>
              {message.text}
            </Alert>
          </div>
        )}
      </div>
    </div>
  )
}