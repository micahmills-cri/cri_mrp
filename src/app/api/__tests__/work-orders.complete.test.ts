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
import { POST } from '../work-orders/complete/route'

function buildRequest(body: unknown, departmentId?: string) {
  const url = departmentId
    ? `https://example.com/api/work-orders/complete?departmentId=${departmentId}`
    : 'https://example.com/api/work-orders/complete'

  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/work-orders/complete', () => {
  const mockWorkOrder = {
    id: 'wo-1',
    number: 'WO-2025-001',
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
    workOrderUpdateMock.mockReset()
    stationFindFirstMock.mockReset()
    woStageLogCreateMock.mockReset()
  })

  it('returns 200 and completes current stage, advancing to next', async () => {
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
      status: WOStatus.RELEASED,
      currentStageIndex: 1,
    })

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-1',
        goodQty: 5,
        scrapQty: 1,
        note: 'Stage complete',
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.success).toBe(true)
    expect(payload.message).toContain('Completed stage Kitting')
    expect(payload.message).toContain('WO-2025-001')
    expect(payload.isComplete).toBe(false)

    // Verify WOStageLog creation with quality data
    expect(woStageLogCreateMock).toHaveBeenCalledWith({
      data: {
        workOrderId: 'wo-1',
        routingStageId: 'stage-1',
        stationId: 'station-1',
        userId: 'user-1',
        event: WOEvent.COMPLETE,
        goodQty: 5,
        scrapQty: 1,
        note: 'Stage complete',
      },
    })

    // Verify work order updated: RELEASED status, stage index incremented
    expect(workOrderUpdateMock).toHaveBeenCalledWith({
      where: { id: 'wo-1' },
      data: {
        status: WOStatus.RELEASED,
        currentStageIndex: 1,
      },
    })
  })

  it('returns 200 and completes last stage, marking work order as COMPLETED', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-2',
      role: Role.OPERATOR,
      departmentId: 'dept-2',
    })

    const workOrderAtLastStage = {
      ...mockWorkOrder,
      currentStageIndex: 1, // Last stage (index 1, length 2)
    }

    workOrderFindUniqueMock.mockResolvedValue(workOrderAtLastStage)
    stationFindFirstMock.mockResolvedValue({
      id: 'station-2',
      code: 'LAM-1',
      workCenterId: 'wc-2',
      isActive: true,
    })
    woStageLogCreateMock.mockResolvedValue({ id: 'log-2' })
    workOrderUpdateMock.mockResolvedValue({
      ...workOrderAtLastStage,
      status: WOStatus.COMPLETED,
    })

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-2',
        goodQty: 10,
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.success).toBe(true)
    expect(payload.message).toContain('Completed work order WO-2025-001')
    expect(payload.isComplete).toBe(true)

    // Verify work order marked as COMPLETED, stage index unchanged
    expect(workOrderUpdateMock).toHaveBeenCalledWith({
      where: { id: 'wo-1' },
      data: {
        status: WOStatus.COMPLETED,
        currentStageIndex: 1, // Stays at last stage
      },
    })
  })

  it('defaults scrapQty to 0 when not provided', async () => {
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
        goodQty: 5,
        // scrapQty not provided
      })
    )

    expect(woStageLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        scrapQty: 0,
      }),
    })
  })

  it('returns 401 when user is not authenticated', async () => {
    getUserFromRequestMock.mockReturnValue(null)

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-1',
        goodQty: 5,
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
      departmentId: null,
    })

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-1',
        goodQty: 5,
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
        goodQty: 5,
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
        goodQty: 5,
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
        goodQty: 5,
      })
    )

    expect(response.status).toBe(403)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Not authorized for this stage' })
    expect(woStageLogCreateMock).not.toHaveBeenCalled()
  })

  it('returns 400 when station is invalid', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    stationFindFirstMock.mockResolvedValue(null)

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'invalid-station',
        goodQty: 5,
      })
    )

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Invalid station' })
    expect(woStageLogCreateMock).not.toHaveBeenCalled()
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
        goodQty: 5,
      })
    )

    expect(response.status).toBe(500)
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
        goodQty: 5,
      })
    )

    expect(response.status).toBe(500)
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 500 when goodQty is missing', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-1',
      })
    )

    expect(response.status).toBe(500)
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 500 when goodQty is negative', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-1',
        goodQty: -5,
      })
    )

    expect(response.status).toBe(500)
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 500 when scrapQty is negative', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    const response = await POST(
      buildRequest({
        workOrderId: 'wo-1',
        stationId: 'station-1',
        goodQty: 5,
        scrapQty: -2,
      })
    )

    expect(response.status).toBe(500)
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
        goodQty: 5,
      })
    )

    expect(response.status).toBe(500)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Internal server error' })
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
          goodQty: 5,
        },
        'dept-1'
      )
    )

    expect(response.status).toBe(200)
    expect(woStageLogCreateMock).toHaveBeenCalled()
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
        goodQty: 5,
        note: 'Quality check passed',
      })
    )

    expect(woStageLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        note: 'Quality check passed',
      }),
    })
  })

  it('sets note to null when not provided', async () => {
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
        goodQty: 5,
        // No note
      })
    )

    expect(woStageLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        note: null,
      }),
    })
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
        goodQty: 5,
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
})
