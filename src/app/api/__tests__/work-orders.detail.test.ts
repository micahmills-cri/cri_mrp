import { NextRequest } from 'next/server'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { Role, WOStatus, WOEvent } from '@prisma/client'

const {
  getUserFromRequestMock,
  workOrderFindUniqueMock,
} = vi.hoisted(() => ({
  getUserFromRequestMock: vi.fn(),
  workOrderFindUniqueMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getUserFromRequest: getUserFromRequestMock,
}))

vi.mock('@/server/db/client', () => ({
  prisma: {
    workOrder: {
      findUnique: workOrderFindUniqueMock,
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Import after mocks
import { GET } from '../work-orders/[id]/route'

function buildRequest() {
  return new NextRequest('https://example.com/api/work-orders/wo-1', {
    method: 'GET',
  })
}

describe('GET /api/work-orders/[id]', () => {
  const mockWorkOrder = {
    id: 'wo-1',
    number: 'WO-2025-001',
    hullId: 'HULL-12345',
    productSku: 'LX24-BASE',
    qty: 1,
    status: WOStatus.IN_PROGRESS,
    priority: 'NORMAL',
    plannedStartDate: new Date('2025-01-15'),
    plannedFinishDate: new Date('2025-01-20'),
    currentStageIndex: 1,
    specSnapshot: {
      model: 'LX24',
      trim: 'Base',
      features: {},
    },
    createdAt: new Date('2025-01-10'),
    routingVersion: {
      id: 'routing-1',
      model: 'LX24',
      trim: 'Base',
      version: 1,
      status: 'RELEASED',
      stages: [
        {
          id: 'stage-1',
          code: 'KITTING',
          name: 'Kitting',
          sequence: 1,
          enabled: true,
          workCenterId: 'wc-1',
          standardStageSeconds: 3600,
          workCenter: {
            id: 'wc-1',
            name: 'Kitting Center',
            department: {
              id: 'dept-1',
              name: 'Assembly',
            },
            stations: [
              {
                id: 'station-1',
                code: 'KIT-1',
                name: 'Kitting Station 1',
                isActive: true,
              },
            ],
          },
          workInstructionVersions: [],
        },
        {
          id: 'stage-2',
          code: 'LAMINATION',
          name: 'Lamination',
          sequence: 2,
          enabled: true,
          workCenterId: 'wc-2',
          standardStageSeconds: 7200,
          workCenter: {
            id: 'wc-2',
            name: 'Lamination Center',
            department: {
              id: 'dept-2',
              name: 'Production',
            },
            stations: [],
          },
          workInstructionVersions: [],
        },
      ],
    },
    woStageLogs: [
      {
        id: 'log-1',
        event: WOEvent.START,
        createdAt: new Date('2025-01-15T08:00:00Z'),
        goodQty: null,
        scrapQty: null,
        note: 'Starting kitting',
        routingStage: {
          id: 'stage-1',
          name: 'Kitting',
          code: 'KITTING',
          workCenter: {
            name: 'Kitting Center',
          },
        },
        station: {
          name: 'Kitting Station 1',
          code: 'KIT-1',
        },
        user: {
          id: 'user-1',
          email: 'operator@example.com',
          role: Role.OPERATOR,
        },
      },
    ],
  }

  beforeEach(() => {
    getUserFromRequestMock.mockReset()
    workOrderFindUniqueMock.mockReset()
  })

  it('returns 200 and work order details for supervisor', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)

    const response = await GET(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.workOrder).toBeDefined()
    expect(payload.workOrder.id).toBe('wo-1')
    expect(payload.workOrder.number).toBe('WO-2025-001')
    expect(payload.workOrder.status).toBe(WOStatus.IN_PROGRESS)
    expect(payload.workOrder.currentStage).toBeDefined()
    expect(payload.workOrder.currentStage.code).toBe('LAMINATION')
  })

  it('returns 200 and work order details for admin', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'admin-1',
      role: Role.ADMIN,
      departmentId: null,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)

    const response = await GET(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.workOrder.id).toBe('wo-1')
  })

  it('returns work order with routing version details', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)

    const response = await GET(buildRequest(), { params: { id: 'wo-1' } })

    const payload = await response.json()

    expect(payload.workOrder.routingVersion).toBeDefined()
    expect(payload.workOrder.routingVersion.model).toBe('LX24')
    expect(payload.workOrder.routingVersion.trim).toBe('Base')
    expect(payload.workOrder.routingVersion.version).toBe(1)
  })

  it('returns current stage information', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)

    const response = await GET(buildRequest(), { params: { id: 'wo-1' } })

    const payload = await response.json()

    expect(payload.workOrder.currentStage).toEqual({
      id: 'stage-2',
      code: 'LAMINATION',
      name: 'Lamination',
      sequence: 2,
      workCenter: 'Lamination Center',
      department: 'Production',
      standardSeconds: 7200,
    })
  })

  it('returns enabled stages list', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)

    const response = await GET(buildRequest(), { params: { id: 'wo-1' } })

    const payload = await response.json()

    expect(payload.workOrder.enabledStages).toHaveLength(2)
    expect(payload.workOrder.enabledStages[0].code).toBe('KITTING')
    expect(payload.workOrder.enabledStages[1].code).toBe('LAMINATION')
  })

  it('allows operator to access work order in their department', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'operator-1',
      role: Role.OPERATOR,
      departmentId: 'dept-2', // Current stage department
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)

    const response = await GET(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(200)
  })

  it('returns 403 when operator tries to access work order from different department', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'operator-1',
      role: Role.OPERATOR,
      departmentId: 'dept-3', // Different department
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)

    const response = await GET(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(403)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Work order not in your department' })
  })

  it('allows supervisor to access work orders from any department', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'supervisor-1',
      role: Role.SUPERVISOR,
      departmentId: 'dept-3', // Different department
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)

    const response = await GET(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(200)
  })

  it('allows admin to access work orders from any department', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'admin-1',
      role: Role.ADMIN,
      departmentId: null, // No department
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)

    const response = await GET(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(200)
  })

  it('returns 401 when user is not authenticated', async () => {
    getUserFromRequestMock.mockReturnValue(null)

    const response = await GET(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(401)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Unauthorized' })
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 404 when work order not found', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(null)

    const response = await GET(buildRequest(), { params: { id: 'wo-nonexistent' } })

    expect(response.status).toBe(404)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Work order not found' })
  })

  it('includes work order stage logs', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)

    const response = await GET(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(200)

    // Verify query includes woStageLogs
    expect(workOrderFindUniqueMock).toHaveBeenCalledWith({
      where: { id: 'wo-1' },
      include: expect.objectContaining({
        woStageLogs: expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      }),
    })
  })

  it('returns 500 when database operation fails', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockRejectedValue(new Error('Database error'))

    const response = await GET(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(500)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Internal server error' })
  })

  it('handles work order with no current stage gracefully', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    const workOrderAllStagesDisabled = {
      ...mockWorkOrder,
      routingVersion: {
        ...mockWorkOrder.routingVersion,
        stages: mockWorkOrder.routingVersion.stages.map((s) => ({
          ...s,
          enabled: false,
        })),
      },
    }

    workOrderFindUniqueMock.mockResolvedValue(workOrderAllStagesDisabled)

    const response = await GET(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.workOrder.currentStage).toBeNull()
    expect(payload.workOrder.enabledStages).toHaveLength(0)
  })

  it('queries with full nested includes for work center and stages', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)

    await GET(buildRequest(), { params: { id: 'wo-1' } })

    // Verify complex nested query structure
    expect(workOrderFindUniqueMock).toHaveBeenCalledWith({
      where: { id: 'wo-1' },
      include: {
        routingVersion: {
          include: {
            stages: {
              orderBy: { sequence: 'asc' },
              include: {
                workCenter: {
                  include: {
                    department: true,
                    stations: {
                      where: { isActive: true },
                    },
                  },
                },
                workInstructionVersions: {
                  where: { isActive: true },
                  orderBy: { version: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
        woStageLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            routingStage: {
              include: {
                workCenter: true,
              },
            },
            station: true,
            user: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    })
  })
})
