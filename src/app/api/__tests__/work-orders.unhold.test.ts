import { NextRequest } from 'next/server'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { Role, WOStatus } from '@prisma/client'

const {
  getUserFromRequestMock,
  workOrderFindUniqueMock,
  workOrderUpdateMock,
  auditLogFindFirstMock,
  auditLogCreateMock,
} = vi.hoisted(() => ({
  getUserFromRequestMock: vi.fn(),
  workOrderFindUniqueMock: vi.fn(),
  workOrderUpdateMock: vi.fn(),
  auditLogFindFirstMock: vi.fn(),
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
      findFirst: auditLogFindFirstMock,
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
import { POST } from '../work-orders/[id]/unhold/route'

function buildRequest() {
  return new NextRequest('https://example.com/api/work-orders/wo-1/unhold', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  })
}

describe('POST /api/work-orders/[id]/unhold', () => {
  const mockWorkOrderOnHold = {
    id: 'wo-1',
    number: 'WO-2025-001',
    hullId: 'HULL-12345',
    status: WOStatus.HOLD,
  }

  const mockParams = { params: { id: 'wo-1' } }

  beforeEach(() => {
    getUserFromRequestMock.mockReset()
    workOrderFindUniqueMock.mockReset()
    workOrderUpdateMock.mockReset()
    auditLogFindFirstMock.mockReset()
    auditLogCreateMock.mockReset()
  })

  it('returns 200 and restores previous status from audit log', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrderOnHold)
    auditLogFindFirstMock.mockResolvedValue({
      id: 'audit-1',
      modelId: 'wo-1',
      model: 'WorkOrder',
      action: 'HOLD',
      before: { status: WOStatus.IN_PROGRESS },
      after: {
        status: WOStatus.HOLD,
        reason: 'Material shortage',
        previousStatus: WOStatus.IN_PROGRESS,
      },
      createdAt: new Date(),
    })
    workOrderUpdateMock.mockResolvedValue({
      ...mockWorkOrderOnHold,
      status: WOStatus.IN_PROGRESS,
    })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-2' })

    const response = await POST(buildRequest(), mockParams)

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.success).toBe(true)
    expect(payload.message).toContain('WO-2025-001')
    expect(payload.message).toContain('removed from hold')
    expect(payload.workOrder.status).toBe(WOStatus.IN_PROGRESS)

    // Verify work order updated to previous status
    expect(workOrderUpdateMock).toHaveBeenCalledWith({
      where: { id: 'wo-1' },
      data: { status: WOStatus.IN_PROGRESS },
    })

    // Verify audit log created for UNHOLD
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: {
        actorId: 'user-1',
        model: 'WorkOrder',
        modelId: 'wo-1',
        action: 'UNHOLD',
        before: { status: WOStatus.HOLD },
        after: { status: WOStatus.IN_PROGRESS },
      },
    })
  })

  it('defaults to RELEASED when no previous status found', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrderOnHold)
    auditLogFindFirstMock.mockResolvedValue(null) // No audit log found
    workOrderUpdateMock.mockResolvedValue({
      ...mockWorkOrderOnHold,
      status: WOStatus.RELEASED,
    })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    const response = await POST(buildRequest(), mockParams)

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.workOrder.status).toBe(WOStatus.RELEASED)

    // Verify work order updated to RELEASED (default)
    expect(workOrderUpdateMock).toHaveBeenCalledWith({
      where: { id: 'wo-1' },
      data: { status: WOStatus.RELEASED },
    })

    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        after: { status: WOStatus.RELEASED },
      }),
    })
  })

  it('defaults to RELEASED when audit log has no previousStatus', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrderOnHold)
    auditLogFindFirstMock.mockResolvedValue({
      id: 'audit-1',
      modelId: 'wo-1',
      model: 'WorkOrder',
      action: 'HOLD',
      before: { status: WOStatus.IN_PROGRESS },
      after: { status: WOStatus.HOLD, reason: 'Test' }, // No previousStatus field
      createdAt: new Date(),
    })
    workOrderUpdateMock.mockResolvedValue({
      ...mockWorkOrderOnHold,
      status: WOStatus.RELEASED,
    })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-2' })

    const response = await POST(buildRequest(), mockParams)

    expect(response.status).toBe(200)

    // Verify defaults to RELEASED
    expect(workOrderUpdateMock).toHaveBeenCalledWith({
      where: { id: 'wo-1' },
      data: { status: WOStatus.RELEASED },
    })
  })

  it('restores to PLANNED when that was previous status', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrderOnHold)
    auditLogFindFirstMock.mockResolvedValue({
      id: 'audit-1',
      modelId: 'wo-1',
      model: 'WorkOrder',
      action: 'HOLD',
      after: {
        status: WOStatus.HOLD,
        previousStatus: WOStatus.PLANNED,
      },
      createdAt: new Date(),
    })
    workOrderUpdateMock.mockResolvedValue({
      ...mockWorkOrderOnHold,
      status: WOStatus.PLANNED,
    })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-2' })

    const response = await POST(buildRequest(), mockParams)

    expect(response.status).toBe(200)

    expect(workOrderUpdateMock).toHaveBeenCalledWith({
      where: { id: 'wo-1' },
      data: { status: WOStatus.PLANNED },
    })
  })

  it('restores to COMPLETED when that was previous status', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrderOnHold)
    auditLogFindFirstMock.mockResolvedValue({
      id: 'audit-1',
      modelId: 'wo-1',
      model: 'WorkOrder',
      action: 'HOLD',
      after: {
        status: WOStatus.HOLD,
        previousStatus: WOStatus.COMPLETED,
      },
      createdAt: new Date(),
    })
    workOrderUpdateMock.mockResolvedValue({
      ...mockWorkOrderOnHold,
      status: WOStatus.COMPLETED,
    })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-2' })

    const response = await POST(buildRequest(), mockParams)

    expect(response.status).toBe(200)

    expect(workOrderUpdateMock).toHaveBeenCalledWith({
      where: { id: 'wo-1' },
      data: { status: WOStatus.COMPLETED },
    })
  })

  it('allows SUPERVISOR to unhold work order', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrderOnHold)
    auditLogFindFirstMock.mockResolvedValue(null)
    workOrderUpdateMock.mockResolvedValue(mockWorkOrderOnHold)
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    const response = await POST(buildRequest(), mockParams)

    expect(response.status).toBe(200)
    expect(workOrderUpdateMock).toHaveBeenCalled()
  })

  it('allows ADMIN to unhold work order', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.ADMIN,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrderOnHold)
    auditLogFindFirstMock.mockResolvedValue(null)
    workOrderUpdateMock.mockResolvedValue(mockWorkOrderOnHold)
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    const response = await POST(buildRequest(), mockParams)

    expect(response.status).toBe(200)
    expect(workOrderUpdateMock).toHaveBeenCalled()
  })

  it('returns 401 when user is not authenticated', async () => {
    getUserFromRequestMock.mockReturnValue(null)

    const response = await POST(buildRequest(), mockParams)

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

    const response = await POST(buildRequest(), mockParams)

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

    const response = await POST(buildRequest(), mockParams)

    expect(response.status).toBe(404)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Work order not found' })
    expect(auditLogFindFirstMock).not.toHaveBeenCalled()
  })

  it('returns 400 when work order is not on HOLD', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrderOnHold,
      status: WOStatus.IN_PROGRESS, // Not on hold
    })

    const response = await POST(buildRequest(), mockParams)

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Work order is not on hold' })
    expect(auditLogFindFirstMock).not.toHaveBeenCalled()
  })

  it('returns 500 when database operation fails', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockRejectedValue(new Error('Database error'))

    const response = await POST(buildRequest(), mockParams)

    expect(response.status).toBe(500)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Internal server error' })
  })

  it('queries audit log for most recent HOLD action', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrderOnHold)
    auditLogFindFirstMock.mockResolvedValue({
      id: 'audit-1',
      after: { status: WOStatus.HOLD, previousStatus: WOStatus.RELEASED },
      createdAt: new Date(),
    })
    workOrderUpdateMock.mockResolvedValue(mockWorkOrderOnHold)
    auditLogCreateMock.mockResolvedValue({ id: 'audit-2' })

    await POST(buildRequest(), mockParams)

    // Verify audit log query
    expect(auditLogFindFirstMock).toHaveBeenCalledWith({
      where: {
        modelId: 'wo-1',
        model: 'WorkOrder',
        action: 'HOLD',
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('creates UNHOLD audit log with correct actor', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'admin-1',
      role: Role.ADMIN,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrderOnHold)
    auditLogFindFirstMock.mockResolvedValue({
      id: 'audit-1',
      after: { status: WOStatus.HOLD, previousStatus: WOStatus.RELEASED },
      createdAt: new Date(),
    })
    workOrderUpdateMock.mockResolvedValue({
      ...mockWorkOrderOnHold,
      status: WOStatus.RELEASED,
    })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-2' })

    await POST(buildRequest(), mockParams)

    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: {
        actorId: 'admin-1',
        model: 'WorkOrder',
        modelId: 'wo-1',
        action: 'UNHOLD',
        before: { status: WOStatus.HOLD },
        after: { status: WOStatus.RELEASED },
      },
    })
  })
})
