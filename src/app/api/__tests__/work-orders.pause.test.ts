import { NextRequest } from 'next/server'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { Role, WOStatus, WOEvent } from '@prisma/client'

const {
  getUserFromRequestMock,
  workOrderFindUniqueMock,
  stationFindFirstMock,
  woStageLogCreateMock,
} = vi.hoisted(() => ({
  getUserFromRequestMock: vi.fn(),
  workOrderFindUniqueMock: vi.fn(),
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
import { POST } from '../work-orders/pause/route'

function buildRequest(body: unknown, departmentId?: string) {
  const url = departmentId
    ? `https://example.com/api/work-orders/pause?departmentId=${departmentId}`
    : 'https://example.com/api/work-orders/pause'

  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/work-orders/pause', () => {
  const mockWorkOrder = {
    id: 'wo-1',
    number: 'WO-2025-001',
    hullId: 'HULL-12345',
    status: WOStatus.IN_PROGRESS,
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
    stationFindFirstMock.mockReset()
    woStageLogCreateMock.mockReset()
  })

  it('returns 200 and creates PAUSE log when valid data provided', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    stationFindFirstMock.mockResolvedValue(mockStation)
    woStageLogCreateMock.mockResolvedValue({ id: 'log-1' })

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-1',
        note: 'Taking a break',
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.success).toBe(true)
    expect(payload.message).toContain('Paused work on WO-2025-001')

    // Verify WOStageLog creation with PAUSE event
    expect(woStageLogCreateMock).toHaveBeenCalledWith({
      data: {
        workOrderId: 'wo-1',
        routingStageId: 'stage-1',
        stationId: 'station-1',
        userId: 'user-1',
        event: WOEvent.PAUSE,
        note: 'Taking a break',
      },
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

  it('does not update work order status (PAUSE is just a log entry)', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    stationFindFirstMock.mockResolvedValue(mockStation)
    woStageLogCreateMock.mockResolvedValue({ id: 'log-1' })

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-1',
      })
    )

    expect(response.status).toBe(200)

    // Verify WOStageLog created
    expect(woStageLogCreateMock).toHaveBeenCalled()

    // Note: No workOrderUpdate mock exists - pause doesn't change status
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

    expect(payload).toEqual({ error: 'Work order is already on hold' })
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

    expect(payload).toEqual({ error: 'Invalid station' })
    expect(woStageLogCreateMock).not.toHaveBeenCalled()
  })

  it('returns 400 when no current stage found', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    // Work order with all stages disabled
    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrder,
      routingVersion: {
        ...mockWorkOrder.routingVersion,
        stages: mockWorkOrder.routingVersion.stages.map((s) => ({ ...s, enabled: false })),
      },
    })

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-1',
      })
    )

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'No current stage found' })
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

  it('returns 500 when workOrderId is missing', async () => {
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

  it('returns 500 when stationId is missing', async () => {
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

  it('allows pause from RELEASED status', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    const workOrderReleased = {
      ...mockWorkOrder,
      status: WOStatus.RELEASED,
    }

    workOrderFindUniqueMock.mockResolvedValue(workOrderReleased)
    stationFindFirstMock.mockResolvedValue(mockStation)
    woStageLogCreateMock.mockResolvedValue({ id: 'log-1' })

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-1',
      })
    )

    expect(response.status).toBe(200)
    expect(woStageLogCreateMock).toHaveBeenCalled()
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
    }

    workOrderFindUniqueMock.mockResolvedValue(workOrderAtStage2)
    stationFindFirstMock.mockResolvedValue({
      id: 'station-2',
      code: 'LAM-1',
      workCenterId: 'wc-2',
      isActive: true,
    })
    woStageLogCreateMock.mockResolvedValue({ id: 'log-2' })

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
