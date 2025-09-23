'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Button from '../../components/ui/Button'

interface WorkOrder {
  id: string
  number: string
  hullId: string
  productSku: string
  status: string
  currentStage: string
  lastEvent: string
  workCenter: string
}

interface Metrics {
  released: number
  inProgress: number
  completed: number
  averageStageTime: number
}

export default function SupervisorPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [metrics, setMetrics] = useState<Metrics>({
    released: 0,
    inProgress: 0,
    completed: 0,
    averageStageTime: 0
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Mock data - in real app would fetch from API
      setWorkOrders([
        {
          id: '1',
          number: 'WO-1001',
          hullId: 'HULL-TEST-001',
          productSku: 'LX24-BASE',
          status: 'IN_PROGRESS',
          currentStage: 'Hull Rigging (3/11)',
          lastEvent: 'Started 2h ago',
          workCenter: 'Hull Rigging'
        },
        {
          id: '2',
          number: 'WO-1002',
          hullId: 'HULL-TEST-002',
          productSku: 'LX24-SPORT',
          status: 'RELEASED',
          currentStage: 'Kitting (1/11)',
          lastEvent: 'Released today',
          workCenter: 'Kitting'
        }
      ])

      setMetrics({
        released: 5,
        inProgress: 3,
        completed: 12,
        averageStageTime: 4.5
      })
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RELEASED': return 'text-blue-600'
      case 'IN_PROGRESS': return 'text-green-600'
      case 'HOLD': return 'text-yellow-600'
      case 'COMPLETED': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Supervisor Dashboard</h1>
          <Button onClick={handleLogout} variant="secondary">
            Logout
          </Button>
        </div>
      </div>

      <div className="container py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-600">{metrics.released}</div>
            <div className="text-sm text-gray-600">Released Today</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600">{metrics.inProgress}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-gray-600">{metrics.completed}</div>
            <div className="text-sm text-gray-600">Completed Today</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-purple-600">{metrics.averageStageTime}h</div>
            <div className="text-sm text-gray-600">Avg Stage Time</div>
          </div>
        </div>

        {/* Work Orders Table */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Work in Progress</h2>
            <Button onClick={loadData} variant="secondary" size="sm">
              Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>WO Number</th>
                  <th>Hull ID</th>
                  <th>Product SKU</th>
                  <th>Status</th>
                  <th>Current Stage</th>
                  <th>Last Event</th>
                  <th>Work Center</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.map((wo) => (
                  <tr key={wo.id}>
                    <td className="font-medium">{wo.number}</td>
                    <td>{wo.hullId}</td>
                    <td>{wo.productSku}</td>
                    <td>
                      <span className={getStatusColor(wo.status)}>
                        {wo.status}
                      </span>
                    </td>
                    <td>{wo.currentStage}</td>
                    <td className="text-sm text-gray-600">{wo.lastEvent}</td>
                    <td>{wo.workCenter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {workOrders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No work orders found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}