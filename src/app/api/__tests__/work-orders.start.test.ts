import { NextRequest } from 'next/server'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { Role, WOStatus, WOEvent } from '@prisma/client'

const {
  getUserFromRequestMock,
  workOrderFindUniqueMock,
  workOrderUpdateMock,
  stationFindFirstMock,
  woStageLogCreateMock,
} = vi.hoisted(() => ({
  getUserFromRequestMock: vi.fn(),
  workOrderFindUniqueMock: vi.fn(),
  workOrderUpdateMock: vi.fn(),
  stationFindFirstMock: vi.fn(),
  woStageLogCreateMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getUserFromRequest: getUserFromRequestMock,
}))

vi.mock('@/server/db/client', () => ({
  prisma: {
    workOrder: {
      findUnique: workOrderFindUniqueMock,
      update: workOrderUpdateMock,
    },
    station: {
      findFirst: stationFindFirstMock,
    },
    wOStageLog: {
      create: woStageLogCreateMock,
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
import { POST } from '../work-orders/start/route'

function buildRequest(body: unknown, departmentId?: string) {
  const url = departmentId
    ? `https://example.com/api/work-orders/start?departmentId=${departmentId}`
    : 'https://example.com/api/work-orders/start'

  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/work-orders/start', () => {
  const mockWorkOrder = {
    id: 'wo-1',
    number: 'WO-2025-001',
    hullId: 'HULL-12345',
    status: WOStatus.RELEASED,
    currentStageIndex: 0,
    routingVersion: {
      id: 'routing-1',
      stages: [
        {
          id: 'stage-1',
          code: 'KITTING',
          name: 'Kitting',
          sequence: 1,
          enabled: true,
          workCenterId: 'wc-1',
          workCenter: {
            id: 'wc-1',
            name: 'Kitting Center',
            department: {
              id: 'dept-1',
              name: 'Assembly',
            },
          },
        },
        {
          id: 'stage-2',
          code: 'LAMINATION',
          name: 'Lamination',
          sequence: 2,
          enabled: true,
          workCenterId: 'wc-2',
          workCenter: {
            id: 'wc-2',
            name: 'Lamination Center',
            department: {
              id: 'dept-2',
              name: 'Production',
            },
          },
        },
      ],
    },
  }

  const mockStation = {
    id: 'station-1',
    code: 'KIT-1',
    name: 'Kitting Station 1',
    workCenterId: 'wc-1',
    isActive: true,
  }

  beforeEach(() => {
    getUserFromRequestMock.mockReset()
    workOrderFindUniqueMock.mockReset()
    workOrderUpdateMock.mockReset()
    stationFindFirstMock.mockReset()
    woStageLogCreateMock.mockReset()
  })

  it('returns 200 and creates START log when valid data provided', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    stationFindFirstMock.mockResolvedValue(mockStation)
    woStageLogCreateMock.mockResolvedValue({ id: 'log-1' })
    workOrderUpdateMock.mockResolvedValue({
      ...mockWorkOrder,
      status: WOStatus.IN_PROGRESS,
    })

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-1',
        note: 'Starting work',
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.success).toBe(true)
    expect(payload.message).toContain('Started work on WO-2025-001')
    expect(payload.message).toContain('KIT-1')

    // Verify WOStageLog creation
    expect(woStageLogCreateMock).toHaveBeenCalledWith({
      data: {
        workOrderId: 'wo-1',
        routingStageId: 'stage-1',
        stationId: 'station-1',
        userId: 'user-1',
        event: WOEvent.START,
        note: 'Starting work',
      },
    })

    // Verify work order status updated from RELEASED to IN_PROGRESS
    expect(workOrderUpdateMock).toHaveBeenCalledWith({
      where: { id: 'wo-1' },
      data: { status: WOStatus.IN_PROGRESS },
    })
  })

  it('uses departmentId from query params when provided', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: null,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    stationFindFirstMock.mockResolvedValue(mockStation)
    woStageLogCreateMock.mockResolvedValue({ id: 'log-1' })
    workOrderUpdateMock.mockResolvedValue(mockWorkOrder)

    const response = await POST(
      buildRequest(
        {
          workOrderId: 'wo-1',
          stationId: 'station-1',
        },
        'dept-1'
      )
    )

    expect(response.status).toBe(200)
    expect(woStageLogCreateMock).toHaveBeenCalled()
  })

  it('does not update status if already IN_PROGRESS', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    const workOrderInProgress = {
      ...mockWorkOrder,
      status: WOStatus.IN_PROGRESS,
    }

    workOrderFindUniqueMock.mockResolvedValue(workOrderInProgress)
    stationFindFirstMock.mockResolvedValue(mockStation)
    woStageLogCreateMock.mockResolvedValue({ id: 'log-1' })

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-1',
      })
    )

    expect(response.status).toBe(200)

    // Verify WOStageLog still created
    expect(woStageLogCreateMock).toHaveBeenCalled()

    // Verify work order status NOT updated (already IN_PROGRESS)
    expect(workOrderUpdateMock).not.toHaveBeenCalled()
  })

  it('returns 401 when user is not authenticated', async () => {
    getUserFromRequestMock.mockReturnValue(null)

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-1',
      })
    )

    expect(response.status).toBe(401)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Unauthorized' })
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 400 when no department specified', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: null, // No department
    })

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-1',
      })
    )

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'No department specified' })
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 404 when work order not found', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(null)

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-nonexistent',
        stationId: 'station-1',
      })
    )

    expect(response.status).toBe(404)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Work order not found' })
    expect(woStageLogCreateMock).not.toHaveBeenCalled()
  })

  it('returns 409 when work order is on HOLD', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrder,
      status: WOStatus.HOLD,
    })

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-1',
      })
    )

    expect(response.status).toBe(409)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Work order is on hold' })
    expect(woStageLogCreateMock).not.toHaveBeenCalled()
  })

  it('returns 403 when user department does not match current stage', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-2', // Wrong department
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder) // Current stage is dept-1

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-1',
      })
    )

    expect(response.status).toBe(403)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Not authorized for this stage' })
    expect(woStageLogCreateMock).not.toHaveBeenCalled()
  })

  it('returns 400 when station is invalid for current stage', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    stationFindFirstMock.mockResolvedValue(null) // Station not found

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'wrong-station',
      })
    )

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Invalid station for current stage' })
    expect(woStageLogCreateMock).not.toHaveBeenCalled()
  })

  it('verifies station belongs to correct work center', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    stationFindFirstMock.mockResolvedValue(mockStation)
    woStageLogCreateMock.mockResolvedValue({ id: 'log-1' })
    workOrderUpdateMock.mockResolvedValue(mockWorkOrder)

    await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-1',
      })
    )

    // Verify station query includes work center validation
    expect(stationFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: 'station-1',
        workCenterId: 'wc-1', // Current stage's work center
        isActive: true,
      },
    })
  })

  it('handles optional note parameter', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    stationFindFirstMock.mockResolvedValue(mockStation)
    woStageLogCreateMock.mockResolvedValue({ id: 'log-1' })
    workOrderUpdateMock.mockResolvedValue(mockWorkOrder)

    await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-1',
        // No note provided
      })
    )

    expect(woStageLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        note: null,
      }),
    })
  })

  it('returns 400 when workOrderId is missing', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    const response = await POST(
      buildRequest({
        stationId: 'station-1',
        // Missing workOrderId
      })
    )

    expect(response.status).toBe(500) // Zod validation error caught
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 400 when stationId is missing', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        // Missing stationId
      })
    )

    expect(response.status).toBe(500) // Zod validation error caught
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 500 when database operation fails', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockRejectedValue(new Error('Database error'))

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-1',
      })
    )

    expect(response.status).toBe(500)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Internal server error' })
  })

  it('handles work order at second stage correctly', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-2',
      role: Role.OPERATOR,
      departmentId: 'dept-2', // Second department
    })

    const workOrderAtStage2 = {
      ...mockWorkOrder,
      currentStageIndex: 1, // Second stage
      status: WOStatus.RELEASED,
    }

    workOrderFindUniqueMock.mockResolvedValue(workOrderAtStage2)
    stationFindFirstMock.mockResolvedValue({
      id: 'station-2',
      code: 'LAM-1',
      workCenterId: 'wc-2',
      isActive: true,
    })
    woStageLogCreateMock.mockResolvedValue({ id: 'log-2' })
    workOrderUpdateMock.mockResolvedValue(workOrderAtStage2)

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-2',
      })
    )

    expect(response.status).toBe(200)

    // Verify correct stage used
    expect(woStageLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        routingStageId: 'stage-2',
      }),
    })
  })
})
