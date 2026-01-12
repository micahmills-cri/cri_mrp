import { NextRequest } from 'next/server'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { Role, WOStatus } from '@prisma/client'

const {
  getUserFromRequestMock,
  workOrderFindUniqueMock,
  workOrderUpdateMock,
  workOrderVersionFindFirstMock,
  workOrderVersionCreateMock,
  auditLogCreateMock,
  prismaMock,
} = vi.hoisted(() => ({
  getUserFromRequestMock: vi.fn(),
  workOrderFindUniqueMock: vi.fn(),
  workOrderUpdateMock: vi.fn(),
  workOrderVersionFindFirstMock: vi.fn(),
  workOrderVersionCreateMock: vi.fn(),
  auditLogCreateMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
  },
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
    workOrderVersion: {
      findFirst: workOrderVersionFindFirstMock,
      create: workOrderVersionCreateMock,
    },
    auditLog: {
      create: auditLogCreateMock,
    },
    $transaction: prismaMock.$transaction,
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
import { POST } from '../supervisor/cancel-wo/route'

function buildRequest(body: unknown) {
  return new NextRequest('https://example.com/api/supervisor/cancel-wo', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/supervisor/cancel-wo', () => {
  const mockWorkOrder = {
    id: 'wo-1',
    number: 'WO-2025-001',
    hullId: 'HULL-12345',
    productSku: 'LX24-SPORT-001',
    qty: 1,
    status: WOStatus.RELEASED,
    priority: 'NORMAL',
    plannedStartDate: new Date('2025-06-01'),
    plannedFinishDate: new Date('2025-06-30'),
    routingVersionId: 'routing-1',
    currentStageIndex: 0,
    specSnapshot: { model: 'LX24', trim: 'Sport' },
    routingVersion: {
      id: 'routing-1',
      model: 'LX24',
      trim: 'Sport',
      version: 'v1',
      stages: [
        {
          id: 'stage-1',
          code: 'KITTING',
          name: 'Kitting',
          sequence: 1,
          enabled: true,
          workCenterId: 'wc-1',
          standardStageSeconds: 3600,
        },
        {
          id: 'stage-2',
          code: 'LAMINATION',
          name: 'Lamination',
          sequence: 2,
          enabled: true,
          workCenterId: 'wc-2',
          standardStageSeconds: 7200,
        },
      ],
    },
  }

  beforeEach(() => {
    getUserFromRequestMock.mockReset()
    workOrderFindUniqueMock.mockReset()
    workOrderUpdateMock.mockReset()
    workOrderVersionFindFirstMock.mockReset()
    workOrderVersionCreateMock.mockReset()
    auditLogCreateMock.mockReset()
    prismaMock.$transaction.mockReset()
  })

  it('returns 200 and cancels work order when SUPERVISOR provides valid data', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    workOrderVersionFindFirstMock.mockResolvedValue({
      id: 'version-2',
      versionNumber: 2,
    })

    const cancelledWorkOrder = {
      ...mockWorkOrder,
      status: WOStatus.CANCELLED,
    }

    prismaMock.$transaction.mockImplementation(async (callback) => {
      const tx = {
        workOrder: {
          findUnique: workOrderFindUniqueMock,
          update: workOrderUpdateMock,
        },
        workOrderVersion: {
          findFirst: workOrderVersionFindFirstMock,
          create: workOrderVersionCreateMock,
        },
        auditLog: {
          create: auditLogCreateMock,
        },
      }
      return callback(tx)
    })

    workOrderUpdateMock.mockResolvedValue(cancelledWorkOrder)
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-3', versionNumber: 3 })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    const response = await POST(buildRequest({ workOrderId: 'wo-1' }))

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.success).toBe(true)
    expect(payload.message).toBe('Work order cancelled successfully')
    expect(payload.workOrder.status).toBe(WOStatus.CANCELLED)

    // Verify WorkOrderVersion creation
    expect(workOrderVersionCreateMock).toHaveBeenCalledWith({
      data: {
        workOrderId: 'wo-1',
        versionNumber: 3,
        snapshotData: expect.objectContaining({
          number: 'WO-2025-001',
          status: 'CANCELLED',
          hullId: 'HULL-12345',
          routingVersion: expect.objectContaining({
            model: 'LX24',
            trim: 'Sport',
            version: 'v1',
          }),
        }),
        reason: 'Work order cancelled',
        createdBy: 'user-1',
      },
    })

    // Verify work order status update
    expect(workOrderUpdateMock).toHaveBeenCalledWith({
      where: { id: 'wo-1' },
      data: {
        status: 'CANCELLED',
      },
    })

    // Verify AuditLog creation
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: {
        actorId: 'user-1',
        action: 'UPDATE',
        model: 'WorkOrder',
        modelId: 'wo-1',
        before: { status: WOStatus.RELEASED },
        after: { status: 'CANCELLED' },
      },
    })
  })

  it('returns 200 and cancels work order when ADMIN provides valid data', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'admin-1',
      role: Role.ADMIN,
    })

    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrder,
      status: WOStatus.IN_PROGRESS,
    })
    workOrderVersionFindFirstMock.mockResolvedValue({ versionNumber: 5 })

    const cancelledWorkOrder = {
      ...mockWorkOrder,
      status: WOStatus.CANCELLED,
    }

    prismaMock.$transaction.mockImplementation(async (callback) => {
      const tx = {
        workOrder: { update: workOrderUpdateMock },
        workOrderVersion: {
          findFirst: workOrderVersionFindFirstMock,
          create: workOrderVersionCreateMock,
        },
        auditLog: { create: auditLogCreateMock },
      }
      return callback(tx)
    })

    workOrderUpdateMock.mockResolvedValue(cancelledWorkOrder)
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-6', versionNumber: 6 })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-2' })

    const response = await POST(buildRequest({ workOrderId: 'wo-1' }))

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.success).toBe(true)
    expect(payload.workOrder.status).toBe(WOStatus.CANCELLED)

    // Verify version number incremented correctly
    expect(workOrderVersionCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        versionNumber: 6,
      }),
    })
  })

  it('cancels work order in PLANNED status', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrder,
      status: WOStatus.PLANNED,
    })
    workOrderVersionFindFirstMock.mockResolvedValue({ versionNumber: 1 })

    const cancelledWorkOrder = {
      ...mockWorkOrder,
      status: WOStatus.CANCELLED,
    }

    prismaMock.$transaction.mockImplementation(async (callback) => {
      const tx = {
        workOrder: { update: workOrderUpdateMock },
        workOrderVersion: {
          findFirst: workOrderVersionFindFirstMock,
          create: workOrderVersionCreateMock,
        },
        auditLog: { create: auditLogCreateMock },
      }
      return callback(tx)
    })

    workOrderUpdateMock.mockResolvedValue(cancelledWorkOrder)
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-2' })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    const response = await POST(buildRequest({ workOrderId: 'wo-1' }))

    expect(response.status).toBe(200)
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        before: { status: WOStatus.PLANNED },
        after: { status: 'CANCELLED' },
      }),
    })
  })

  it('cancels work order in HOLD status', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrder,
      status: WOStatus.HOLD,
    })
    workOrderVersionFindFirstMock.mockResolvedValue({ versionNumber: 3 })

    const cancelledWorkOrder = {
      ...mockWorkOrder,
      status: WOStatus.CANCELLED,
    }

    prismaMock.$transaction.mockImplementation(async (callback) => {
      const tx = {
        workOrder: { update: workOrderUpdateMock },
        workOrderVersion: {
          findFirst: workOrderVersionFindFirstMock,
          create: workOrderVersionCreateMock,
        },
        auditLog: { create: auditLogCreateMock },
      }
      return callback(tx)
    })

    workOrderUpdateMock.mockResolvedValue(cancelledWorkOrder)
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-4' })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    const response = await POST(buildRequest({ workOrderId: 'wo-1' }))

    expect(response.status).toBe(200)
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        before: { status: WOStatus.HOLD },
      }),
    })
  })

  it('returns 401 when user is not authenticated', async () => {
    getUserFromRequestMock.mockReturnValue(null)

    const response = await POST(buildRequest({ workOrderId: 'wo-1' }))

    expect(response.status).toBe(401)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Unauthorized' })
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 403 when OPERATOR tries to cancel work order', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'operator-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    const response = await POST(buildRequest({ workOrderId: 'wo-1' }))

    expect(response.status).toBe(403)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Insufficient permissions' })
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 400 when workOrderId is missing', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    const response = await POST(buildRequest({}))

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Work order ID is required' })
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 400 when workOrderId is null', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    const response = await POST(buildRequest({ workOrderId: null }))

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Work order ID is required' })
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 404 when work order does not exist', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(null)

    const response = await POST(buildRequest({ workOrderId: 'wo-nonexistent' }))

    expect(response.status).toBe(404)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Work order not found' })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('returns 400 when work order is already COMPLETED', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrder,
      status: WOStatus.COMPLETED,
    })

    const response = await POST(buildRequest({ workOrderId: 'wo-1' }))

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({
      error: 'Cannot cancel completed or closed work orders',
    })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('returns 400 when work order is already CLOSED', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrder,
      status: WOStatus.CLOSED,
    })

    const response = await POST(buildRequest({ workOrderId: 'wo-1' }))

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({
      error: 'Cannot cancel completed or closed work orders',
    })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('returns 400 when work order is already CANCELLED', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrder,
      status: WOStatus.CANCELLED,
    })

    const response = await POST(buildRequest({ workOrderId: 'wo-1' }))

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({
      error: 'Work order is already cancelled',
    })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('returns 500 when database transaction fails', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)

    prismaMock.$transaction.mockRejectedValue(new Error('Database connection error'))

    const response = await POST(buildRequest({ workOrderId: 'wo-1' }))

    expect(response.status).toBe(500)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Internal server error' })
  })

  it('includes all routing stages in snapshot', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    workOrderVersionFindFirstMock.mockResolvedValue({ versionNumber: 1 })

    const cancelledWorkOrder = {
      ...mockWorkOrder,
      status: WOStatus.CANCELLED,
    }

    prismaMock.$transaction.mockImplementation(async (callback) => {
      const tx = {
        workOrder: { update: workOrderUpdateMock },
        workOrderVersion: {
          findFirst: workOrderVersionFindFirstMock,
          create: workOrderVersionCreateMock,
        },
        auditLog: { create: auditLogCreateMock },
      }
      return callback(tx)
    })

    workOrderUpdateMock.mockResolvedValue(cancelledWorkOrder)
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-2' })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    await POST(buildRequest({ workOrderId: 'wo-1' }))

    expect(workOrderVersionCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        snapshotData: expect.objectContaining({
          routingVersion: expect.objectContaining({
            stages: expect.arrayContaining([
              expect.objectContaining({
                code: 'KITTING',
                name: 'Kitting',
                sequence: 1,
              }),
              expect.objectContaining({
                code: 'LAMINATION',
                name: 'Lamination',
                sequence: 2,
              }),
            ]),
          }),
        }),
      }),
    })
  })

  it('starts version number at 1 when no previous versions exist', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    workOrderVersionFindFirstMock.mockResolvedValue(null) // No previous versions

    const cancelledWorkOrder = {
      ...mockWorkOrder,
      status: WOStatus.CANCELLED,
    }

    prismaMock.$transaction.mockImplementation(async (callback) => {
      const tx = {
        workOrder: { update: workOrderUpdateMock },
        workOrderVersion: {
          findFirst: workOrderVersionFindFirstMock,
          create: workOrderVersionCreateMock,
        },
        auditLog: { create: auditLogCreateMock },
      }
      return callback(tx)
    })

    workOrderUpdateMock.mockResolvedValue(cancelledWorkOrder)
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-1', versionNumber: 1 })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    await POST(buildRequest({ workOrderId: 'wo-1' }))

    expect(workOrderVersionCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        versionNumber: 1,
      }),
    })
  })
})
