import { NextRequest } from 'next/server'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { Role, WOStatus } from '@prisma/client'

const {
  getUserFromRequestMock,
  workOrderFindUniqueMock,
  workOrderUpdateMock,
  auditLogCreateMock,
} = vi.hoisted(() => ({
  getUserFromRequestMock: vi.fn(),
  workOrderFindUniqueMock: vi.fn(),
  workOrderUpdateMock: vi.fn(),
  auditLogCreateMock: vi.fn(),
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
    auditLog: {
      create: auditLogCreateMock,
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
import { POST } from '../work-orders/[id]/hold/route'

function buildRequest(body: unknown) {
  return new NextRequest('https://example.com/api/work-orders/wo-1/hold', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/work-orders/[id]/hold', () => {
  const mockWorkOrder = {
    id: 'wo-1',
    number: 'WO-2025-001',
    hullId: 'HULL-12345',
    status: WOStatus.IN_PROGRESS,
  }

  const mockParams = { params: { id: 'wo-1' } }

  beforeEach(() => {
    getUserFromRequestMock.mockReset()
    workOrderFindUniqueMock.mockReset()
    workOrderUpdateMock.mockReset()
    auditLogCreateMock.mockReset()
  })

  it('returns 200 and places work order on hold with reason', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    workOrderUpdateMock.mockResolvedValue({
      ...mockWorkOrder,
      status: WOStatus.HOLD,
    })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    const response = await POST(
      buildRequest({
        reason: 'Material shortage',
      }),
      mockParams
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.success).toBe(true)
    expect(payload.message).toContain('WO-2025-001')
    expect(payload.message).toContain('placed on hold')
    expect(payload.workOrder.status).toBe(WOStatus.HOLD)
    expect(payload.workOrder.previousStatus).toBe(WOStatus.IN_PROGRESS)

    // Verify work order updated to HOLD
    expect(workOrderUpdateMock).toHaveBeenCalledWith({
      where: { id: 'wo-1' },
      data: { status: WOStatus.HOLD },
    })

    // Verify audit log created with reason and previous status
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: {
        actorId: 'user-1',
        model: 'WorkOrder',
        modelId: 'wo-1',
        action: 'HOLD',
        before: { status: WOStatus.IN_PROGRESS },
        after: {
          status: WOStatus.HOLD,
          reason: 'Material shortage',
          previousStatus: WOStatus.IN_PROGRESS,
        },
      },
    })
  })

  it('allows SUPERVISOR to hold work order', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    workOrderUpdateMock.mockResolvedValue(mockWorkOrder)
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    const response = await POST(
      buildRequest({ reason: 'Equipment failure' }),
      mockParams
    )

    expect(response.status).toBe(200)
    expect(workOrderUpdateMock).toHaveBeenCalled()
  })

  it('allows ADMIN to hold work order', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.ADMIN,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    workOrderUpdateMock.mockResolvedValue(mockWorkOrder)
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    const response = await POST(
      buildRequest({ reason: 'Quality issue' }),
      mockParams
    )

    expect(response.status).toBe(200)
    expect(workOrderUpdateMock).toHaveBeenCalled()
  })

  it('can hold work order from PLANNED status', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    const plannedWorkOrder = {
      ...mockWorkOrder,
      status: WOStatus.PLANNED,
    }

    workOrderFindUniqueMock.mockResolvedValue(plannedWorkOrder)
    workOrderUpdateMock.mockResolvedValue({
      ...plannedWorkOrder,
      status: WOStatus.HOLD,
    })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    const response = await POST(
      buildRequest({ reason: 'Postponed' }),
      mockParams
    )

    expect(response.status).toBe(200)
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        before: { status: WOStatus.PLANNED },
        after: expect.objectContaining({
          previousStatus: WOStatus.PLANNED,
        }),
      }),
    })
  })

  it('can hold work order from RELEASED status', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    const releasedWorkOrder = {
      ...mockWorkOrder,
      status: WOStatus.RELEASED,
    }

    workOrderFindUniqueMock.mockResolvedValue(releasedWorkOrder)
    workOrderUpdateMock.mockResolvedValue({
      ...releasedWorkOrder,
      status: WOStatus.HOLD,
    })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    const response = await POST(
      buildRequest({ reason: 'Waiting for materials' }),
      mockParams
    )

    expect(response.status).toBe(200)
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        before: { status: WOStatus.RELEASED },
        after: expect.objectContaining({
          previousStatus: WOStatus.RELEASED,
        }),
      }),
    })
  })

  it('can hold work order from COMPLETED status', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    const completedWorkOrder = {
      ...mockWorkOrder,
      status: WOStatus.COMPLETED,
    }

    workOrderFindUniqueMock.mockResolvedValue(completedWorkOrder)
    workOrderUpdateMock.mockResolvedValue({
      ...completedWorkOrder,
      status: WOStatus.HOLD,
    })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    const response = await POST(
      buildRequest({ reason: 'Quality inspection failed' }),
      mockParams
    )

    expect(response.status).toBe(200)
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        before: { status: WOStatus.COMPLETED },
        after: expect.objectContaining({
          previousStatus: WOStatus.COMPLETED,
        }),
      }),
    })
  })

  it('returns 401 when user is not authenticated', async () => {
    getUserFromRequestMock.mockReturnValue(null)

    const response = await POST(
      buildRequest({ reason: 'Test reason' }),
      mockParams
    )

    expect(response.status).toBe(401)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Unauthorized' })
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 403 when user is OPERATOR', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
    })

    const response = await POST(
      buildRequest({ reason: 'Test reason' }),
      mockParams
    )

    expect(response.status).toBe(403)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Forbidden - Supervisor or Admin only' })
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 404 when work order not found', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(null)

    const response = await POST(
      buildRequest({ reason: 'Test reason' }),
      mockParams
    )

    expect(response.status).toBe(404)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Work order not found' })
    expect(workOrderUpdateMock).not.toHaveBeenCalled()
  })

  it('returns 400 when work order is already on HOLD', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrder,
      status: WOStatus.HOLD,
    })

    const response = await POST(
      buildRequest({ reason: 'Test reason' }),
      mockParams
    )

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Work order is already on hold' })
    expect(workOrderUpdateMock).not.toHaveBeenCalled()
  })

  it('returns 400 when reason is missing', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)

    const response = await POST(buildRequest({}), mockParams)

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Reason is required' })
    expect(workOrderUpdateMock).not.toHaveBeenCalled()
  })

  it('returns 400 when reason is empty string', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)

    const response = await POST(buildRequest({ reason: '' }), mockParams)

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Reason is required' })
    expect(workOrderUpdateMock).not.toHaveBeenCalled()
  })

  it('returns 500 when database operation fails', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockRejectedValue(new Error('Database error'))

    const response = await POST(
      buildRequest({ reason: 'Test reason' }),
      mockParams
    )

    expect(response.status).toBe(500)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Internal server error' })
  })

  it('stores previous status correctly in audit log', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'supervisor-1',
      role: Role.SUPERVISOR,
    })

    const workOrderInProgress = {
      ...mockWorkOrder,
      status: WOStatus.IN_PROGRESS,
    }

    workOrderFindUniqueMock.mockResolvedValue(workOrderInProgress)
    workOrderUpdateMock.mockResolvedValue({
      ...workOrderInProgress,
      status: WOStatus.HOLD,
    })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    await POST(
      buildRequest({ reason: 'Equipment maintenance' }),
      mockParams
    )

    // Verify audit log captures the before/after state with previous status
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: {
        actorId: 'supervisor-1',
        model: 'WorkOrder',
        modelId: 'wo-1',
        action: 'HOLD',
        before: { status: WOStatus.IN_PROGRESS },
        after: {
          status: WOStatus.HOLD,
          reason: 'Equipment maintenance',
          previousStatus: WOStatus.IN_PROGRESS,
        },
      },
    })
  })
})
