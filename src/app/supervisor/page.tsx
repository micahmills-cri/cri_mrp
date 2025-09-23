'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Alert from '../../components/ui/Alert'

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <Card>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="bg-white shadow-sm">
        <div className="container py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Supervisor Dashboard</h1>
          </div>
          <Button onClick={handleLogout} variant="secondary" size="sm">
            Logout
          </Button>
        </div>
      </div>

      <div className="container py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">{metrics.released}</div>
            <div className="text-sm text-gray-600 font-medium">Released Today</div>
          </Card>
          <Card className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">{metrics.inProgress}</div>
            <div className="text-sm text-gray-600 font-medium">In Progress</div>
          </Card>
          <Card className="text-center">
            <div className="text-3xl font-bold text-gray-600 mb-1">{metrics.completed}</div>
            <div className="text-sm text-gray-600 font-medium">Completed Today</div>
          </Card>
          <Card className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">{metrics.averageStageTime}h</div>
            <div className="text-sm text-gray-600 font-medium">Avg Stage Time</div>
          </Card>
        </div>

        {/* Work Orders Table */}
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Work in Progress</h2>
            <Button onClick={loadData} variant="secondary" size="sm">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
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
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        wo.status === 'RELEASED' ? 'bg-blue-100 text-blue-800' :
                        wo.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-800' :
                        wo.status === 'HOLD' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
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
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg font-medium">No work orders found</p>
              <p className="text-sm">Work orders will appear here when they become available</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}