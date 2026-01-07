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
import { Select } from '../../components/ui/Select'
import { PaperClipIcon, ChatBubbleLeftIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/solid'

type WorkOrder = {
  id: string
  number: string
  hullId: string
  productSku: string
  status: 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'HOLD' | 'COMPLETED' | 'CLOSED' | 'CANCELLED'
  qty: number
  currentStageIndex: number
  specSnapshot: any
  createdAt: string
  plannedStartDate?: string | null
  plannedFinishDate?: string | null
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
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
  currentWorkCenterId?: string | null
  currentWorkCenterName?: string | null
  currentDepartmentName?: string | null
  currentStage?: {
    id: string
    code: string
    name: string
    sequence: number
    workCenter: {
      id: string
      name: string
    } | null
    department: {
      id: string
      name: string
    } | null
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

export type SupervisorWorkOrder = WorkOrder

export type KanbanWorkCenter = {
  id: string
  name: string
  departmentId: string
  departmentName: string
  sequence: number
}

export type KanbanColumn = {
  key: string
  label: string
  workOrders: WorkOrder[]
  description?: string
}

export function buildDefaultPlannedWindow() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0, 0)

  if (start <= now) {
    start.setDate(start.getDate() + 1)
  }

  const finish = new Date(start)
  finish.setHours(16, 30, 0, 0)

  const formatForInput = (date: Date) => {
    const year = date.getFullYear().toString()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')

    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  return {
    plannedStartDate: formatForInput(start),
    plannedFinishDate: formatForInput(finish),
  }
}

export function buildKanbanColumns(
  workOrders: WorkOrder[],
  workCenters: KanbanWorkCenter[]
): KanbanColumn[] {
  const backlogStatuses: WorkOrder['status'][] = ['PLANNED', 'RELEASED', 'HOLD']
  const completedStatuses: WorkOrder['status'][] = ['COMPLETED']

  const backlogOrders = workOrders.filter((wo) => backlogStatuses.includes(wo.status))
  const completedOrders = workOrders.filter((wo) => completedStatuses.includes(wo.status))
  const inProgressOrders = workOrders.filter((wo) => wo.status === 'IN_PROGRESS')

  const workCenterBuckets = new Map<string, WorkOrder[]>()
  const knownWorkCenterIds = new Set(workCenters.map((center) => center.id))
  const unassigned: WorkOrder[] = []

  for (const wo of inProgressOrders) {
    if (wo.currentWorkCenterId) {
      if (!knownWorkCenterIds.has(wo.currentWorkCenterId)) {
        unassigned.push(wo)
        continue
      }
      if (!workCenterBuckets.has(wo.currentWorkCenterId)) {
        workCenterBuckets.set(wo.currentWorkCenterId, [])
      }
      workCenterBuckets.get(wo.currentWorkCenterId)!.push(wo)
    } else {
      unassigned.push(wo)
    }
  }

  const columns: KanbanColumn[] = [
    {
      key: 'backlog',
      label: 'Backlog',
      workOrders: backlogOrders,
      description: 'Planned, released, or on hold',
    },
    ...workCenters.map((center) => ({
      key: `work-center-${center.id}`,
      label: center.name,
      description: center.departmentName,
      workOrders: workCenterBuckets.get(center.id) ?? [],
    })),
  ]

  if (unassigned.length > 0) {
    columns.push({
      key: 'unassigned',
      label: 'Unassigned',
      description: 'In progress without a workstation',
      workOrders: unassigned,
    })
  }

  columns.push({
    key: 'completed',
    label: 'Completed',
    description: 'Finished work orders',
    workOrders: completedOrders,
  })

  return columns
}

export default function SupervisorView() {
  const [activeTab, setActiveTab] = useState<'board'>('board')
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')
  const [userDepartmentId, setUserDepartmentId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)
  const [editedWorkOrder, setEditedWorkOrder] = useState<any>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isEditingPlanningDetails, setIsEditingPlanningDetails] = useState(false)
  const [versionHistory, setVersionHistory] = useState<any[]>([])
  const router = useRouter()

  // Plan tab states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newWO, setNewWO] = useState(() => ({
    number: '',
    hullId: '',
    productSku: '',
    qty: 1,
    model: '',
    trim: '',
    features: '',
    priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL',
    ...buildDefaultPlannedWindow(),
  }))
  // Model/Trim selector states
  const [selectedModelId, setSelectedModelId] = useState('')
  const [selectedTrimId, setSelectedTrimId] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [generatedSku, setGeneratedSku] = useState('')
  // Detail drawer tab state
  const [activeDetailTab, setActiveDetailTab] = useState<
    'details' | 'timeline' | 'notes' | 'files' | 'versions'
  >('details')
  const [routingVersions, setRoutingVersions] = useState<RoutingVersion[]>([])
  const [selectedRoutingVersion, setSelectedRoutingVersion] = useState<RoutingVersion | null>(null)
  const [editableStages, setEditableStages] = useState<RoutingStage[]>([])
  const [workCenters, setWorkCenters] = useState<
    Array<{
      id: string
      name: string
      departmentId: string
      departmentName?: string
    }>
  >([])
  const [kanbanWorkCenters, setKanbanWorkCenters] = useState<KanbanWorkCenter[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [routingMode, setRoutingMode] = useState<'default' | 'create_new' | 'existing'>('default')
  const [availableRoutingVersions, setAvailableRoutingVersions] = useState<any[]>([])
  const [loadingRoutings, setLoadingRoutings] = useState(false)

  // Check authentication and user role
  useEffect(() => {
    fetch('/api/auth/me', {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((authData) => {
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
        loadBoardData({ trigger: 'initial' })
        loadWorkCenters()
      })
      .catch(() => router.push('/login'))
  }, [router])

  // Load work centers for planning
  const loadWorkCenters = async () => {
    try {
      const response = await fetch('/api/work-centers', {
        credentials: 'include',
      })
      const result = await response.json()

      if (result.success && result.workCenters) {
        setWorkCenters(
          result.workCenters.map((wc: any) => ({
            id: wc.id,
            name: wc.name,
            departmentId: wc.departmentId,
            departmentName: wc.department?.name,
          }))
        )
      }
    } catch (error) {
      console.error('Error loading work centers:', error)
      // Fallback to empty array if API fails
      setWorkCenters([])
    }
  }

  // Load board data
  const loadBoardData = useCallback(
    async (options?: { trigger?: 'initial' | 'poll' | 'manual' }) => {
      const trigger = options?.trigger ?? (isInitialLoad ? 'initial' : 'manual')

      if (trigger === 'poll') {
        setIsRefreshing(true)
      }

      if (trigger === 'initial' && isInitialLoad) {
        setLoading(true)
      }

      try {
        const response = await fetch('/api/supervisor/dashboard', {
          credentials: 'include',
        })
        const result = await response.json()

        if (result.success) {
          // Transform the WIP data to work orders
          const transformedOrders: WorkOrder[] = result.data.wipData.map((item: any) => {
            const stageWorkCenter = item.currentStage?.workCenter ?? null
            const stageDepartment = item.currentStage?.department ?? null

            return {
              id: item.id,
              number: item.number,
              hullId: item.hullId,
              productSku: item.productSku,
              status: item.status,
              qty: item.qty,
              currentStageIndex: 0,
              specSnapshot: {},
              createdAt: item.createdAt,
              plannedStartDate: item.plannedStartDate ?? null,
              plannedFinishDate: item.plannedFinishDate ?? null,
              priority: item.priority,
              currentWorkCenterId: stageWorkCenter?.id ?? null,
              currentWorkCenterName: stageWorkCenter?.name ?? null,
              currentDepartmentName: stageDepartment?.name ?? null,
              _count: item._count, // Pass through count data for badges
              currentStage: item.currentStage
                ? {
                    id: item.currentStage.id || '',
                    code: item.currentStage.code,
                    name: item.currentStage.name,
                    sequence: item.currentStage.sequence,
                    workCenter: stageWorkCenter,
                    department: stageDepartment,
                    standardSeconds: 0,
                  }
                : undefined,
            }
          })
          setWorkOrders(transformedOrders)
          setSummary(result.data.summary)
          if (Array.isArray(result.data.workCenters)) {
            setKanbanWorkCenters(result.data.workCenters)
          } else {
            setKanbanWorkCenters([])
          }
        } else {
          setError(result.error || 'Failed to load dashboard')
        }
      } catch (err) {
        setError('Network error loading dashboard')
      } finally {
        if (trigger === 'poll') {
          setIsRefreshing(false)
        }

        if (trigger === 'initial' && isInitialLoad) {
          setLoading(false)
        }

        if (isInitialLoad) {
          setIsInitialLoad(false)
        }
      }
    },
    [isInitialLoad]
  )

  // Poll for updates
  useEffect(() => {
    if (activeTab === 'board') {
      const interval = setInterval(() => loadBoardData({ trigger: 'poll' }), 10000) // Poll every 10 seconds
      return () => clearInterval(interval)
    }
  }, [activeTab, loadBoardData])

  // Load work order details
  const loadWorkOrderDetails = async (woId: string) => {
    try {
      const response = await fetch(`/api/work-orders/${woId}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        openDetailDrawer(data.workOrder)
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

    setLoading(true)
    try {
      const response = await fetch(`/api/work-orders/${woId}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage(data.message)
        await loadBoardData({ trigger: 'manual' })
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(data.error || 'Failed to hold work order')
      }
    } catch (err) {
      setError('Network error holding work order')
    } finally {
      setLoading(false)
    }
  }

  // Unhold work order
  const unholdWorkOrder = async (woId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/work-orders/${woId}/unhold`, {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage(data.message)
        await loadBoardData({ trigger: 'manual' })
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(data.error || 'Failed to unhold work order')
      }
    } catch (err) {
      setError('Network error unholding work order')
    } finally {
      setLoading(false)
    }
  }

  // Create work order
  // Load routing versions for selected product configuration
  const loadRoutingVersions = async (model: string, trim?: string) => {
    if (!model) return

    setLoadingRoutings(true)
    try {
      const params = new URLSearchParams({ model })
      if (trim) params.append('trim', trim)

      const response = await fetch(`/api/routing-versions?${params}`, {
        credentials: 'include',
      })
      const result = await response.json()

      if (result.success) {
        setAvailableRoutingVersions(result.routingVersions)
      }
    } catch (error) {
      console.error('Error loading routing versions:', error)
    }
    setLoadingRoutings(false)
  }

  // Create default routing with all 11 departments
  const createDefaultRouting = () => {
    if (workCenters.length === 0) {
      setError('Work centers not loaded yet. Please try again.')
      return
    }

    // Create complete routing with all 11 departments in correct order
    const departmentOrder = [
      'Kitting',
      'Lamination',
      'Hull Rigging',
      'Deck Rigging',
      'Capping',
      'Engine Hang',
      'Final Rigging',
      'Water Test',
      'QA',
      'Cleaning',
      'Shipping',
    ]

    // Validate that all departments have work centers
    const missingDepartments: string[] = []
    const defaultStages = departmentOrder
      .map((deptName, index) => {
        const workCenter = workCenters.find((wc) => wc.departmentName === deptName)
        if (!workCenter) {
          missingDepartments.push(deptName)
          return null
        }

        return {
          code: deptName.toUpperCase().replace(/\s+/g, '_'),
          name: deptName,
          sequence: index + 1,
          enabled: true,
          workCenterId: workCenter.id,
          standardStageSeconds: getDefaultTimeForDepartment(deptName),
        }
      })
      .filter(Boolean) as RoutingStage[]

    if (missingDepartments.length > 0) {
      setError(
        `Missing work centers for departments: ${missingDepartments.join(', ')}. Please ensure all departments have active work centers.`
      )
      return
    }

    setEditableStages(defaultStages)
    setSelectedRoutingVersion({
      id: 'default',
      model: newWO.model,
      trim: newWO.trim,
    } as any)
  }

  // Get default time allocation for each department
  const getDefaultTimeForDepartment = (deptName: string): number => {
    const timeMap: Record<string, number> = {
      Kitting: 7200, // 2 hours
      Lamination: 14400, // 4 hours
      'Hull Rigging': 10800, // 3 hours
      'Deck Rigging': 9000, // 2.5 hours
      Capping: 5400, // 1.5 hours
      'Engine Hang': 7200, // 2 hours
      'Final Rigging': 10800, // 3 hours
      'Water Test': 3600, // 1 hour
      QA: 5400, // 1.5 hours
      Cleaning: 3600, // 1 hour
      Shipping: 1800, // 0.5 hours
    }
    return timeMap[deptName] || 3600
  }

  // Handle routing mode changes
  const handleRoutingModeChange = (
    mode: 'default' | 'create_new' | 'existing',
    routingVersionId?: string
  ) => {
    setRoutingMode(mode)

    if (mode === 'default') {
      createDefaultRouting()
    } else if (mode === 'create_new') {
      setEditableStages([])
      setSelectedRoutingVersion(null)
    } else if (mode === 'existing' && routingVersionId) {
      const selectedVersion = availableRoutingVersions.find((rv) => rv.id === routingVersionId)
      if (selectedVersion) {
        setSelectedRoutingVersion(selectedVersion)
        setEditableStages(selectedVersion.stages || [])
      }
    }
  }

  // Save current routing as new version
  const saveCurrentRouting = async () => {
    if (!newWO.model || editableStages.length === 0) {
      setError('Please configure routing stages before saving')
      return
    }

    try {
      const response = await fetch('/api/routing-versions/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          model: newWO.model,
          trim: newWO.trim || undefined,
          features: newWO.features || undefined,
          stages: editableStages,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setMessage('Routing configuration saved successfully')
        await loadRoutingVersions(newWO.model, newWO.trim)
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(result.error || 'Failed to save routing configuration')
      }
    } catch (error) {
      setError('Network error saving routing configuration')
    }
  }

  // Load routing versions when model/trim changes
  useEffect(() => {
    if (newWO.model) {
      loadRoutingVersions(newWO.model, newWO.trim)
    }
  }, [newWO.model, newWO.trim])

  const createWorkOrder = async () => {
    if (!newWO.hullId || !newWO.model) {
      setError('Hull ID and Model are required')
      return
    }

    if (editableStages.length === 0) {
      setError('Please configure routing stages')
      return
    }

    setLoading(true)
    try {
      // First create/clone the routing version with edited stages
      const routingResponse = await fetch('/api/routing-versions/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          model: newWO.model,
          trim: newWO.trim || undefined,
          features: newWO.features || undefined,
          stages: editableStages,
        }),
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
          features: newWO.features || undefined,
          routingVersionId: routingData.routingVersion.id,
          priority: newWO.priority,
          plannedStartDate: newWO.plannedStartDate
            ? new Date(newWO.plannedStartDate).toISOString()
            : null,
          plannedFinishDate: newWO.plannedFinishDate
            ? new Date(newWO.plannedFinishDate).toISOString()
            : null,
        }),
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
          features: '',
          priority: 'NORMAL',
          ...buildDefaultPlannedWindow(),
        })
        setSelectedRoutingVersion(null)
        setEditableStages([])
        await loadBoardData({ trigger: 'manual' })
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(woData.error || 'Failed to create work order')
      }
    } catch (err) {
      setError('Network error creating work order')
    } finally {
      setLoading(false)
    }
  }

  // Release work order
  const releaseWorkOrder = async (woId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/work-orders/${woId}/release`, {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage(data.message)
        await loadBoardData({ trigger: 'manual' })
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(data.error || 'Failed to release work order')
      }
    } catch (err) {
      setError('Network error releasing work order')
    } finally {
      setLoading(false)
    }
  }

  const loadVersionHistory = async (woId: string) => {
    try {
      const response = await fetch(`/api/work-orders/${woId}/versions`, {
        credentials: 'include',
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setVersionHistory(data.versions || [])
      }
    } catch (err) {
      console.error('Error loading version history:', err)
    }
  }

  const openDetailDrawer = (wo: WorkOrder) => {
    setSelectedWorkOrder(wo)
    setEditedWorkOrder({
      priority: wo.priority || 'NORMAL',
      plannedStartDate: wo.plannedStartDate
        ? new Date(wo.plannedStartDate).toISOString().slice(0, 16)
        : '',
      plannedFinishDate: wo.plannedFinishDate
        ? new Date(wo.plannedFinishDate).toISOString().slice(0, 16)
        : '',
    })
    setHasUnsavedChanges(false)
    setIsEditingPlanningDetails(false)
    setIsDetailDrawerOpen(true)
    setActiveDetailTab('details')
    loadVersionHistory(wo.id)
  }

  const saveWorkOrderChanges = async () => {
    if (!selectedWorkOrder || !editedWorkOrder) return

    setLoading(true)
    try {
      const response = await fetch(`/api/work-orders/${selectedWorkOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          priority: editedWorkOrder.priority,
          plannedStartDate: editedWorkOrder.plannedStartDate
            ? new Date(editedWorkOrder.plannedStartDate).toISOString()
            : null,
          plannedFinishDate: editedWorkOrder.plannedFinishDate
            ? new Date(editedWorkOrder.plannedFinishDate).toISOString()
            : null,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage('Changes saved successfully')
        setHasUnsavedChanges(false)
        setIsEditingPlanningDetails(false)

        // Refresh the work order details to get the latest server state
        const refreshResponse = await fetch(`/api/work-orders/${selectedWorkOrder.id}`, {
          credentials: 'include',
        })

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setSelectedWorkOrder(refreshData.workOrder)
          setEditedWorkOrder({
            priority: refreshData.workOrder.priority || 'NORMAL',
            plannedStartDate: refreshData.workOrder.plannedStartDate
              ? new Date(refreshData.workOrder.plannedStartDate).toISOString().slice(0, 16)
              : '',
            plannedFinishDate: refreshData.workOrder.plannedFinishDate
              ? new Date(refreshData.workOrder.plannedFinishDate).toISOString().slice(0, 16)
              : '',
          })
        }

        await loadBoardData({ trigger: 'manual' })
        loadVersionHistory(selectedWorkOrder.id)
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(data.error || 'Failed to save changes')
      }
    } catch (err) {
      setError('Network error saving changes')
    } finally {
      setLoading(false)
    }
  }

  const discardWorkOrderChanges = () => {
    if (selectedWorkOrder) {
      setEditedWorkOrder({
        priority: selectedWorkOrder.priority || 'NORMAL',
        plannedStartDate: selectedWorkOrder.plannedStartDate
          ? new Date(selectedWorkOrder.plannedStartDate).toISOString().slice(0, 16)
          : '',
        plannedFinishDate: selectedWorkOrder.plannedFinishDate
          ? new Date(selectedWorkOrder.plannedFinishDate).toISOString().slice(0, 16)
          : '',
      })
      setHasUnsavedChanges(false)
      setIsEditingPlanningDetails(false)
    }
  }

  const cancelWorkOrder = async (woId: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/supervisor/cancel-wo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workOrderId: woId }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage('Work order cancelled successfully')
        setIsDetailDrawerOpen(false)
        setSelectedWorkOrder(null)
        setEditedWorkOrder(null)
        setHasUnsavedChanges(false)
        setIsEditingPlanningDetails(false)
        setActiveDetailTab('details')
        await loadBoardData({ trigger: 'manual' })
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(data.error || 'Failed to cancel work order')
      }
    } catch (err) {
      setError('Network error cancelling work order')
    } finally {
      setLoading(false)
    }
  }

  const uncancelWorkOrder = async (woId: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/supervisor/uncancel-wo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workOrderId: woId }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage('Work order restored to PLANNED status')
        await loadBoardData({ trigger: 'manual' })
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(data.error || 'Failed to restore work order')
      }
    } catch (err) {
      setError('Network error restoring work order')
    } finally {
      setLoading(false)
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
      case 'PLANNED':
        return {
          bg: 'var(--status-info-surface)',
          color: 'var(--status-info-foreground)',
        }
      case 'RELEASED':
        return {
          bg: 'var(--status-info-surface)',
          color: 'var(--status-info-foreground)',
        }
      case 'IN_PROGRESS':
        return {
          bg: 'var(--status-success-surface)',
          color: 'var(--status-success-foreground)',
        }
      case 'COMPLETED':
        return {
          bg: 'var(--status-maintenance-surface)',
          color: 'var(--status-maintenance-foreground)',
        }
      case 'HOLD':
        return {
          bg: 'var(--status-warning-surface)',
          color: 'var(--status-warning-foreground)',
        }
      default:
        return {
          bg: 'var(--status-neutral-surface)',
          color: 'var(--status-neutral-foreground)',
        }
    }
  }

  // Toggle section expansion
  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey)
      } else {
        newSet.add(sectionKey)
      }
      return newSet
    })
  }

  // Render Kanban view - Vertical Accordion Layout
  const renderKanbanView = () => {
    const columns = buildKanbanColumns(workOrders, kanbanWorkCenters)

    return (
      <div
        style={{
          backgroundColor: 'var(--surface-muted)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-card)',
          padding: '1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Active Work Orders</h2>
          <Button variant="success" size="sm" onClick={() => setIsCreateModalOpen(true)}>
            Create Work Order
          </Button>
        </div>

        <div
          role="list"
          aria-label="Active work orders grouped by stage"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {columns.map((column) => {
            const columnWOs = column.workOrders
            const isExpanded = expandedSections.has(column.key)
            const hasWorkOrders = columnWOs.length > 0

            return (
              <div
                key={column.key}
                role="listitem"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {/* Collapsible Header */}
                <button
                  onClick={() => toggleSection(column.key)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.875rem 1rem',
                    backgroundColor: hasWorkOrders ? 'var(--table-header-surface)' : 'var(--surface)',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {isExpanded ? (
                      <ChevronDownIcon style={{ width: '1.25rem', height: '1.25rem', color: 'var(--muted)', flexShrink: 0 }} />
                    ) : (
                      <ChevronRightIcon style={{ width: '1.25rem', height: '1.25rem', color: 'var(--muted)', flexShrink: 0 }} />
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--foreground)' }}>
                          {column.label}
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: hasWorkOrders ? 'var(--color-primary-600)' : 'var(--muted)',
                            color: 'white',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '999px',
                            minWidth: '1.5rem',
                            textAlign: 'center',
                          }}
                        >
                          {columnWOs.length}
                        </span>
                      </div>
                      {column.description && (
                        <p style={{ margin: '0.125rem 0 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                          {column.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>

                {/* Collapsible Content */}
                <div
                  style={{
                    maxHeight: isExpanded ? '2000px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease-in-out',
                  }}
                >
                  <div
                    style={{
                      padding: isExpanded ? '0.75rem 1rem 1rem' : '0 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    {columnWOs.length === 0 ? (
                      <div
                        style={{
                          fontSize: '0.875rem',
                          color: 'var(--muted)',
                          padding: '0.5rem 0',
                        }}
                      >
                        No work orders in this section
                      </div>
                    ) : (
                      columnWOs.map((wo) => {
                        const priorityColors: Record<string, { bg: string; text: string }> = {
                          LOW: {
                            bg: 'var(--status-success-surface)',
                            text: 'var(--status-success-foreground)',
                          },
                          NORMAL: {
                            bg: 'var(--status-info-surface)',
                            text: 'var(--status-info-foreground)',
                          },
                          HIGH: {
                            bg: 'var(--status-warning-surface)',
                            text: 'var(--status-warning-foreground)',
                          },
                          CRITICAL: {
                            bg: 'var(--status-danger-surface)',
                            text: 'var(--status-danger-foreground)',
                          },
                        }
                        const priorityColor =
                          priorityColors[wo.priority || 'NORMAL'] || priorityColors.NORMAL
                        const stageName = wo.currentStage?.name || 'Stage not assigned'
                        const workCenterLabel = wo.currentWorkCenterName || 'No work center'
                        const departmentLabel = wo.currentDepartmentName

                        return (
                          <div
                            key={wo.id}
                            style={{
                              padding: '0.875rem',
                              backgroundColor: 'var(--table-header-surface)',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem',
                            }}
                          >
                            {/* Header Row */}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '0.5rem',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: '600', fontSize: '1rem' }}>{wo.number}</span>
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    backgroundColor: priorityColor.bg,
                                    color: priorityColor.text,
                                    padding: '0.125rem 0.375rem',
                                    borderRadius: '3px',
                                    fontWeight: '600',
                                  }}
                                >
                                  {wo.priority || 'NORMAL'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                {wo._count && wo._count.attachments > 0 && (
                                  <span
                                    style={{
                                      fontSize: '0.75rem',
                                      backgroundColor: 'var(--status-info-surface)',
                                      color: 'var(--status-info-foreground)',
                                      padding: '0.125rem 0.375rem',
                                      borderRadius: '10px',
                                      fontWeight: '500',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                    }}
                                  >
                                    <PaperClipIcon style={{ height: '0.75rem', width: '0.75rem' }} />
                                    <span>{wo._count.attachments}</span>
                                  </span>
                                )}
                                {wo._count && wo._count.notes > 0 && (
                                  <span
                                    style={{
                                      fontSize: '0.75rem',
                                      backgroundColor: 'var(--status-success-surface)',
                                      color: 'var(--status-success-foreground)',
                                      padding: '0.125rem 0.375rem',
                                      borderRadius: '10px',
                                      fontWeight: '500',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                    }}
                                  >
                                    <ChatBubbleLeftIcon style={{ height: '0.75rem', width: '0.75rem' }} />
                                    <span>{wo._count.notes}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Details Row */}
                            <div
                              style={{
                                fontSize: '0.875rem',
                                color: 'var(--muted)',
                              }}
                            >
                              {wo.hullId} •{' '}
                              {wo.routingVersion
                                ? `${wo.routingVersion.model}${
                                    wo.routingVersion.trim ? `-${wo.routingVersion.trim}` : ''
                                  }`
                                : wo.productSku}
                            </div>

                            {/* Stage & Work Center */}
                            <div style={{ fontSize: '0.875rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <span><strong>Stage:</strong> {stageName}</span>
                              <span style={{ color: 'var(--muted)' }}>|</span>
                              <span><strong>Work Center:</strong> {workCenterLabel}{departmentLabel ? ` • ${departmentLabel}` : ''}</span>
                            </div>

                            {/* Dates */}
                            {(wo.plannedStartDate || wo.plannedFinishDate) && (
                              <div
                                style={{
                                  fontSize: '0.8rem',
                                  color: 'var(--muted)',
                                  display: 'flex',
                                  gap: '1rem',
                                }}
                              >
                                {wo.plannedStartDate && (
                                  <span>Start: {new Date(wo.plannedStartDate).toLocaleDateString()}</span>
                                )}
                                {wo.plannedFinishDate && (
                                  <span>Finish: {new Date(wo.plannedFinishDate).toLocaleDateString()}</span>
                                )}
                              </div>
                            )}

                            {/* Actions */}
                            <div
                              style={{
                                marginTop: '0.25rem',
                                display: 'flex',
                                gap: '0.5rem',
                                flexWrap: 'wrap',
                              }}
                            >
                              <Button size="sm" onClick={() => loadWorkOrderDetails(wo.id)}>
                                Open
                              </Button>
                              {wo.status === 'PLANNED' && (
                                <Button
                                  size="sm"
                                  variant="success"
                                  onClick={() => releaseWorkOrder(wo.id)}
                                >
                                  Release
                                </Button>
                              )}
                              {wo.status !== 'HOLD' && wo.status !== 'COMPLETED' && wo.status !== 'PLANNED' && (
                                <Button
                                  size="sm"
                                  variant="warning"
                                  onClick={() => holdWorkOrder(wo.id)}
                                >
                                  Hold
                                </Button>
                              )}
                              {wo.status === 'HOLD' && (
                                <Button
                                  size="sm"
                                  variant="success"
                                  onClick={() => unholdWorkOrder(wo.id)}
                                >
                                  Unhold
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (isInitialLoad) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--background)',
          color: 'var(--foreground)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        Loading...
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-sans)',
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: 'var(--surface)',
          padding: '1rem',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card)',
          transition: 'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>
              Supervisor Dashboard
            </h1>
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                color: 'var(--foreground)',
              }}
            >
              {userRole === 'ADMIN' && activeTab === 'board' && (
                <Select
                  value={selectedDepartment}
                  onChange={(event) => setSelectedDepartment(event.target.value)}
                  options={[
                    { value: '', label: 'All Departments' },
                    { value: 'dept1', label: 'Hull Rigging' },
                    { value: 'dept2', label: 'Electronics' },
                    { value: 'dept3', label: 'Final Assembly' },
                  ]}
                  fullWidth={false}
                  className="min-w-[12rem]"
                />
              )}
              {userRole === 'ADMIN' && (
                <a
                  href="/admin"
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'var(--color-primary-600)',
                    color: 'white',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                  }}
                >
                  Admin Panel
                </a>
              )}
              <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Role: {userRole}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
        {/* Messages */}
        {error && (
          <div
            style={{
              backgroundColor: 'var(--status-danger-surface)',
              color: 'var(--status-danger-foreground)',
              padding: '0.75rem',
              borderRadius: '4px',
              marginBottom: '1rem',
              border: '1px solid var(--status-danger-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--status-danger-foreground)',
                cursor: 'pointer',
                padding: '0.25rem',
                fontSize: '1.25rem',
                lineHeight: 1,
                opacity: 0.7,
              }}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {message && (
          <div
            style={{
              backgroundColor: 'var(--status-success-surface)',
              color: 'var(--status-success-foreground)',
              padding: '0.75rem',
              borderRadius: '4px',
              marginBottom: '1rem',
              border: '1px solid var(--status-success-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{message}</span>
            <button
              onClick={() => setMessage('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--status-success-foreground)',
                cursor: 'pointer',
                padding: '0.25rem',
                fontSize: '1.25rem',
                lineHeight: 1,
                opacity: 0.7,
              }}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {/* Board Tab */}
        {activeTab === 'board' && (
          <div>
            {/* KPIs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <StatsCard
                label="Released Work Orders"
                value={workOrders.filter((wo) => wo.status === 'RELEASED').length}
                variant="default"
              />
              <StatsCard
                label="In Progress"
                value={workOrders.filter((wo) => wo.status === 'IN_PROGRESS').length}
                variant="success"
                trend={
                  summary?.trends?.inProgress
                    ? {
                        value: Math.abs(summary.trends.inProgress.trend),
                        direction: summary.trends.inProgress.direction as 'up' | 'down',
                        label: `vs weekday avg`,
                      }
                    : undefined
                }
              />
              <StatsCard
                label="Completed This Week"
                value={workOrders.filter((wo) => wo.status === 'COMPLETED').length}
                variant="success"
                trend={
                  summary?.trends?.completed
                    ? {
                        value: Math.abs(summary.trends.completed.trend),
                        direction: summary.trends.completed.direction as 'up' | 'down',
                        label: `vs previous week`,
                      }
                    : undefined
                }
              />
              <StatsCard
                label="On Hold"
                value={workOrders.filter((wo) => wo.status === 'HOLD').length}
                variant="warning"
              />
            </div>

            {/* View Toggle */}
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
              <Button
                size="sm"
                variant={viewMode === 'table' ? 'primary' : 'secondary'}
                onClick={() => setViewMode('table')}
              >
                Table View
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'kanban' ? 'primary' : 'secondary'}
                onClick={() => setViewMode('kanban')}
              >
                Kanban View
              </Button>
            </div>

            {/* Work Orders Display */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
            ) : viewMode === 'kanban' ? (
              renderKanbanView()
            ) : (
              <div
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-card)',
                  padding: '1.25rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: '600',
                      }}
                    >
                      Active Work Orders
                    </h2>
                    {isRefreshing && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--muted)',
                          backgroundColor: 'var(--surface-muted, rgba(0,0,0,0.05))',
                          borderRadius: '999px',
                          padding: '0.25rem 0.5rem',
                        }}
                      >
                        Refreshing…
                      </span>
                    )}
                  </div>
                  <Button variant="success" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                    Create Work Order
                  </Button>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-card)',
                    overflowX: 'auto',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr
                        style={{
                          backgroundColor: 'var(--table-header-surface)',
                        }}
                      >
                        <th
                          style={{
                            padding: '0.75rem',
                            textAlign: 'left',
                            borderBottom: '2px solid var(--border)',
                          }}
                        >
                          Status
                        </th>
                        <th
                          style={{
                            padding: '0.75rem',
                            textAlign: 'left',
                            borderBottom: '2px solid var(--border)',
                          }}
                        >
                          WO Number
                        </th>
                        <th
                          style={{
                            padding: '0.75rem',
                            textAlign: 'left',
                            borderBottom: '2px solid var(--border)',
                          }}
                        >
                          Hull ID
                        </th>
                        <th
                          style={{
                            padding: '0.75rem',
                            textAlign: 'left',
                            borderBottom: '2px solid var(--border)',
                          }}
                        >
                          Model
                        </th>
                        <th
                          style={{
                            padding: '0.75rem',
                            textAlign: 'left',
                            borderBottom: '2px solid var(--border)',
                          }}
                        >
                          Priority
                        </th>
                        <th
                          style={{
                            padding: '0.75rem',
                            textAlign: 'left',
                            borderBottom: '2px solid var(--border)',
                          }}
                        >
                          Planned Start
                        </th>
                        <th
                          style={{
                            padding: '0.75rem',
                            textAlign: 'left',
                            borderBottom: '2px solid var(--border)',
                          }}
                        >
                          Planned Finish
                        </th>
                        <th
                          style={{
                            padding: '0.75rem',
                            textAlign: 'center',
                            borderBottom: '2px solid var(--border)',
                            width: '80px',
                          }}
                        >
                          Files
                        </th>
                        <th
                          style={{
                            padding: '0.75rem',
                            textAlign: 'center',
                            borderBottom: '2px solid var(--border)',
                            width: '80px',
                          }}
                        >
                          Notes
                        </th>
                        <th
                          style={{
                            padding: '0.75rem',
                            textAlign: 'left',
                            borderBottom: '2px solid var(--border)',
                          }}
                        >
                          Current Stage
                        </th>
                        <th
                          style={{
                            padding: '0.75rem',
                            textAlign: 'left',
                            borderBottom: '2px solid var(--border)',
                          }}
                        >
                          Work Center
                        </th>
                        <th
                          style={{
                            padding: '0.75rem',
                            textAlign: 'left',
                            borderBottom: '2px solid var(--border)',
                          }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {workOrders.map((wo) => {
                        const statusStyle = getStatusColor(wo.status)
                        const priorityColors: Record<string, { bg: string; text: string }> = {
                          LOW: {
                            bg: 'var(--status-success-surface)',
                            text: 'var(--status-success-foreground)',
                          },
                          NORMAL: {
                            bg: 'var(--status-info-surface)',
                            text: 'var(--status-info-foreground)',
                          },
                          HIGH: {
                            bg: 'var(--status-warning-surface)',
                            text: 'var(--status-warning-foreground)',
                          },
                          CRITICAL: {
                            bg: 'var(--status-danger-surface)',
                            text: 'var(--status-danger-foreground)',
                          },
                        }
                        const priorityColor = priorityColors[wo.priority || 'NORMAL']

                        return (
                          <tr key={wo.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.75rem' }}>
                              <span
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.875rem',
                                  fontWeight: '500',
                                  backgroundColor: statusStyle.bg,
                                  color: statusStyle.color,
                                }}
                              >
                                {wo.status}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem', fontWeight: '500' }}>{wo.number}</td>
                            <td style={{ padding: '0.75rem' }}>{wo.hullId}</td>
                            <td style={{ padding: '0.75rem' }}>
                              {wo.routingVersion
                                ? `${wo.routingVersion.model}${wo.routingVersion.trim ? `-${wo.routingVersion.trim}` : ''}`
                                : wo.productSku}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <span
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.875rem',
                                  backgroundColor: priorityColor.bg,
                                  color: priorityColor.text,
                                  fontWeight: '500',
                                }}
                              >
                                {wo.priority || 'NORMAL'}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: '0.75rem',
                                fontSize: '0.875rem',
                              }}
                            >
                              {wo.plannedStartDate
                                ? new Date(wo.plannedStartDate).toLocaleDateString()
                                : '-'}
                            </td>
                            <td
                              style={{
                                padding: '0.75rem',
                                fontSize: '0.875rem',
                              }}
                            >
                              {wo.plannedFinishDate
                                ? new Date(wo.plannedFinishDate).toLocaleDateString()
                                : '-'}
                            </td>
                            <td
                              style={{
                                padding: '0.75rem',
                                textAlign: 'center',
                              }}
                            >
                              {wo._count && wo._count.attachments > 0 ? (
                                <span
                                  style={{
                                    fontSize: '0.875rem',
                                    backgroundColor: 'var(--status-info-surface)',
                                    color: 'var(--status-info-foreground)',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '12px',
                                    fontWeight: '500',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    position: 'relative',
                                  }}
                                >
                                  <span
                                    style={{
                                      border: 0,
                                      clip: 'rect(0, 0, 0, 0)',
                                      height: '1px',
                                      margin: '-1px',
                                      overflow: 'hidden',
                                      padding: 0,
                                      position: 'absolute',
                                      width: '1px',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {`${wo._count.attachments} attachment${
                                      wo._count.attachments === 1 ? '' : 's'
                                    }`}
                                  </span>
                                  <PaperClipIcon
                                    aria-hidden="true"
                                    style={{ height: '0.75rem', width: '0.75rem' }}
                                  />
                                  <span aria-hidden="true">{wo._count.attachments}</span>
                                </span>
                              ) : (
                                <span
                                  style={{
                                    color: 'var(--muted)',
                                    fontSize: '0.875rem',
                                  }}
                                >
                                  -
                                </span>
                              )}
                            </td>
                            <td
                              style={{
                                padding: '0.75rem',
                                textAlign: 'center',
                              }}
                            >
                              {wo._count && wo._count.notes > 0 ? (
                                <span
                                  style={{
                                    fontSize: '0.875rem',
                                    backgroundColor: 'var(--status-success-surface)',
                                    color: 'var(--status-success-foreground)',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '12px',
                                    fontWeight: '500',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    position: 'relative',
                                  }}
                                >
                                  <span
                                    style={{
                                      border: 0,
                                      clip: 'rect(0, 0, 0, 0)',
                                      height: '1px',
                                      margin: '-1px',
                                      overflow: 'hidden',
                                      padding: 0,
                                      position: 'absolute',
                                      width: '1px',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {`${wo._count.notes} note${wo._count.notes === 1 ? '' : 's'}`}
                                  </span>
                                  <ChatBubbleLeftIcon
                                    aria-hidden="true"
                                    style={{ height: '0.75rem', width: '0.75rem' }}
                                  />
                                  <span aria-hidden="true">{wo._count.notes}</span>
                                </span>
                              ) : (
                                <span
                                  style={{
                                    color: 'var(--muted)',
                                    fontSize: '0.875rem',
                                  }}
                                >
                                  -
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              {wo.currentStage ? (
                                <div>
                                  <div>{wo.currentStage.name}</div>
                                  <div
                                    style={{
                                      fontSize: '0.875rem',
                                      color: 'var(--muted)',
                                    }}
                                  >
                                    {wo.currentStage.code}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--muted)' }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              {wo.currentStage?.workCenter?.name
                                ? `${wo.currentStage.workCenter.name}${
                                    wo.currentStage.department?.name
                                      ? ` (${wo.currentStage.department.name})`
                                      : ''
                                  }`
                                : '-'}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button
                                  onClick={() => loadWorkOrderDetails(wo.id)}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.875rem',
                                    backgroundColor: 'var(--color-primary-600)',
                                    color: 'var(--color-primary-foreground)',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
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
                                      backgroundColor: 'var(--color-success-600)',
                                      color: 'var(--color-primary-foreground)',
                                      border: 'none',
                                      borderRadius: '3px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Release
                                  </button>
                                )}
                                {wo.status !== 'HOLD' &&
                                  wo.status !== 'COMPLETED' &&
                                  wo.status !== 'PLANNED' && (
                                    <button
                                      onClick={() => holdWorkOrder(wo.id)}
                                      style={{
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.875rem',
                                        backgroundColor: 'var(--color-warning-500)',
                                        color: 'var(--foreground)',
                                        border: 'none',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
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
                                      backgroundColor: 'var(--color-success-600)',
                                      color: 'var(--color-primary-foreground)',
                                      border: 'none',
                                      borderRadius: '3px',
                                      cursor: 'pointer',
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
                    <div
                      style={{
                        padding: '3rem',
                        textAlign: 'center',
                        color: 'var(--muted)',
                      }}
                    >
                      No work orders found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Work Order Detail Drawer */}
      {isDetailDrawerOpen && selectedWorkOrder && (
        <div
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: '500px',
            backgroundColor: 'var(--surface)',
            boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
            zIndex: 1000,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              padding: '1.25rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
              Work Order Details
            </h2>
            <button
              onClick={() => {
                setIsDetailDrawerOpen(false)
                setSelectedWorkOrder(null)
                setEditedWorkOrder(null)
                setHasUnsavedChanges(false)
                setIsEditingPlanningDetails(false)
                setActiveDetailTab('details')
              }}
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.5rem',
                color: 'var(--muted)',
              }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: '1.25rem' }}>
            {/* Detail Tabs */}
            <div style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  borderBottom: '1px solid var(--border)',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={() => setActiveDetailTab('details')}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'transparent',
                    color:
                      activeDetailTab === 'details' ? 'var(--color-primary-600)' : 'var(--muted)',
                    border: 'none',
                    borderBottom: `2px solid ${activeDetailTab === 'details' ? 'var(--color-primary-600)' : 'transparent'}`,
                    cursor: 'pointer',
                    fontWeight: activeDetailTab === 'details' ? '600' : '400',
                  }}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveDetailTab('timeline')}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'transparent',
                    color:
                      activeDetailTab === 'timeline' ? 'var(--color-primary-600)' : 'var(--muted)',
                    border: 'none',
                    borderBottom: `2px solid ${activeDetailTab === 'timeline' ? 'var(--color-primary-600)' : 'transparent'}`,
                    cursor: 'pointer',
                    fontWeight: activeDetailTab === 'timeline' ? '600' : '400',
                  }}
                >
                  Timeline
                </button>
                <button
                  onClick={() => setActiveDetailTab('notes')}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'transparent',
                    color:
                      activeDetailTab === 'notes' ? 'var(--color-primary-600)' : 'var(--muted)',
                    border: 'none',
                    borderBottom: `2px solid ${activeDetailTab === 'notes' ? 'var(--color-primary-600)' : 'transparent'}`,
                    cursor: 'pointer',
                    fontWeight: activeDetailTab === 'notes' ? '600' : '400',
                  }}
                >
                  Notes
                </button>
                <button
                  onClick={() => setActiveDetailTab('files')}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'transparent',
                    color:
                      activeDetailTab === 'files' ? 'var(--color-primary-600)' : 'var(--muted)',
                    border: 'none',
                    borderBottom: `2px solid ${activeDetailTab === 'files' ? 'var(--color-primary-600)' : 'transparent'}`,
                    cursor: 'pointer',
                    fontWeight: activeDetailTab === 'files' ? '600' : '400',
                  }}
                >
                  Files
                </button>
                <button
                  onClick={() => setActiveDetailTab('versions')}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'transparent',
                    color:
                      activeDetailTab === 'versions' ? 'var(--color-primary-600)' : 'var(--muted)',
                    border: 'none',
                    borderBottom: `2px solid ${activeDetailTab === 'versions' ? 'var(--color-primary-600)' : 'transparent'}`,
                    cursor: 'pointer',
                    fontWeight: activeDetailTab === 'versions' ? '600' : '400',
                  }}
                >
                  Versions
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeDetailTab === 'details' && editedWorkOrder && (
              <div>
                {/* Read-only Info */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3
                    style={{
                      margin: '0 0 1rem 0',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                    }}
                  >
                    Basic Information
                  </h3>
                  <div
                    style={{
                      display: 'grid',
                      gap: '0.5rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div>
                      <strong>WO Number:</strong> {selectedWorkOrder.number}
                    </div>
                    <div>
                      <strong>Hull ID:</strong> {selectedWorkOrder.hullId}
                    </div>
                    <div>
                      <strong>SKU:</strong> {selectedWorkOrder.productSku}
                    </div>
                    <div>
                      <strong>Quantity:</strong> {selectedWorkOrder.qty}
                    </div>
                    <div>
                      <strong>Status:</strong>{' '}
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          ...getStatusColor(selectedWorkOrder.status),
                        }}
                      >
                        {selectedWorkOrder.status}
                      </span>
                    </div>
                    <div>
                      <strong>Created:</strong>{' '}
                      {new Date(selectedWorkOrder.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '1.1rem',
                        fontWeight: '600',
                      }}
                    >
                      Planning Details
                    </h3>
                    {selectedWorkOrder &&
                      (userRole === 'SUPERVISOR' || userRole === 'ADMIN') &&
                      !isEditingPlanningDetails &&
                      !['COMPLETED', 'CLOSED'].includes(selectedWorkOrder.status) && (
                        <button
                          onClick={() => {
                            discardWorkOrderChanges()
                            setIsEditingPlanningDetails(true)
                          }}
                          style={{
                            padding: '0.4rem 0.9rem',
                            backgroundColor: 'var(--table-header-surface)',
                            color: 'var(--foreground)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '500',
                          }}
                        >
                          Edit
                        </button>
                      )}
                  </div>

                  {isEditingPlanningDetails ? (
                    <>
                      <div style={{ display: 'grid', gap: '1rem' }}>
                        <div>
                          <label
                            style={{
                              display: 'block',
                              marginBottom: '0.25rem',
                              fontWeight: '500',
                            }}
                          >
                            Priority
                          </label>
                          <select
                            value={editedWorkOrder.priority}
                            onChange={(e) => {
                              setEditedWorkOrder({
                                ...editedWorkOrder,
                                priority: e.target.value,
                              })
                              setHasUnsavedChanges(true)
                            }}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid var(--border)',
                              borderRadius: '4px',
                            }}
                          >
                            <option value="LOW">Low</option>
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">High</option>
                            <option value="CRITICAL">Critical</option>
                          </select>
                        </div>

                        <div>
                          <label
                            style={{
                              display: 'block',
                              marginBottom: '0.25rem',
                              fontWeight: '500',
                            }}
                          >
                            Planned Start Date
                          </label>
                          <input
                            type="datetime-local"
                            value={editedWorkOrder.plannedStartDate}
                            onChange={(e) => {
                              setEditedWorkOrder({
                                ...editedWorkOrder,
                                plannedStartDate: e.target.value,
                              })
                              setHasUnsavedChanges(true)
                            }}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid var(--border)',
                              borderRadius: '4px',
                            }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              display: 'block',
                              marginBottom: '0.25rem',
                              fontWeight: '500',
                            }}
                          >
                            Planned Finish Date
                          </label>
                          <input
                            type="datetime-local"
                            value={editedWorkOrder.plannedFinishDate}
                            onChange={(e) => {
                              setEditedWorkOrder({
                                ...editedWorkOrder,
                                plannedFinishDate: e.target.value,
                              })
                              setHasUnsavedChanges(true)
                            }}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid var(--border)',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          gap: '0.75rem',
                          marginTop: '1rem',
                        }}
                      >
                        <button
                          onClick={saveWorkOrderChanges}
                          disabled={!hasUnsavedChanges}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: hasUnsavedChanges
                              ? 'var(--color-primary-600)'
                              : 'var(--muted)',
                            color: 'var(--color-primary-foreground)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: hasUnsavedChanges ? 'pointer' : 'not-allowed',
                            fontWeight: '500',
                            opacity: hasUnsavedChanges ? 1 : 0.7,
                          }}
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => {
                            discardWorkOrderChanges()
                            setIsEditingPlanningDetails(false)
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'var(--table-header-surface)',
                            color: 'var(--foreground)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '500',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      <div>
                        <strong>Priority:</strong> {selectedWorkOrder.priority || 'NORMAL'}
                      </div>
                      <div>
                        <strong>Planned Start:</strong>{' '}
                        {selectedWorkOrder.plannedStartDate
                          ? new Date(selectedWorkOrder.plannedStartDate).toLocaleString()
                          : 'Not set'}
                      </div>
                      <div>
                        <strong>Planned Finish:</strong>{' '}
                        {selectedWorkOrder.plannedFinishDate
                          ? new Date(selectedWorkOrder.plannedFinishDate).toLocaleString()
                          : 'Not set'}
                      </div>
                    </div>
                  )}
                </div>

                {selectedWorkOrder.status !== 'CANCELLED' && (
                  <div
                    style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            'Are you sure you want to cancel this work order? This action creates a version snapshot.'
                          )
                        ) {
                          cancelWorkOrder(selectedWorkOrder.id)
                        }
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--color-danger-600)',
                        color: 'var(--color-primary-foreground)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '500',
                      }}
                    >
                      Cancel Work Order
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeDetailTab === 'timeline' && (
              <div>
                {/* Stage Timeline */}
                {selectedWorkOrder.stageTimeline && selectedWorkOrder.stageTimeline.length > 0 ? (
                  <div>
                    <h3
                      style={{
                        margin: '0 0 1rem 0',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                      }}
                    >
                      Stage Timeline
                    </h3>
                    {selectedWorkOrder.stageTimeline.map((stage, index) => (
                      <div
                        key={stage.stageId}
                        style={{
                          padding: '0.75rem',
                          marginBottom: '0.5rem',
                          backgroundColor: 'var(--table-header-surface)',
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ fontWeight: '500', marginBottom: '0.5rem' }}>
                          {stage.stageName} ({stage.stageCode})
                        </div>
                        {stage.events.map((event: any) => (
                          <div
                            key={event.id}
                            style={{
                              padding: '0.5rem',
                              marginBottom: '0.25rem',
                              backgroundColor: 'var(--surface)',
                              borderRadius: '3px',
                              fontSize: '0.875rem',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <span style={{ fontWeight: '500' }}>{event.event}</span>
                              <span style={{ color: 'var(--muted)' }}>
                                {new Date(event.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div
                              style={{
                                color: 'var(--muted)',
                                marginTop: '0.25rem',
                              }}
                            >
                              Station: {event.station} • User: {event.user}
                            </div>
                            {event.event === 'COMPLETE' && (
                              <div style={{ marginTop: '0.25rem' }}>
                                Good: {event.goodQty} • Scrap: {event.scrapQty}
                              </div>
                            )}
                            {event.note && (
                              <div
                                style={{
                                  marginTop: '0.25rem',
                                  fontStyle: 'italic',
                                }}
                              >
                                Note: {event.note}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '2rem',
                      color: 'var(--muted)',
                    }}
                  >
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

            {activeDetailTab === 'versions' && (
              <div>
                <h3
                  style={{
                    margin: '0 0 1rem 0',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                  }}
                >
                  Version History
                </h3>
                {versionHistory.length > 0 ? (
                  <div>
                    {versionHistory.map((version: any) => (
                      <div
                        key={version.id}
                        style={{
                          padding: '1rem',
                          marginBottom: '0.75rem',
                          backgroundColor: 'var(--table-header-surface)',
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'start',
                            marginBottom: '0.5rem',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                              Version {version.versionNumber}
                            </div>
                            <div
                              style={{
                                fontSize: '0.875rem',
                                color: 'var(--muted)',
                                marginTop: '0.25rem',
                              }}
                            >
                              {new Date(version.createdAt).toLocaleString()}
                            </div>
                            <div
                              style={{
                                fontSize: '0.875rem',
                                color: 'var(--muted)',
                              }}
                            >
                              By: {version.createdBy}
                            </div>
                          </div>
                        </div>
                        {version.reason && (
                          <div
                            style={{
                              marginTop: '0.5rem',
                              fontStyle: 'italic',
                              color: 'var(--muted-strong)',
                            }}
                          >
                            Reason: {version.reason}
                          </div>
                        )}
                        <details style={{ marginTop: '0.75rem' }}>
                          <summary
                            style={{
                              cursor: 'pointer',
                              fontWeight: '500',
                              color: 'var(--color-primary-600)',
                            }}
                          >
                            View Snapshot
                          </summary>
                          <pre
                            style={{
                              marginTop: '0.5rem',
                              padding: '0.75rem',
                              backgroundColor: 'var(--surface)',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              overflow: 'auto',
                              maxHeight: '300px',
                            }}
                          >
                            {JSON.stringify(version.snapshot, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '2rem',
                      color: 'var(--muted)',
                    }}
                  >
                    No version history available.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Work Order Modal */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
              }}
            >
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
                    features: '',
                    priority: 'NORMAL',
                    ...buildDefaultPlannedWindow(),
                  })
                  setSelectedModelId('')
                  setSelectedTrimId('')
                  setSelectedYear(new Date().getFullYear())
                  setGeneratedSku('')
                  setSelectedRoutingVersion(null)
                  setEditableStages([])
                  setRoutingMode('default')
                  setAvailableRoutingVersions([])
                }}
                style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  color: 'var(--muted)',
                }}
              >
                ×
              </button>
            </div>

            {/* Work Order Fields */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.25rem',
                    fontWeight: '500',
                  }}
                >
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
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.25rem',
                    fontWeight: '500',
                  }}
                >
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
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.25rem',
                    fontWeight: '500',
                  }}
                >
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
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.25rem',
                    fontWeight: '500',
                  }}
                >
                  Priority
                </label>
                <select
                  value={newWO.priority}
                  onChange={(e) => setNewWO({ ...newWO, priority: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                  }}
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.25rem',
                    fontWeight: '500',
                  }}
                >
                  Planned Start Date
                </label>
                <input
                  type="datetime-local"
                  value={newWO.plannedStartDate}
                  onChange={(e) => setNewWO({ ...newWO, plannedStartDate: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.25rem',
                    fontWeight: '500',
                  }}
                >
                  Planned Finish Date
                </label>
                <input
                  type="datetime-local"
                  value={newWO.plannedFinishDate}
                  onChange={(e) => setNewWO({ ...newWO, plannedFinishDate: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>

            {/* Model/Trim Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3
                style={{
                  margin: '0 0 1rem 0',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                }}
              >
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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ gridColumn: '1 / -1' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.25rem',
                    fontWeight: '500',
                  }}
                >
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
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
            </div>

            {/* Routing Configuration */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3
                style={{
                  margin: '0 0 1rem 0',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                }}
              >
                Routing Configuration
              </h3>

              {/* Routing Configuration Dropdown */}
              <div style={{ marginBottom: '1rem' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.25rem',
                    fontWeight: '500',
                  }}
                >
                  Routing Configuration
                </label>
                <select
                  value={
                    routingMode === 'existing'
                      ? `existing_${selectedRoutingVersion?.id}`
                      : routingMode
                  }
                  onChange={(e) => {
                    const value = e.target.value
                    if (value.startsWith('existing_')) {
                      const routingVersionId = value.replace('existing_', '')
                      handleRoutingModeChange('existing', routingVersionId)
                    } else {
                      handleRoutingModeChange(value as 'default' | 'create_new')
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="default">Default Routing (All Departments)</option>
                  <option value="create_new">Create New Routing</option>
                  {availableRoutingVersions.map((rv) => (
                    <option key={rv.id} value={`existing_${rv.id}`}>
                      {rv.model}
                      {rv.trim ? `-${rv.trim}` : ''} v{rv.version} ({rv.status})
                    </option>
                  ))}
                </select>
                {loadingRoutings && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--muted)',
                      marginTop: '0.25rem',
                    }}
                  >
                    Loading routing configurations...
                  </div>
                )}
              </div>

              {/* Save Routing Button */}
              {editableStages.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <button
                    onClick={saveCurrentRouting}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: 'var(--color-success-600)',
                      color: 'var(--color-primary-foreground)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginRight: '0.5rem',
                    }}
                  >
                    Save New Routing
                  </button>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    Save current configuration for reuse
                  </span>
                </div>
              )}

              {editableStages.length > 0 && (
                <div
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '1rem',
                  }}
                >
                  <h4
                    style={{
                      margin: '0 0 1rem 0',
                      fontSize: '1rem',
                      fontWeight: '500',
                    }}
                  >
                    Configure Stages
                  </h4>
                  {editableStages.map((stage, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        backgroundColor: stage.enabled
                          ? 'var(--table-header-surface)'
                          : 'var(--status-warning-surface)',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={stage.enabled}
                          onChange={() => toggleStageEnabled(index)}
                        />
                        <strong>
                          {stage.sequence}. {stage.name} ({stage.code})
                        </strong>
                        <div
                          style={{
                            marginLeft: 'auto',
                            display: 'flex',
                            gap: '0.25rem',
                          }}
                        >
                          <button
                            onClick={() => moveStageUp(index)}
                            disabled={index === 0}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              backgroundColor:
                                index === 0 ? 'var(--muted)' : 'var(--color-primary-600)',
                              color: 'var(--color-primary-foreground)',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: index === 0 ? 'not-allowed' : 'pointer',
                              opacity: index === 0 ? 0.5 : 1,
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
                              backgroundColor:
                                index === editableStages.length - 1
                                  ? 'var(--muted)'
                                  : 'var(--color-primary-600)',
                              color: 'var(--color-primary-foreground)',
                              border: 'none',
                              borderRadius: '3px',
                              cursor:
                                index === editableStages.length - 1 ? 'not-allowed' : 'pointer',
                              opacity: index === editableStages.length - 1 ? 0.5 : 1,
                            }}
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '1rem',
                          alignItems: 'center',
                        }}
                      >
                        <label style={{ fontSize: '0.875rem' }}>
                          Standard Time (seconds):
                          <input
                            type="number"
                            value={stage.standardStageSeconds}
                            onChange={(e) =>
                              updateStageSeconds(index, parseInt(e.target.value) || 0)
                            }
                            min="0"
                            style={{
                              marginLeft: '0.5rem',
                              width: '100px',
                              padding: '0.25rem',
                              border: '1px solid var(--border)',
                              borderRadius: '3px',
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
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                justifyContent: 'flex-end',
              }}
            >
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
                    features: '',
                    priority: 'NORMAL',
                    ...buildDefaultPlannedWindow(),
                  })
                  setSelectedModelId('')
                  setSelectedTrimId('')
                  setSelectedYear(new Date().getFullYear())
                  setGeneratedSku('')
                  setSelectedRoutingVersion(null)
                  setEditableStages([])
                  setRoutingMode('default')
                  setAvailableRoutingVersions([])
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--muted)',
                  color: 'var(--color-primary-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={createWorkOrder}
                disabled={!newWO.hullId || !newWO.model || editableStages.length === 0}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor:
                    !newWO.hullId || !newWO.model || editableStages.length === 0
                      ? 'var(--muted)'
                      : 'var(--color-success-600)',
                  color: 'var(--color-primary-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor:
                    !newWO.hullId || !newWO.model || editableStages.length === 0
                      ? 'not-allowed'
                      : 'pointer',
                  opacity: !newWO.hullId || !newWO.model || editableStages.length === 0 ? 0.6 : 1,
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
