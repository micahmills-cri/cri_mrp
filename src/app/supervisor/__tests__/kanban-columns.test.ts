import { describe, expect, it } from 'vitest'
import {
  buildKanbanColumns,
  type KanbanWorkCenter,
  type SupervisorWorkOrder,
} from '../kanban-utils'

describe('buildKanbanColumns', () => {
  it('groups in-progress work orders under their workstation column', () => {
    const workCenters: KanbanWorkCenter[] = [
      {
        id: 'wc-1',
        name: 'Cutting Center',
        departmentId: 'dept-1',
        departmentName: 'Cutting',
        sequence: 1,
      },
      {
        id: 'wc-2',
        name: 'Lamination',
        departmentId: 'dept-2',
        departmentName: 'Lamination',
        sequence: 2,
      },
    ]

    const baseWorkOrder: Omit<SupervisorWorkOrder, 'id' | 'number' | 'status'> = {
      hullId: 'HULL',
      productSku: 'SKU',
      qty: 1,
      currentStageIndex: 0,
      specSnapshot: {},
      createdAt: new Date('2025-02-01T00:00:00Z').toISOString(),
      plannedStartDate: null,
      plannedFinishDate: null,
      priority: 'NORMAL',
      _count: { notes: 0, attachments: 0 },
      currentWorkCenterId: null,
      currentWorkCenterName: null,
      currentDepartmentName: null,
      currentStage: undefined,
    }

    const workOrders: SupervisorWorkOrder[] = [
      {
        ...baseWorkOrder,
        id: 'wo-backlog',
        number: 'WO-BACKLOG',
        status: 'RELEASED',
      },
      {
        ...baseWorkOrder,
        id: 'wo-in-progress',
        number: 'WO-INPROG',
        status: 'IN_PROGRESS',
        currentWorkCenterId: 'wc-2',
        currentWorkCenterName: 'Lamination',
        currentDepartmentName: 'Lamination',
      },
      {
        ...baseWorkOrder,
        id: 'wo-unassigned',
        number: 'WO-UNASSIGNED',
        status: 'IN_PROGRESS',
      },
      {
        ...baseWorkOrder,
        id: 'wo-complete',
        number: 'WO-COMPLETE',
        status: 'COMPLETED',
      },
    ]

    const columns = buildKanbanColumns(workOrders, workCenters)

    const backlogColumn = columns.find((column) => column.key === 'backlog')
    expect(backlogColumn?.workOrders.map((wo) => wo.id)).toEqual(['wo-backlog'])

    const laminationColumn = columns.find((column) => column.key === 'work-center-wc-2')
    expect(laminationColumn?.workOrders.map((wo) => wo.id)).toEqual(['wo-in-progress'])

    const unassignedColumn = columns.find((column) => column.key === 'unassigned')
    expect(unassignedColumn?.workOrders.map((wo) => wo.id)).toEqual(['wo-unassigned'])

    const completedColumn = columns.at(-1)
    expect(completedColumn?.key).toBe('completed')
    expect(completedColumn?.workOrders.map((wo) => wo.id)).toEqual(['wo-complete'])
  })

  it('places in-progress work orders with unknown work centers into the unassigned column', () => {
    const workCenters: KanbanWorkCenter[] = [
      {
        id: 'wc-known',
        name: 'Known Station',
        departmentId: 'dept-1',
        departmentName: 'Department',
        sequence: 1,
      },
    ]

    const workOrders: SupervisorWorkOrder[] = [
      {
        hullId: 'HULL',
        productSku: 'SKU',
        qty: 1,
        currentStageIndex: 0,
        specSnapshot: {},
        createdAt: new Date('2025-02-01T00:00:00Z').toISOString(),
        plannedStartDate: null,
        plannedFinishDate: null,
        priority: 'NORMAL',
        _count: { notes: 0, attachments: 0 },
        currentWorkCenterId: 'wc-missing',
        currentWorkCenterName: 'Missing Station',
        currentDepartmentName: 'Missing Department',
        currentStage: undefined,
        id: 'wo-missing-station',
        number: 'WO-MISSING',
        status: 'IN_PROGRESS',
      },
    ]

    const columns = buildKanbanColumns(workOrders, workCenters)

    const unassignedColumn = columns.find((column) => column.key === 'unassigned')
    expect(unassignedColumn?.workOrders.map((wo) => wo.id)).toEqual(['wo-missing-station'])
  })
})
