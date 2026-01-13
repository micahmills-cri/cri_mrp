import { NextRequest } from 'next/server'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { Role, WOStatus, RoutingVersionStatus } from '@prisma/client'

const {
  getUserFromRequestMock,
  workOrderFindUniqueMock,
  workOrderUpdateMock,
  routingVersionUpdateMock,
  workOrderVersionFindFirstMock,
  workOrderVersionCreateMock,
  auditLogCreateMock,
  prismaTransactionMock,
} = vi.hoisted(() => ({
  getUserFromRequestMock: vi.fn(),
  workOrderFindUniqueMock: vi.fn(),
  workOrderUpdateMock: vi.fn(),
  routingVersionUpdateMock: vi.fn(),
  workOrderVersionFindFirstMock: vi.fn(),
  workOrderVersionCreateMock: vi.fn(),
  auditLogCreateMock: vi.fn(),
  prismaTransactionMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getUserFromRequest: getUserFromRequestMock,
}))

vi.mock('@/server/db/client', () => ({
  prisma: {
    $transaction: prismaTransactionMock,
    workOrder: {
      findUnique: workOrderFindUniqueMock,
      update: workOrderUpdateMock,
    },
    routingVersion: {
      update: routingVersionUpdateMock,
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
import { POST } from '../work-orders/[id]/release/route'

function buildRequest() {
  return new NextRequest('https://example.com/api/work-orders/wo-1/release', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  })
}

describe('POST /api/work-orders/[id]/release', () => {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = new Date(tomorrow)
  dayAfter.setDate(dayAfter.getDate() + 1)

  const mockWorkOrder = {
    id: 'wo-1',
    number: 'WO-2025-001',
    hullId: 'HULL-12345',
    productSku: 'LX24-BASE',
    qty: 1,
    status: WOStatus.PLANNED,
    priority: 'NORMAL',
    plannedStartDate: tomorrow,
    plannedFinishDate: dayAfter,
    routingVersionId: 'routing-1',
    currentStageIndex: 0,
    specSnapshot: {
      model: 'LX24',
      trim: 'Base',
      features: {},
    },
    routingVersion: {
      id: 'routing-1',
      model: 'LX24',
      trim: 'Base',
      version: 1,
      status: RoutingVersionStatus.DRAFT,
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
          },
        },
      ],
    },
  }

  beforeEach(() => {
    getUserFromRequestMock.mockReset()
    workOrderFindUniqueMock.mockReset()
    workOrderUpdateMock.mockReset()
    routingVersionUpdateMock.mockReset()
    workOrderVersionFindFirstMock.mockReset()
    workOrderVersionCreateMock.mockReset()
    auditLogCreateMock.mockReset()
    prismaTransactionMock.mockReset()
  })

  it('returns 200 and releases work order when valid supervisor request', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      email: 'supervisor@example.com',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)

    // Mock transaction callback
    prismaTransactionMock.mockImplementation(async (callback) => {
      const tx = {
        workOrderVersion: {
          findFirst: workOrderVersionFindFirstMock,
          create: workOrderVersionCreateMock,
        },
      }
      return callback(tx)
    })

    workOrderVersionFindFirstMock.mockResolvedValue(null) // No existing versions
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-1', versionNumber: 1 })
    routingVersionUpdateMock.mockResolvedValue({ ...mockWorkOrder.routingVersion })
    workOrderUpdateMock.mockResolvedValue({
      ...mockWorkOrder,
      status: WOStatus.RELEASED,
    })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    const response = await POST(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.success).toBe(true)
    expect(payload.message).toContain('Work order WO-2025-001 released')
    expect(payload.workOrder.status).toBe(WOStatus.RELEASED)

    // Verify version snapshot created
    expect(workOrderVersionCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workOrderId: 'wo-1',
        versionNumber: 1,
        reason: 'Work order released',
        createdBy: 'supervisor@example.com',
      }),
    })

    // Verify work order updated to RELEASED
    expect(workOrderUpdateMock).toHaveBeenCalledWith({
      where: { id: 'wo-1' },
      data: expect.objectContaining({
        status: WOStatus.RELEASED,
        currentStageIndex: 0,
      }),
    })

    // Verify audit log created
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'user-1',
        model: 'WorkOrder',
        modelId: 'wo-1',
        action: 'RELEASE',
      }),
    })
  })

  it('allows ADMIN role to release work orders', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'admin-1',
      email: 'admin@example.com',
      role: Role.ADMIN,
      departmentId: null,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    prismaTransactionMock.mockImplementation(async (callback) => {
      const tx = {
        workOrderVersion: {
          findFirst: workOrderVersionFindFirstMock,
          create: workOrderVersionCreateMock,
        },
      }
      return callback(tx)
    })
    workOrderVersionFindFirstMock.mockResolvedValue(null)
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-1', versionNumber: 1 })
    routingVersionUpdateMock.mockResolvedValue({ ...mockWorkOrder.routingVersion })
    workOrderUpdateMock.mockResolvedValue({ ...mockWorkOrder, status: WOStatus.RELEASED })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    const response = await POST(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(200)
  })

  it('increments version number when previous versions exist', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      email: 'supervisor@example.com',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    prismaTransactionMock.mockImplementation(async (callback) => {
      const tx = {
        workOrderVersion: {
          findFirst: workOrderVersionFindFirstMock,
          create: workOrderVersionCreateMock,
        },
      }
      return callback(tx)
    })
    workOrderVersionFindFirstMock.mockResolvedValue({ versionNumber: 2 }) // Version 2 exists
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-3', versionNumber: 3 })
    routingVersionUpdateMock.mockResolvedValue({ ...mockWorkOrder.routingVersion })
    workOrderUpdateMock.mockResolvedValue({ ...mockWorkOrder, status: WOStatus.RELEASED })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    await POST(buildRequest(), { params: { id: 'wo-1' } })

    // Verify version number is 3 (2 + 1)
    expect(workOrderVersionCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        versionNumber: 3,
      }),
    })
  })

  it('updates routing version status from DRAFT to RELEASED', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      email: 'supervisor@example.com',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    prismaTransactionMock.mockImplementation(async (callback) => {
      const tx = {
        workOrderVersion: {
          findFirst: workOrderVersionFindFirstMock,
          create: workOrderVersionCreateMock,
        },
      }
      return callback(tx)
    })
    workOrderVersionFindFirstMock.mockResolvedValue(null)
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-1', versionNumber: 1 })
    routingVersionUpdateMock.mockResolvedValue({
      ...mockWorkOrder.routingVersion,
      status: RoutingVersionStatus.RELEASED,
    })
    workOrderUpdateMock.mockResolvedValue({ ...mockWorkOrder, status: WOStatus.RELEASED })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    await POST(buildRequest(), { params: { id: 'wo-1' } })

    // Verify routing version updated
    expect(routingVersionUpdateMock).toHaveBeenCalledWith({
      where: { id: 'routing-1' },
      data: {
        status: RoutingVersionStatus.RELEASED,
        releasedAt: expect.any(Date),
      },
    })
  })

  it('does not update routing version if already RELEASED', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      email: 'supervisor@example.com',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    const workOrderWithReleasedRouting = {
      ...mockWorkOrder,
      routingVersion: {
        ...mockWorkOrder.routingVersion,
        status: RoutingVersionStatus.RELEASED,
      },
    }

    workOrderFindUniqueMock.mockResolvedValue(workOrderWithReleasedRouting)
    prismaTransactionMock.mockImplementation(async (callback) => {
      const tx = {
        workOrderVersion: {
          findFirst: workOrderVersionFindFirstMock,
          create: workOrderVersionCreateMock,
        },
      }
      return callback(tx)
    })
    workOrderVersionFindFirstMock.mockResolvedValue(null)
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-1', versionNumber: 1 })
    workOrderUpdateMock.mockResolvedValue({ ...mockWorkOrder, status: WOStatus.RELEASED })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    await POST(buildRequest(), { params: { id: 'wo-1' } })

    // Verify routing version NOT updated
    expect(routingVersionUpdateMock).not.toHaveBeenCalled()
  })

  it('returns 401 when user is not authenticated', async () => {
    getUserFromRequestMock.mockReturnValue(null)

    const response = await POST(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(401)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Unauthorized' })
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 403 when user is OPERATOR (not supervisor/admin)', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    const response = await POST(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(403)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Forbidden - Supervisor or Admin only' })
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 404 when work order not found', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      email: 'supervisor@example.com',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(null)

    const response = await POST(buildRequest(), { params: { id: 'wo-nonexistent' } })

    expect(response.status).toBe(404)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Work order not found' })
    expect(prismaTransactionMock).not.toHaveBeenCalled()
  })

  it('returns 400 when work order is not in PLANNED status', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      email: 'supervisor@example.com',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrder,
      status: WOStatus.IN_PROGRESS,
    })

    const response = await POST(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Work order must be in PLANNED status to release' })
    expect(prismaTransactionMock).not.toHaveBeenCalled()
  })

  it('returns 400 when plannedStartDate is missing', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      email: 'supervisor@example.com',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrder,
      plannedStartDate: null,
    })

    const response = await POST(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({
      error: 'Cannot release work order without planned start and finish dates',
    })
    expect(prismaTransactionMock).not.toHaveBeenCalled()
  })

  it('returns 400 when plannedFinishDate is missing', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      email: 'supervisor@example.com',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrder,
      plannedFinishDate: null,
    })

    const response = await POST(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({
      error: 'Cannot release work order without planned start and finish dates',
    })
    expect(prismaTransactionMock).not.toHaveBeenCalled()
  })

  it('returns 400 when start date is not before finish date', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      email: 'supervisor@example.com',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrder,
      plannedStartDate: dayAfter,
      plannedFinishDate: tomorrow, // finish before start
    })

    const response = await POST(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({
      error: 'Planned start date must be before planned finish date',
    })
    expect(prismaTransactionMock).not.toHaveBeenCalled()
  })

  it('returns 400 when start date is more than 1 day in the past', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      email: 'supervisor@example.com',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    const twoDaysAgo = new Date(today)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrder,
      plannedStartDate: twoDaysAgo,
      plannedFinishDate: tomorrow,
    })

    const response = await POST(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({
      error: 'Planned start date cannot be more than 1 day in the past',
    })
    expect(prismaTransactionMock).not.toHaveBeenCalled()
  })

  it('includes routing version snapshot in work order version', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      email: 'supervisor@example.com',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    prismaTransactionMock.mockImplementation(async (callback) => {
      const tx = {
        workOrderVersion: {
          findFirst: workOrderVersionFindFirstMock,
          create: workOrderVersionCreateMock,
        },
      }
      return callback(tx)
    })
    workOrderVersionFindFirstMock.mockResolvedValue(null)
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-1', versionNumber: 1 })
    routingVersionUpdateMock.mockResolvedValue({ ...mockWorkOrder.routingVersion })
    workOrderUpdateMock.mockResolvedValue({ ...mockWorkOrder, status: WOStatus.RELEASED })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    await POST(buildRequest(), { params: { id: 'wo-1' } })

    // Verify snapshot includes routing version details
    expect(workOrderVersionCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        snapshotData: expect.objectContaining({
          status: 'RELEASED',
          routingVersion: expect.objectContaining({
            model: 'LX24',
            trim: 'Base',
            version: 1,
            stages: expect.arrayContaining([
              expect.objectContaining({
                code: 'KITTING',
                name: 'Kitting',
              }),
            ]),
          }),
        }),
      }),
    })
  })

  it('returns 500 when database operation fails', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      email: 'supervisor@example.com',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindUniqueMock.mockRejectedValue(new Error('Database error'))

    const response = await POST(buildRequest(), { params: { id: 'wo-1' } })

    expect(response.status).toBe(500)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Internal server error' })
  })
})
