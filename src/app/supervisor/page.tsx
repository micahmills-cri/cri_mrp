'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import NotesTimeline from '../../components/NotesTimeline'
import FileManager from '../../components/FileManager'
import ModelTrimSelector from '../../components/ModelTrimSelector'
import { StatsCard, StatsGrid } from '../../components/ui/StatsCard'
import { DataCard, DataGrid } from '../../components/ui/DataCard'
import { StatusCard, StatusGrid } from '../../components/ui/StatusCard'
import { Button } from '../../components/ui/Button'

type WorkOrder = {
  id: string
  number: string
  hullId: string
  productSku: string
  status: 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'HOLD' | 'COMPLETED'
  qty: number
  currentStageIndex: number
  specSnapshot: any
  createdAt: string
  _count?: {
    notes: number
    attachments: number
  }
  routingVersion?: {
    id: string
    model: string
    trim: string | null
    version: number
    status: string
  }
  currentStage?: {
    id: string
    code: string
    name: string
    sequence: number
    workCenter: string
    department: string
    standardSeconds: number
  }
  enabledStages?: Array<{
    id: string
    code: string
    name: string
    sequence: number
    enabled: boolean
    workCenter: string
    department: string
  }>
  stageTimeline?: Array<{
    stageId: string
    stageName: string
    stageCode: string
    workCenter: string
    events: Array<{
      id: string
      event: string
      createdAt: string
      station: string
      stationCode: string
      user: string
      goodQty: number
      scrapQty: number
      note: string | null
    }>
  }>
  notes?: Array<{
    note: string
    event: string
    stage: string
    user: string
    createdAt: string
  }>
}

type RoutingStage = {
  id?: string
  code: string
  name: string
  sequence: number
  enabled: boolean
  workCenterId: string
  workCenterName?: string
  standardStageSeconds: number
}

type RoutingVersion = {
  id: string
  model: string
  trim: string | null
  version: number
  status: string
  stages: RoutingStage[]
}

