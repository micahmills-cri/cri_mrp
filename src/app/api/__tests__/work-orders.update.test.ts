import { NextRequest } from 'next/server'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { Role, WOStatus } from '@prisma/client'

const {
  getUserFromRequestMock,
  workOrderFindUniqueMock,
  workOrderUpdateMock,
  workOrderVersionFindFirstMock,
  workOrderVersionCreateMock,
  auditLogCreateManyMock,
  prismaMock,
} = vi.hoisted(() => ({
  getUserFromRequestMock: vi.fn(),
  workOrderFindUniqueMock: vi.fn(),
  workOrderUpdateMock: vi.fn(),
  workOrderVersionFindFirstMock: vi.fn(),
  workOrderVersionCreateMock: vi.fn(),
  auditLogCreateManyMock: vi.fn(),
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
      createMany: auditLogCreateManyMock,
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

vi.mock('@/server/work-orders/snapshot-metadata', () => ({
  WORK_ORDER_SNAPSHOT_SCHEMA_HASH: 'test-schema-hash-v1',
}))

// Import after mocks
import { PATCH } from '../work-orders/[id]/route'

function buildRequest(body: unknown, id: string) {
  return new NextRequest(`https://example.com/api/work-orders/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/work-orders/[id]', () => {
  const mockWorkOrder = {
    id: 'wo-1',
    number: 'WO-2025-001',
    hullId: 'HULL-12345',
    productSku: 'LX24-SPORT-001',
    qty: 1,
    status: WOStatus.PLANNED,
    priority: 'NORMAL',
    plannedStartDate: new Date('2025-06-01'),
    plannedFinishDate: new Date('2025-06-30'),
    routingVersionId: 'routing-1',
    currentStageIndex: 0,
    specSnapshot: {},
    createdAt: new Date('2025-01-01'),
  }

  const mockRoutingVersion = {
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
    ],
  }

  beforeEach(() => {
    getUserFromRequestMock.mockReset()
    workOrderFindUniqueMock.mockReset()
    workOrderUpdateMock.mockReset()
    workOrderVersionFindFirstMock.mockReset()
    workOrderVersionCreateMock.mockReset()
    auditLogCreateManyMock.mockReset()
    prismaMock.$transaction.mockReset()
  })

  it('returns 200 and updates priority when SUPERVISOR provides valid data', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      email: 'supervisor@example.com',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    workOrderVersionFindFirstMock.mockResolvedValue({
      id: 'version-1',
      versionNumber: 1,
    })

    const updatedWorkOrder = {
      ...mockWorkOrder,
      priority: 'HIGH',
      routingVersion: mockRoutingVersion,
    }

    prismaMock.$transaction.mockImplementation(async (callback) => {
      const tx = {
        workOrder: { update: workOrderUpdateMock },
        workOrderVersion: {
          findFirst: workOrderVersionFindFirstMock,
          create: workOrderVersionCreateMock,
        },
        auditLog: { createMany: auditLogCreateManyMock },
      }
      return callback(tx)
    })

    workOrderUpdateMock.mockResolvedValue(updatedWorkOrder)
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-2', versionNumber: 2 })
    auditLogCreateManyMock.mockResolvedValue({ count: 1 })

    const response = await PATCH(buildRequest({ priority: 'HIGH' }, 'wo-1'), {
      params: { id: 'wo-1' },
    })

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.success).toBe(true)
    expect(payload.workOrder.priority).toBe('HIGH')
    expect(payload.changes).toEqual(['Priority changed from NORMAL to HIGH'])

    // Verify WorkOrderVersion creation with schema_hash
    expect(workOrderVersionCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workOrderId: 'wo-1',
        versionNumber: 2,
        snapshotData: expect.objectContaining({
          schema_hash: 'test-schema-hash-v1',
          versionNumber: 2,
          priority: 'HIGH',
        }),
        reason: 'Priority changed from NORMAL to HIGH',
        createdBy: 'supervisor@example.com',
      }),
    })

    // Verify AuditLog creation
    expect(auditLogCreateManyMock).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          actorId: 'user-1',
          action: 'UPDATE',
          model: 'WorkOrder',
          modelId: 'wo-1',
        }),
      ]),
    })
  })

  it('returns 200 and updates multiple fields in PLANNED status', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'admin-1',
      email: 'admin@example.com',
      role: Role.ADMIN,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    workOrderVersionFindFirstMock.mockResolvedValue({
      id: 'version-1',
      versionNumber: 1,
    })

    const updatedWorkOrder = {
      ...mockWorkOrder,
      hullId: 'HULL-99999',
      productSku: 'LX24-LUXURY-001',
      qty: 2,
      priority: 'CRITICAL',
      routingVersion: mockRoutingVersion,
    }

    prismaMock.$transaction.mockImplementation(async (callback) => {
      const tx = {
        workOrder: { update: workOrderUpdateMock },
        workOrderVersion: {
          findFirst: workOrderVersionFindFirstMock,
          create: workOrderVersionCreateMock,
        },
        auditLog: { createMany: auditLogCreateManyMock },
      }
      return callback(tx)
    })

    workOrderUpdateMock.mockResolvedValue(updatedWorkOrder)
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-2' })
    auditLogCreateManyMock.mockResolvedValue({ count: 4 })

    const response = await PATCH(
      buildRequest(
        {
          hullId: 'HULL-99999',
          productSku: 'LX24-LUXURY-001',
          qty: 2,
          priority: 'CRITICAL',
        },
        'wo-1'
      ),
      { params: { id: 'wo-1' } }
    )

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.success).toBe(true)
    expect(payload.changes).toHaveLength(4)
    expect(payload.changes).toContain('Hull ID changed from HULL-12345 to HULL-99999')
    expect(payload.changes).toContain('Product SKU changed from LX24-SPORT-001 to LX24-LUXURY-001')
    expect(payload.changes).toContain('Quantity changed from 1 to 2')
    expect(payload.changes).toContain('Priority changed from NORMAL to CRITICAL')
  })

  it('returns 401 when user is not authenticated', async () => {
    getUserFromRequestMock.mockReturnValue(null)

    const response = await PATCH(buildRequest({ priority: 'HIGH' }, 'wo-1'), {
      params: { id: 'wo-1' },
    })

    expect(response.status).toBe(401)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Unauthorized' })
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 403 when OPERATOR tries to update work order', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'operator-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    const response = await PATCH(buildRequest({ priority: 'HIGH' }, 'wo-1'), {
      params: { id: 'wo-1' },
    })

    expect(response.status).toBe(403)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Insufficient permissions' })
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 404 when work order does not exist', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(null)

    const response = await PATCH(buildRequest({ priority: 'HIGH' }, 'wo-nonexistent'), {
      params: { id: 'wo-nonexistent' },
    })

    expect(response.status).toBe(404)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Work order not found' })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('returns 400 when validation fails (invalid priority)', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    const response = await PATCH(buildRequest({ priority: 'INVALID' }, 'wo-1'), {
      params: { id: 'wo-1' },
    })

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload.error).toBe('Validation failed')
    expect(payload.errors).toBeDefined()
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 400 when validation fails (negative quantity)', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    const response = await PATCH(buildRequest({ qty: -5 }, 'wo-1'), {
      params: { id: 'wo-1' },
    })

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload.error).toBe('Validation failed')
    expect(workOrderFindUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 400 when planned start date is after finish date', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)

    const response = await PATCH(
      buildRequest(
        {
          plannedStartDate: new Date('2025-07-01').toISOString(),
          plannedFinishDate: new Date('2025-06-01').toISOString(),
        },
        'wo-1'
      ),
      { params: { id: 'wo-1' } }
    )

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({
      error: 'Planned start date must be before planned finish date',
    })
  })

  it('returns 400 when trying to edit non-editable status (COMPLETED)', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrder,
      status: WOStatus.COMPLETED,
    })

    const response = await PATCH(buildRequest({ priority: 'HIGH' }, 'wo-1'), {
      params: { id: 'wo-1' },
    })

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({
      error: 'Work order can only be edited while active',
    })
  })

  it('returns 400 when trying to change hullId in active status (RELEASED)', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrder,
      status: WOStatus.RELEASED,
    })

    const response = await PATCH(buildRequest({ hullId: 'HULL-NEW' }, 'wo-1'), {
      params: { id: 'wo-1' },
    })

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({
      error: 'Hull cannot be changed once the work order is active',
    })
  })

  it('returns 400 when trying to change productSku in active status (IN_PROGRESS)', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrder,
      status: WOStatus.IN_PROGRESS,
    })

    const response = await PATCH(buildRequest({ productSku: 'NEW-SKU' }, 'wo-1'), {
      params: { id: 'wo-1' },
    })

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({
      error: 'Product SKU cannot be changed once the work order is active',
    })
  })

  it('returns 400 when trying to change qty in active status (HOLD)', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrder,
      status: WOStatus.HOLD,
    })

    const response = await PATCH(buildRequest({ qty: 5 }, 'wo-1'), {
      params: { id: 'wo-1' },
    })

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({
      error: 'Quantity cannot be changed once the work order is active',
    })
  })

  it('allows hullId change when status is CANCELLED', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      email: 'user@example.com',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue({
      ...mockWorkOrder,
      status: WOStatus.CANCELLED,
    })

    workOrderVersionFindFirstMock.mockResolvedValue({ versionNumber: 3 })

    const updatedWorkOrder = {
      ...mockWorkOrder,
      hullId: 'HULL-UPDATED',
      status: WOStatus.CANCELLED,
      routingVersion: mockRoutingVersion,
    }

    prismaMock.$transaction.mockImplementation(async (callback) => {
      const tx = {
        workOrder: { update: workOrderUpdateMock },
        workOrderVersion: {
          findFirst: workOrderVersionFindFirstMock,
          create: workOrderVersionCreateMock,
        },
        auditLog: { createMany: auditLogCreateManyMock },
      }
      return callback(tx)
    })

    workOrderUpdateMock.mockResolvedValue(updatedWorkOrder)
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-4', versionNumber: 4 })
    auditLogCreateManyMock.mockResolvedValue({ count: 1 })

    const response = await PATCH(buildRequest({ hullId: 'HULL-UPDATED' }, 'wo-1'), {
      params: { id: 'wo-1' },
    })

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.success).toBe(true)
    expect(payload.changes).toContain('Hull ID changed from HULL-12345 to HULL-UPDATED')
  })

  it('returns 200 with no changes when no fields are modified', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)

    const response = await PATCH(buildRequest({ priority: 'NORMAL' }, 'wo-1'), {
      params: { id: 'wo-1' },
    })

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.success).toBe(true)
    expect(payload.changes).toEqual(['No changes detected'])
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('updates planned dates and clears them with null', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      email: 'user@example.com',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    workOrderVersionFindFirstMock.mockResolvedValue({ versionNumber: 1 })

    const updatedWorkOrder = {
      ...mockWorkOrder,
      plannedStartDate: null,
      plannedFinishDate: null,
      routingVersion: mockRoutingVersion,
    }

    prismaMock.$transaction.mockImplementation(async (callback) => {
      const tx = {
        workOrder: { update: workOrderUpdateMock },
        workOrderVersion: {
          findFirst: workOrderVersionFindFirstMock,
          create: workOrderVersionCreateMock,
        },
        auditLog: { createMany: auditLogCreateManyMock },
      }
      return callback(tx)
    })

    workOrderUpdateMock.mockResolvedValue(updatedWorkOrder)
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-2' })
    auditLogCreateManyMock.mockResolvedValue({ count: 2 })

    const response = await PATCH(
      buildRequest({ plannedStartDate: null, plannedFinishDate: null }, 'wo-1'),
      { params: { id: 'wo-1' } }
    )

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.success).toBe(true)
    expect(payload.changes).toHaveLength(2)
  })

  it('returns 500 when database transaction fails', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      email: 'user@example.com',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)

    prismaMock.$transaction.mockRejectedValue(new Error('Database error'))

    const response = await PATCH(buildRequest({ priority: 'HIGH' }, 'wo-1'), {
      params: { id: 'wo-1' },
    })

    expect(response.status).toBe(500)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Internal server error' })
  })

  it('increments version number correctly', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      email: 'user@example.com',
      role: Role.SUPERVISOR,
    })

    workOrderFindUniqueMock.mockResolvedValue(mockWorkOrder)
    workOrderVersionFindFirstMock.mockResolvedValue({
      id: 'version-5',
      versionNumber: 5,
    })

    const updatedWorkOrder = {
      ...mockWorkOrder,
      priority: 'CRITICAL',
      routingVersion: mockRoutingVersion,
    }

    prismaMock.$transaction.mockImplementation(async (callback) => {
      const tx = {
        workOrder: { update: workOrderUpdateMock },
        workOrderVersion: {
          findFirst: workOrderVersionFindFirstMock,
          create: workOrderVersionCreateMock,
        },
        auditLog: { createMany: auditLogCreateManyMock },
      }
      return callback(tx)
    })

    workOrderUpdateMock.mockResolvedValue(updatedWorkOrder)
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-6', versionNumber: 6 })
    auditLogCreateManyMock.mockResolvedValue({ count: 1 })

    await PATCH(buildRequest({ priority: 'CRITICAL' }, 'wo-1'), {
      params: { id: 'wo-1' },
    })

    expect(workOrderVersionCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        versionNumber: 6,
        snapshotData: expect.objectContaining({
          versionNumber: 6,
        }),
      }),
    })
  })
})
