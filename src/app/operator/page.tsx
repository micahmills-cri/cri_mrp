'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Button from '../../components/ui/Button'

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
  const [message, setMessage] = useState('')
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
    setMessage('')

    try {
      // This would need an API endpoint to get work order details
      setCurrentStage({
        name: 'Hull Rigging',
        sequence: 3,
        canStart: true
      })
      setMessage(`Found work order: ${workOrderInput}`)
    } catch (error) {
      setMessage('Work order not found')
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async () => {
    if (!selectedStation) {
      setMessage('Please select a station')
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
      setMessage(data.message || 'Started work')
    } catch (error) {
      setMessage('Error starting work')
    } finally {
      setLoading(false)
    }
  }

  const handlePause = async () => {
    if (!selectedStation) {
      setMessage('Please select a station')
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
      setMessage(data.message || 'Paused work')
    } catch (error) {
      setMessage('Error pausing work')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!selectedStation) {
      setMessage('Please select a station')
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
      setMessage(data.message || 'Completed work')
      
      if (data.isComplete) {
        setCurrentStage(null)
        setWorkOrderInput('')
      }
    } catch (error) {
      setMessage('Error completing work')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Operator Console</h1>
          <Button onClick={handleLogout} variant="secondary">
            Logout
          </Button>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Work Order Lookup</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Work Order Number or Hull ID
                </label>
                <input
                  type="text"
                  value={workOrderInput}
                  onChange={(e) => setWorkOrderInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter WO number or Hull ID"
                />
              </div>

              <Button onClick={handleWorkOrderLookup} disabled={loading}>
                Lookup
              </Button>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Station
                </label>
                <select
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Current Stage</h2>
            
            {currentStage ? (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded">
                  <h3 className="font-medium">{currentStage.name}</h3>
                  <p className="text-sm text-gray-600">Sequence: {currentStage.sequence}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Good Qty
                    </label>
                    <input
                      type="number"
                      value={quantities.good}
                      onChange={(e) => setQuantities(prev => ({
                        ...prev,
                        good: parseInt(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Scrap Qty
                    </label>
                    <input
                      type="number"
                      value={quantities.scrap}
                      onChange={(e) => setQuantities(prev => ({
                        ...prev,
                        scrap: parseInt(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Note (Optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button onClick={handleStart} disabled={loading}>
                    Start
                  </Button>
                  <Button onClick={handlePause} variant="secondary" disabled={loading}>
                    Pause
                  </Button>
                  <Button onClick={handleComplete} variant="primary" disabled={loading}>
                    Complete
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Enter a work order number to see current stage</p>
            )}
          </div>
        </div>

        {message && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}