export default function SupervisorView() {
  const [activeTab, setActiveTab] = useState<'board' | 'plan'>('board')
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')
  const [userDepartmentId, setUserDepartmentId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)
  const router = useRouter()

  // Plan tab states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newWO, setNewWO] = useState({
    number: '',
    hullId: '',
    productSku: '',
    qty: 1,
    model: '',
    trim: '',
    features: ''
  })
  // Model/Trim selector states
  const [selectedModelId, setSelectedModelId] = useState('')
  const [selectedTrimId, setSelectedTrimId] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [generatedSku, setGeneratedSku] = useState('')
  // Detail drawer tab state
  const [activeDetailTab, setActiveDetailTab] = useState<'timeline' | 'notes' | 'files'>('timeline')
  const [routingVersions, setRoutingVersions] = useState<RoutingVersion[]>([])
  const [selectedRoutingVersion, setSelectedRoutingVersion] = useState<RoutingVersion | null>(null)
  const [editableStages, setEditableStages] = useState<RoutingStage[]>([])
  const [workCenters, setWorkCenters] = useState<Array<{ id: string; name: string; departmentId: string }>>([])

  // Check authentication and user role
  useEffect(() => {
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
        setUserRole(authData.user.role)
        setUserDepartmentId(authData.user.departmentId || '')
        setSelectedDepartment(authData.user.departmentId || '')
        loadBoardData()
        loadWorkCenters()
      })
      .catch(() => router.push('/login'))
  }, [router])

  // Load work centers for planning
  const loadWorkCenters = async () => {
    try {
      const response = await fetch('/api/supervisor/dashboard', { 
        credentials: 'include' 
      })
      const result = await response.json()
      
      if (result.success && result.data) {
        // Extract unique work centers from the data
        const workCenterList: Array<{ id: string; name: string; departmentId: string }> = []
        // For now, we'll use mock work centers
        // In production, this would come from a dedicated API
        setWorkCenters([
          { id: 'wc1', name: 'Hull Assembly', departmentId: 'dept1' },
          { id: 'wc2', name: 'Deck Installation', departmentId: 'dept1' },
          { id: 'wc3', name: 'Electronics Bay', departmentId: 'dept2' },
          { id: 'wc4', name: 'Final Inspection', departmentId: 'dept3' }
        ])
      }
    } catch (err) {
      console.error('Error loading work centers:', err)
    }
  }

  // Load board data
  const loadBoardData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/supervisor/dashboard', { 
        credentials: 'include' 
      })
      const result = await response.json()
      
      if (result.success) {
        // Transform the WIP data to work orders
        const transformedOrders: WorkOrder[] = result.data.wipData.map((item: any) => ({
          id: item.id,
          number: item.number,
          hullId: item.hullId,
          productSku: item.productSku,
          status: item.status,
          qty: item.qty,
          currentStageIndex: 0,
          specSnapshot: {},
          createdAt: item.createdAt,
          _count: item._count, // Pass through count data for badges
          currentStage: item.currentStage ? {
            id: item.currentStage.id || '',
            code: item.currentStage.code,
            name: item.currentStage.name,
            sequence: item.currentStage.sequence,
            workCenter: item.currentStage.workCenter,
            department: '',
            standardSeconds: 0
          } : undefined
        }))
        setWorkOrders(transformedOrders)
        setSummary(result.data.summary)
      } else {
        setError(result.error || 'Failed to load dashboard')
      }
    } catch (err) {
      setError('Network error loading dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll for updates
  useEffect(() => {
    if (activeTab === 'board') {
      const interval = setInterval(loadBoardData, 10000) // Poll every 10 seconds
      return () => clearInterval(interval)
    }
  }, [activeTab, loadBoardData])

  // Load work order details
  const loadWorkOrderDetails = async (woId: string) => {
    try {
      const response = await fetch(`/api/work-orders/${woId}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setSelectedWorkOrder(data.workOrder)
        setIsDetailDrawerOpen(true)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to load work order details')
      }
    } catch (err) {
      setError('Network error loading work order details')
    }
  }

  // Hold work order
  const holdWorkOrder = async (woId: string) => {
    const reason = prompt('Please enter reason for hold:')
    if (!reason) return

    try {
      const response = await fetch(`/api/work-orders/${woId}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setMessage(data.message)
        await loadBoardData()
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(data.error || 'Failed to hold work order')
      }
    } catch (err) {
      setError('Network error holding work order')
    }
  }

  // Unhold work order
  const unholdWorkOrder = async (woId: string) => {
    try {
      const response = await fetch(`/api/work-orders/${woId}/unhold`, {
        method: 'POST',
        credentials: 'include'
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setMessage(data.message)
        await loadBoardData()
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(data.error || 'Failed to unhold work order')
      }
    } catch (err) {
      setError('Network error unholding work order')
    }
  }

  // Create work order
  const createWorkOrder = async () => {
    if (!newWO.hullId || !newWO.model) {
      setError('Hull ID and Model are required')
      return
    }

    if (!selectedRoutingVersion) {
      setError('Please select or create a routing version')
      return
    }

    try {
      // First create/clone the routing version with edited stages
      const routingResponse = await fetch('/api/routing-versions/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          model: newWO.model,
          trim: newWO.trim || undefined,
          features: newWO.features ? JSON.parse(newWO.features) : undefined,
          stages: editableStages
        })
      })

      const routingData = await routingResponse.json()
      
      if (!routingResponse.ok || !routingData.success) {
        setError(routingData.error || 'Failed to create routing version')
        return
      }

      // Then create the work order
      const woResponse = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          number: newWO.number || undefined,
          hullId: newWO.hullId,
          productSku: newWO.productSku || undefined,
          qty: newWO.qty,
          model: newWO.model,
          trim: newWO.trim || undefined,
          features: newWO.features ? JSON.parse(newWO.features) : undefined,
          routingVersionId: routingData.routingVersion.id
        })
      })

      const woData = await woResponse.json()
      
      if (woResponse.ok && woData.success) {
        setMessage(`Work order ${woData.workOrder.number} created successfully`)
        setIsCreateModalOpen(false)
        setNewWO({
          number: '',
          hullId: '',
          productSku: '',
          qty: 1,
          model: '',
          trim: '',
          features: ''
        })
        setSelectedRoutingVersion(null)
        setEditableStages([])
        await loadBoardData()
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(woData.error || 'Failed to create work order')
      }
    } catch (err) {
      setError('Network error creating work order')
    }
  }

  // Release work order
  const releaseWorkOrder = async (woId: string) => {
    try {
      const response = await fetch(`/api/work-orders/${woId}/release`, {
        method: 'POST',
        credentials: 'include'
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setMessage(data.message)
        await loadBoardData()
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(data.error || 'Failed to release work order')
      }
    } catch (err) {
      setError('Network error releasing work order')
    }
  }

  // Toggle stage enabled status
  const toggleStageEnabled = (index: number) => {
    const newStages = [...editableStages]
    newStages[index].enabled = !newStages[index].enabled
    setEditableStages(newStages)
  }

  // Move stage up
  const moveStageUp = (index: number) => {
    if (index === 0) return
    const newStages = [...editableStages]
    const temp = newStages[index - 1]
    newStages[index - 1] = newStages[index]
    newStages[index] = temp
    // Update sequences
    newStages.forEach((stage, i) => {
      stage.sequence = i + 1
    })
    setEditableStages(newStages)
  }

  // Move stage down
  const moveStageDown = (index: number) => {
    if (index === editableStages.length - 1) return
    const newStages = [...editableStages]
    const temp = newStages[index + 1]
    newStages[index + 1] = newStages[index]
    newStages[index] = temp
    // Update sequences
    newStages.forEach((stage, i) => {
      stage.sequence = i + 1
    })
    setEditableStages(newStages)
  }

  // Update stage seconds
  const updateStageSeconds = (index: number, seconds: number) => {
    const newStages = [...editableStages]
    newStages[index].standardStageSeconds = seconds
    setEditableStages(newStages)
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNED': return { bg: '#e1f5fe', color: '#01579b' }
      case 'RELEASED': return { bg: '#e3f2fd', color: '#1565c0' }
      case 'IN_PROGRESS': return { bg: '#e8f5e9', color: '#2e7d32' }
      case 'COMPLETED': return { bg: '#f3e5f5', color: '#7b1fa2' }
      case 'HOLD': return { bg: '#fff3e0', color: '#ef6c00' }
      default: return { bg: '#f5f5f5', color: '#424242' }
    }
  }

  // Render Kanban view
  const renderKanbanView = () => {
    const columns = [
      { title: 'Released', status: 'RELEASED' },
      { title: 'In Progress', status: 'IN_PROGRESS' },
      { title: 'Completed (Today)', status: 'COMPLETED' }
    ]

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {columns.map(column => {
          const columnWOs = workOrders.filter(wo => wo.status === column.status)
          
          return (
            <div key={column.status} style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '1rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              minHeight: '400px'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
                {column.title} ({columnWOs.length})
              </h3>
              
              {columnWOs.map(wo => (
                <div key={wo.id} style={{
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  border: '1px solid #dee2e6'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <div style={{ fontWeight: '500' }}>{wo.number}</div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {wo._count && wo._count.attachments > 0 && (
                        <span style={{ fontSize: '0.75rem', backgroundColor: '#e3f2fd', color: '#1976d2', padding: '0.125rem 0.25rem', borderRadius: '10px', fontWeight: '500' }}>
                          📎 {wo._count.attachments}
                        </span>
                      )}
                      {wo._count && wo._count.notes > 0 && (
                        <span style={{ fontSize: '0.75rem', backgroundColor: '#e8f5e8', color: '#2e7d32', padding: '0.125rem 0.25rem', borderRadius: '10px', fontWeight: '500' }}>
                          💬 {wo._count.notes}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                    {wo.hullId} • {wo.routingVersion ? `${wo.routingVersion.model}${wo.routingVersion.trim ? `-${wo.routingVersion.trim}` : ''}` : wo.productSku}
                  </div>
                  {wo.currentStage && (
                    <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      Stage: {wo.currentStage.name}
                    </div>
                  )}
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.25rem' }}>
                    <button
                      onClick={() => loadWorkOrderDetails(wo.id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      Open
                    </button>
                    {wo.status !== 'HOLD' && wo.status !== 'COMPLETED' && (
                      <button
                        onClick={() => holdWorkOrder(wo.id)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          backgroundColor: '#ffc107',
                          color: '#212529',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        Hold
                      </button>
                    )}
                    {wo.status === 'HOLD' && (
                      <button
                        onClick={() => unholdWorkOrder(wo.id)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        Unhold
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '1rem',
        borderBottom: '1px solid #dee2e6',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>
              Supervisor Dashboard
            </h1>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {userRole === 'ADMIN' && activeTab === 'board' && (
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '4px'
                  }}
                >
                  <option value="">All Departments</option>
                  <option value="dept1">Hull Rigging</option>
                  <option value="dept2">Electronics</option>
                  <option value="dept3">Final Assembly</option>
                </select>
              )}
              <span style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                Role: {userRole}
              </span>
            </div>
          </div>
          
          {/* Tabs */}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setActiveTab('board')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: activeTab === 'board' ? '#007bff' : 'transparent',
                color: activeTab === 'board' ? 'white' : '#007bff',
                border: `2px solid #007bff`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Board
            </button>
            <button
              onClick={() => setActiveTab('plan')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: activeTab === 'plan' ? '#007bff' : 'transparent',
                color: activeTab === 'plan' ? 'white' : '#007bff',
                border: `2px solid #007bff`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Plan
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

        {/* Board Tab */}
        {activeTab === 'board' && (
          <div>
            {/* KPIs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <StatsCard
                label="Released Work Orders"
                value={workOrders.filter(wo => wo.status === 'RELEASED').length}
                variant="default"
              />
              <StatsCard
                label="In Progress"
                value={workOrders.filter(wo => wo.status === 'IN_PROGRESS').length}
                variant="success"
                trend={summary?.trends?.inProgress ? {
                  value: Math.abs(summary.trends.inProgress.trend),
                  direction: summary.trends.inProgress.direction as "up" | "down",
                  label: `vs ${summary.trends.inProgress.weekdayAvg} weekday avg`
                } : undefined}
              />
              <StatsCard
                label="Completed This Week"
                value={workOrders.filter(wo => wo.status === 'COMPLETED').length}
                variant="success"
                trend={summary?.trends?.completed ? {
                  value: Math.abs(summary.trends.completed.trend),
                  direction: summary.trends.completed.direction as "up" | "down",
                  label: `vs ${summary.trends.completed.lastWeek} last week`
                } : undefined}
              />
              <StatsCard
                label="On Hold"
                value={workOrders.filter(wo => wo.status === 'HOLD').length}
                variant="warning"
              />
            </div>

            {/* View Toggle */}
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  padding: '0.375rem 0.75rem',
                  backgroundColor: viewMode === 'table' ? '#007bff' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Table View
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                style={{
                  padding: '0.375rem 0.75rem',
                  backgroundColor: viewMode === 'kanban' ? '#007bff' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Kanban View
              </button>
            </div>

            {/* Work Orders Display */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
            ) : viewMode === 'kanban' ? (
              renderKanbanView()
            ) : (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>WO Number</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Hull ID</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Model</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6', width: '80px' }}>Files</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6', width: '80px' }}>Notes</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Current Stage</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Work Center</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workOrders.map(wo => {
                      const statusStyle = getStatusColor(wo.status)
                      
                      return (
                        <tr key={wo.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              backgroundColor: statusStyle.bg,
                              color: statusStyle.color
                            }}>
                              {wo.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', fontWeight: '500' }}>{wo.number}</td>
                          <td style={{ padding: '0.75rem' }}>{wo.hullId}</td>
                          <td style={{ padding: '0.75rem' }}>
                            {wo.routingVersion ? `${wo.routingVersion.model}${wo.routingVersion.trim ? `-${wo.routingVersion.trim}` : ''}` : wo.productSku}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            {wo._count && wo._count.attachments > 0 ? (
                              <span style={{ 
                                fontSize: '0.875rem', 
                                backgroundColor: '#e3f2fd', 
                                color: '#1976d2', 
                                padding: '0.25rem 0.5rem', 
                                borderRadius: '12px', 
                                fontWeight: '500',
                                display: 'inline-block'
                              }}>
                                📎 {wo._count.attachments}
                              </span>
                            ) : (
                              <span style={{ color: '#6c757d', fontSize: '0.875rem' }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            {wo._count && wo._count.notes > 0 ? (
                              <span style={{ 
                                fontSize: '0.875rem', 
                                backgroundColor: '#e8f5e8', 
                                color: '#2e7d32', 
                                padding: '0.25rem 0.5rem', 
                                borderRadius: '12px', 
                                fontWeight: '500',
                                display: 'inline-block'
                              }}>
                                💬 {wo._count.notes}
                              </span>
                            ) : (
                              <span style={{ color: '#6c757d', fontSize: '0.875rem' }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            {wo.currentStage ? (
                              <div>
                                <div>{wo.currentStage.name}</div>
                                <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                                  {wo.currentStage.code}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#6c757d' }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            {wo.currentStage?.workCenter || '-'}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button
                                onClick={() => loadWorkOrderDetails(wo.id)}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.875rem',
                                  backgroundColor: '#007bff',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer'
                                }}
                              >
                                Open
                              </button>
                              {wo.status === 'PLANNED' && (
                                <button
                                  onClick={() => releaseWorkOrder(wo.id)}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.875rem',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Release
                                </button>
                              )}
                              {wo.status !== 'HOLD' && wo.status !== 'COMPLETED' && wo.status !== 'PLANNED' && (
                                <button
                                  onClick={() => holdWorkOrder(wo.id)}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.875rem',
                                    backgroundColor: '#ffc107',
                                    color: '#212529',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Hold
                                </button>
                              )}
                              {wo.status === 'HOLD' && (
                                <button
                                  onClick={() => unholdWorkOrder(wo.id)}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.875rem',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Unhold
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                
                {workOrders.length === 0 && (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#6c757d' }}>
                    No work orders found
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Plan Tab */}
        {activeTab === 'plan' && (
          <div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                  Work Order Planning
                </h2>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Create Work Order
                </button>
              </div>
              
              {/* List of planned work orders */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>WO Number</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Hull ID</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Model</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workOrders.filter(wo => wo.status === 'PLANNED').map(wo => (
                      <tr key={wo.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '0.75rem' }}>{wo.number}</td>
                        <td style={{ padding: '0.75rem' }}>{wo.hullId}</td>
                        <td style={{ padding: '0.75rem' }}>
                          {wo.routingVersion?.model || '-'}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            backgroundColor: '#e1f5fe',
                            color: '#01579b'
                          }}>
                            PLANNED
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <button
                            onClick={() => releaseWorkOrder(wo.id)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.875rem',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer'
                            }}
                          >
                            Release
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {workOrders.filter(wo => wo.status === 'PLANNED').length === 0 && (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
                    No planned work orders. Click "Create Work Order" to start planning.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Work Order Detail Drawer */}
      {isDetailDrawerOpen && selectedWorkOrder && (
        <div style={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          width: '500px',
          backgroundColor: 'white',
          boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
          zIndex: 1000,
          overflowY: 'auto'
        }}>
          <div style={{
            padding: '1.25rem',
            borderBottom: '1px solid #dee2e6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
              Work Order Details
            </h2>
            <button
              onClick={() => {
                setIsDetailDrawerOpen(false)
                setSelectedWorkOrder(null)
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
            {/* Basic Info */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
                Basic Information
              </h3>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <div><strong>WO Number:</strong> {selectedWorkOrder.number}</div>
                <div><strong>Hull ID:</strong> {selectedWorkOrder.hullId}</div>
                <div><strong>SKU:</strong> {selectedWorkOrder.productSku}</div>
                <div><strong>Quantity:</strong> {selectedWorkOrder.qty}</div>
                <div><strong>Status:</strong> {' '}
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    ...getStatusColor(selectedWorkOrder.status)
                  }}>
                    {selectedWorkOrder.status}
                  </span>
                </div>
                <div><strong>Created:</strong> {new Date(selectedWorkOrder.createdAt).toLocaleString()}</div>
              </div>
            </div>

            {/* Detail Tabs */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #dee2e6' }}>
                <button
                  onClick={() => setActiveDetailTab('timeline')}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'transparent',
                    color: activeDetailTab === 'timeline' ? '#007bff' : '#6c757d',
                    border: 'none',
                    borderBottom: `2px solid ${activeDetailTab === 'timeline' ? '#007bff' : 'transparent'}`,
                    cursor: 'pointer',
                    fontWeight: activeDetailTab === 'timeline' ? '600' : '400'
                  }}
                >
                  Timeline
                </button>
                <button
                  onClick={() => setActiveDetailTab('notes')}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'transparent',
                    color: activeDetailTab === 'notes' ? '#007bff' : '#6c757d',
                    border: 'none',
                    borderBottom: `2px solid ${activeDetailTab === 'notes' ? '#007bff' : 'transparent'}`,
                    cursor: 'pointer',
                    fontWeight: activeDetailTab === 'notes' ? '600' : '400'
                  }}
                >
                  Notes
                </button>
                <button
                  onClick={() => setActiveDetailTab('files')}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'transparent',
                    color: activeDetailTab === 'files' ? '#007bff' : '#6c757d',
                    border: 'none',
                    borderBottom: `2px solid ${activeDetailTab === 'files' ? '#007bff' : 'transparent'}`,
                    cursor: 'pointer',
                    fontWeight: activeDetailTab === 'files' ? '600' : '400'
                  }}
                >
                  Files
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeDetailTab === 'timeline' && (
              <div>
                {/* Stage Timeline */}
                {selectedWorkOrder.stageTimeline && selectedWorkOrder.stageTimeline.length > 0 ? (
                  <div>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
                      Stage Timeline
                    </h3>
                    {selectedWorkOrder.stageTimeline.map((stage, index) => (
                      <div key={stage.stageId} style={{
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px',
                        border: '1px solid #dee2e6'
                      }}>
                        <div style={{ fontWeight: '500', marginBottom: '0.5rem' }}>
                          {stage.stageName} ({stage.stageCode})
                        </div>
                        {stage.events.map((event: any) => (
                          <div key={event.id} style={{
                            padding: '0.5rem',
                            marginBottom: '0.25rem',
                            backgroundColor: 'white',
                            borderRadius: '3px',
                            fontSize: '0.875rem'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: '500' }}>{event.event}</span>
                              <span style={{ color: '#6c757d' }}>
                                {new Date(event.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div style={{ color: '#6c757d', marginTop: '0.25rem' }}>
                              Station: {event.station} • User: {event.user}
                            </div>
                            {event.event === 'COMPLETE' && (
                              <div style={{ marginTop: '0.25rem' }}>
                                Good: {event.goodQty} • Scrap: {event.scrapQty}
                              </div>
                            )}
                            {event.note && (
                              <div style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>
                                Note: {event.note}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
                    No timeline events yet.
                  </div>
                )}
              </div>
            )}

            {activeDetailTab === 'notes' && (
              <NotesTimeline
                workOrderId={selectedWorkOrder.id}
                onError={(error) => setError(error)}
                onSuccess={(message) => {
                  setMessage(message)
                  setTimeout(() => setMessage(''), 3000)
                }}
              />
            )}

            {activeDetailTab === 'files' && (
              <FileManager
                workOrderId={selectedWorkOrder.id}
                onError={(error) => setError(error)}
                onSuccess={(message) => {
                  setMessage(message)
                  setTimeout(() => setMessage(''), 3000)
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Create Work Order Modal */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                Create Work Order
              </h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false)
                  setNewWO({
                    number: '',
                    hullId: '',
                    productSku: '',
                    qty: 1,
                    model: '',
                    trim: '',
                    features: ''
                  })
                  setSelectedModelId('')
                  setSelectedTrimId('')
                  setSelectedYear(new Date().getFullYear())
                  setGeneratedSku('')
                  setSelectedRoutingVersion(null)
                  setEditableStages([])
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

            {/* Work Order Fields */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
                  WO Number (optional)
                </label>
                <input
                  type="text"
                  value={newWO.number}
                  onChange={(e) => setNewWO({ ...newWO, number: e.target.value })}
                  placeholder="Auto-generated if blank"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '4px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
                  Hull ID *
                </label>
                <input
                  type="text"
                  value={newWO.hullId}
                  onChange={(e) => setNewWO({ ...newWO, hullId: e.target.value })}
                  placeholder="e.g., HULL-2024-001"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '4px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
                  Quantity
                </label>
                <input
                  type="number"
                  value={newWO.qty}
                  onChange={(e) => setNewWO({ ...newWO, qty: parseInt(e.target.value) || 1 })}
                  min="1"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '4px'
                  }}
                />
              </div>
            </div>

            {/* Model/Trim Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
                Product Configuration
              </h3>
              <ModelTrimSelector
                selectedModelId={selectedModelId}
                selectedTrimId={selectedTrimId}
                year={selectedYear}
                onModelChange={(modelId, model) => {
                  setSelectedModelId(modelId)
                  setNewWO({ ...newWO, model: model?.name || '' })
                }}
                onTrimChange={(trimId, trim) => {
                  setSelectedTrimId(trimId)
                  setNewWO({ ...newWO, trim: trim?.name || '' })
                }}
                onYearChange={(year) => {
                  setSelectedYear(year)
                }}
                onSkuGenerated={(sku) => {
                  setGeneratedSku(sku)
                  setNewWO({ ...newWO, productSku: sku })
                }}
                onError={(error) => setError(error)}
              />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
                  Features (JSON)
                </label>
                <textarea
                  value={newWO.features}
                  onChange={(e) => setNewWO({ ...newWO, features: e.target.value })}
                  placeholder='{"color": "blue", "engine": "V8"}'
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
            </div>

            {/* Routing Configuration */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
                Routing Configuration
              </h3>
              
              <button
                onClick={() => {
                  // Create default stages
                  setEditableStages([
                    {
                      code: 'HULL-ASM',
                      name: 'Hull Assembly',
                      sequence: 1,
                      enabled: true,
                      workCenterId: workCenters[0]?.id || 'wc1',
                      standardStageSeconds: 3600
                    },
                    {
                      code: 'DECK-INST',
                      name: 'Deck Installation',
                      sequence: 2,
                      enabled: true,
                      workCenterId: workCenters[1]?.id || 'wc2',
                      standardStageSeconds: 2400
                    },
                    {
                      code: 'ELEC-INST',
                      name: 'Electronics Installation',
                      sequence: 3,
                      enabled: true,
                      workCenterId: workCenters[2]?.id || 'wc3',
                      standardStageSeconds: 1800
                    },
                    {
                      code: 'FINAL-INSP',
                      name: 'Final Inspection',
                      sequence: 4,
                      enabled: true,
                      workCenterId: workCenters[3]?.id || 'wc4',
                      standardStageSeconds: 1200
                    }
                  ])
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '1rem'
                }}
              >
                Create New Routing
              </button>

              {editableStages.length > 0 && (
                <div style={{
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  padding: '1rem'
                }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '500' }}>
                    Configure Stages
                  </h4>
                  {editableStages.map((stage, index) => (
                    <div key={index} style={{
                      padding: '0.75rem',
                      marginBottom: '0.5rem',
                      backgroundColor: stage.enabled ? '#f8f9fa' : '#fff3cd',
                      borderRadius: '4px',
                      border: '1px solid #dee2e6'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        marginBottom: '0.5rem'
                      }}>
                        <input
                          type="checkbox"
                          checked={stage.enabled}
                          onChange={() => toggleStageEnabled(index)}
                        />
                        <strong>
                          {stage.sequence}. {stage.name} ({stage.code})
                        </strong>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem' }}>
                          <button
                            onClick={() => moveStageUp(index)}
                            disabled={index === 0}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              backgroundColor: index === 0 ? '#6c757d' : '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: index === 0 ? 'not-allowed' : 'pointer',
                              opacity: index === 0 ? 0.5 : 1
                            }}
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveStageDown(index)}
                            disabled={index === editableStages.length - 1}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              backgroundColor: index === editableStages.length - 1 ? '#6c757d' : '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: index === editableStages.length - 1 ? 'not-allowed' : 'pointer',
                              opacity: index === editableStages.length - 1 ? 0.5 : 1
                            }}
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.875rem' }}>
                          Standard Time (seconds):
                          <input
                            type="number"
                            value={stage.standardStageSeconds}
                            onChange={(e) => updateStageSeconds(index, parseInt(e.target.value) || 0)}
                            min="0"
                            style={{
                              marginLeft: '0.5rem',
                              width: '100px',
                              padding: '0.25rem',
                              border: '1px solid #ced4da',
                              borderRadius: '3px'
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false)
                  setNewWO({
                    number: '',
                    hullId: '',
                    productSku: '',
                    qty: 1,
                    model: '',
                    trim: '',
                    features: ''
                  })
                  setSelectedModelId('')
                  setSelectedTrimId('')
                  setSelectedYear(new Date().getFullYear())
                  setGeneratedSku('')
                  setSelectedRoutingVersion(null)
                  setEditableStages([])
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={createWorkOrder}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Create Work Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}