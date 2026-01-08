'use client'

export type SupervisorWorkOrder = {
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
  workOrders: SupervisorWorkOrder[]
  description?: string
}

export function buildKanbanColumns(
  workOrders: SupervisorWorkOrder[],
  workCenters: KanbanWorkCenter[]
): KanbanColumn[] {
  const backlogStatuses: SupervisorWorkOrder['status'][] = ['PLANNED', 'RELEASED', 'HOLD']
  const completedStatuses: SupervisorWorkOrder['status'][] = ['COMPLETED']

  const backlogOrders = workOrders.filter((wo) => backlogStatuses.includes(wo.status))
  const completedOrders = workOrders.filter((wo) => completedStatuses.includes(wo.status))
  const inProgressOrders = workOrders.filter((wo) => wo.status === 'IN_PROGRESS')

  const workCenterBuckets = new Map<string, SupervisorWorkOrder[]>()
  const knownWorkCenterIds = new Set(workCenters.map((center) => center.id))
  const unassigned: SupervisorWorkOrder[] = []

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
