import { NextRequest } from 'next/server'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { Role, WOStatus } from '@prisma/client'

const {
  getUserFromRequestMock,
  workOrderCreateMock,
  workOrderVersionCreateMock,
  auditLogCreateMock,
  routingVersionFindUniqueMock,
} = vi.hoisted(() => ({
  getUserFromRequestMock: vi.fn(),
  workOrderCreateMock: vi.fn(),
  workOrderVersionCreateMock: vi.fn(),
  auditLogCreateMock: vi.fn(),
  routingVersionFindUniqueMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getUserFromRequest: getUserFromRequestMock,
}))

vi.mock('@/server/db/client', () => ({
  prisma: {
    workOrder: { create: workOrderCreateMock },
    workOrderVersion: { create: workOrderVersionCreateMock },
    auditLog: { create: auditLogCreateMock },
    routingVersion: { findUnique: routingVersionFindUniqueMock },
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
import { POST } from '../work-orders/route'

function buildRequest(body: unknown) {
  return new NextRequest('https://example.com/api/work-orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/work-orders', () => {
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
  }

  const validRequestBody = {
    hullId: 'HULL-12345',
    productSku: 'LX24-SPORT-001',
    qty: 1,
    model: 'LX24',
    trim: 'Sport',
    features: { color: 'red', engine: 'V6' },
    routingVersionId: 'routing-1',
    priority: 'NORMAL',
    plannedStartDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    plannedFinishDate: new Date(Date.now() + 86400000 * 7).toISOString(), // Next week
  }

  beforeEach(() => {
    getUserFromRequestMock.mockReset()
    workOrderCreateMock.mockReset()
    workOrderVersionCreateMock.mockReset()
    auditLogCreateMock.mockReset()
    routingVersionFindUniqueMock.mockReset()
  })

  it('returns 200 and creates work order when SUPERVISOR provides valid data', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: null,
    })

    routingVersionFindUniqueMock.mockResolvedValue(mockRoutingVersion)

    const mockWorkOrder = {
      id: 'wo-1',
      number: 'WO-2025-001',
      hullId: 'HULL-12345',
      productSku: 'LX24-SPORT-001',
      qty: 1,
      status: WOStatus.PLANNED,
      priority: 'NORMAL',
      plannedStartDate: new Date(validRequestBody.plannedStartDate),
      plannedFinishDate: new Date(validRequestBody.plannedFinishDate),
      routingVersionId: 'routing-1',
      currentStageIndex: 0,
      specSnapshot: {
        model: 'LX24',
        trim: 'Sport',
        features: { color: 'red', engine: 'V6' },
        routingVersionId: 'routing-1',
        stages: mockRoutingVersion.stages,
      },
    }

    workOrderCreateMock.mockResolvedValue(mockWorkOrder)
    workOrderVersionCreateMock.mockResolvedValue({
      id: 'version-1',
      workOrderId: 'wo-1',
      versionNumber: 1,
    })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-1' })

    const response = await POST(
      buildRequest({ ...validRequestBody, number: 'WO-2025-001' })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload).toEqual({
      success: true,
      workOrder: {
        id: 'wo-1',
        number: 'WO-2025-001',
        hullId: 'HULL-12345',
        status: WOStatus.PLANNED,
      },
    })

    // Verify routing version lookup
    expect(routingVersionFindUniqueMock).toHaveBeenCalledWith({
      where: { id: 'routing-1' },
      include: {
        stages: {
          where: { enabled: true },
          orderBy: { sequence: 'asc' },
        },
      },
    })

    // Verify work order creation
    expect(workOrderCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        number: 'WO-2025-001',
        hullId: 'HULL-12345',
        status: WOStatus.PLANNED,
        priority: 'NORMAL',
        currentStageIndex: 0,
        routingVersionId: 'routing-1',
        specSnapshot: expect.objectContaining({
          model: 'LX24',
          trim: 'Sport',
          routingVersionId: 'routing-1',
        }),
      }),
    })

    // Verify WorkOrderVersion creation
    expect(workOrderVersionCreateMock).toHaveBeenCalledWith({
      data: {
        workOrderId: 'wo-1',
        versionNumber: 1,
        snapshotData: expect.objectContaining({
          number: 'WO-2025-001',
          status: WOStatus.PLANNED,
        }),
        reason: 'Initial creation',
        createdBy: 'user-1',
      },
    })

    // Verify AuditLog creation
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: {
        actorId: 'user-1',
        model: 'WorkOrder',
        modelId: 'wo-1',
        action: 'CREATE',
        after: mockWorkOrder,
      },
    })
  })

  it('returns 200 and creates work order when ADMIN provides valid data', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'admin-1',
      role: Role.ADMIN,
      departmentId: null,
    })

    routingVersionFindUniqueMock.mockResolvedValue(mockRoutingVersion)

    const mockWorkOrder = {
      id: 'wo-2',
      number: 'WO-2025-002',
      hullId: 'HULL-54321',
      productSku: 'LX24-SPORT-002',
      qty: 2,
      status: WOStatus.PLANNED,
      priority: 'HIGH',
      plannedStartDate: new Date(validRequestBody.plannedStartDate),
      plannedFinishDate: new Date(validRequestBody.plannedFinishDate),
      routingVersionId: 'routing-1',
      currentStageIndex: 0,
      specSnapshot: {},
    }

    workOrderCreateMock.mockResolvedValue(mockWorkOrder)
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-2' })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-2' })

    const response = await POST(
      buildRequest({
        ...validRequestBody,
        hullId: 'HULL-54321',
        number: 'WO-2025-002',
        qty: 2,
        priority: 'HIGH',
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.success).toBe(true)
    expect(payload.workOrder.number).toBe('WO-2025-002')
  })

  it('auto-generates work order number when not provided', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: null,
    })

    routingVersionFindUniqueMock.mockResolvedValue(mockRoutingVersion)

    workOrderCreateMock.mockResolvedValue({
      id: 'wo-3',
      number: expect.stringMatching(/^WO-\d+-[A-Z0-9]+$/),
      hullId: 'HULL-AUTO',
      status: WOStatus.PLANNED,
    })
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-3' })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-3' })

    const response = await POST(
      buildRequest({
        ...validRequestBody,
        hullId: 'HULL-AUTO',
        // No number provided
      })
    )

    expect(response.status).toBe(200)

    // Verify auto-generated number format
    expect(workOrderCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        number: expect.stringMatching(/^WO-\d+-[A-Z0-9]+$/),
      }),
    })
  })

  it('returns 401 when user is not authenticated', async () => {
    getUserFromRequestMock.mockReturnValue(null)

    const response = await POST(buildRequest(validRequestBody))

    expect(response.status).toBe(401)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Unauthorized' })
    expect(routingVersionFindUniqueMock).not.toHaveBeenCalled()
    expect(workOrderCreateMock).not.toHaveBeenCalled()
  })

  it('returns 403 when OPERATOR tries to create work order', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'operator-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    const response = await POST(buildRequest(validRequestBody))

    expect(response.status).toBe(403)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Forbidden - Supervisor or Admin only' })
    expect(routingVersionFindUniqueMock).not.toHaveBeenCalled()
    expect(workOrderCreateMock).not.toHaveBeenCalled()
  })

  it('returns 400 when hullId is missing', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: null,
    })

    const response = await POST(
      buildRequest({
        ...validRequestBody,
        hullId: '',
      })
    )

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload.error).toBe('Invalid request data')
    expect(payload.details).toBeDefined()
    expect(workOrderCreateMock).not.toHaveBeenCalled()
  })

  it('returns 400 when model is missing', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: null,
    })

    const response = await POST(
      buildRequest({
        ...validRequestBody,
        model: '',
      })
    )

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload.error).toBe('Invalid request data')
    expect(workOrderCreateMock).not.toHaveBeenCalled()
  })

  it('returns 400 when routingVersionId is missing', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: null,
    })

    const { routingVersionId, ...bodyWithoutRouting } = validRequestBody

    const response = await POST(buildRequest(bodyWithoutRouting))

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload.error).toBe('Invalid request data')
    expect(workOrderCreateMock).not.toHaveBeenCalled()
  })

  it('returns 400 when planned start date is after finish date', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: null,
    })

    const response = await POST(
      buildRequest({
        ...validRequestBody,
        plannedStartDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        plannedFinishDate: new Date(Date.now() + 86400000).toISOString(),
      })
    )

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({
      error: 'Planned start date must be before planned finish date',
    })
    expect(workOrderCreateMock).not.toHaveBeenCalled()
  })

  it('returns 400 when planned start date is in the past', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: null,
    })

    const response = await POST(
      buildRequest({
        ...validRequestBody,
        plannedStartDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        plannedFinishDate: new Date(Date.now() + 86400000).toISOString(),
      })
    )

    expect(response.status).toBe(400)
    const payload = await response.json()

    expect(payload).toEqual({
      error: 'Planned start date must be in the future',
    })
    expect(workOrderCreateMock).not.toHaveBeenCalled()
  })

  it('returns 404 when routing version does not exist', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: null,
    })

    routingVersionFindUniqueMock.mockResolvedValue(null)

    const response = await POST(buildRequest(validRequestBody))

    expect(response.status).toBe(404)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Routing version not found' })
    expect(workOrderCreateMock).not.toHaveBeenCalled()
  })

  it('returns 500 when database create operation fails', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: null,
    })

    routingVersionFindUniqueMock.mockResolvedValue(mockRoutingVersion)
    workOrderCreateMock.mockRejectedValue(new Error('Database connection failed'))

    const response = await POST(buildRequest(validRequestBody))

    expect(response.status).toBe(500)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Internal server error' })
  })

  it('handles optional fields correctly', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: null,
    })

    routingVersionFindUniqueMock.mockResolvedValue(mockRoutingVersion)

    const mockWorkOrder = {
      id: 'wo-minimal',
      number: 'WO-MINIMAL',
      hullId: 'HULL-MIN',
      productSku: '',
      qty: 1,
      status: WOStatus.PLANNED,
      priority: 'NORMAL',
      plannedStartDate: null,
      plannedFinishDate: null,
      routingVersionId: 'routing-1',
      currentStageIndex: 0,
      specSnapshot: {},
    }

    workOrderCreateMock.mockResolvedValue(mockWorkOrder)
    workOrderVersionCreateMock.mockResolvedValue({ id: 'version-min' })
    auditLogCreateMock.mockResolvedValue({ id: 'audit-min' })

    const response = await POST(
      buildRequest({
        hullId: 'HULL-MIN',
        model: 'LX24',
        routingVersionId: 'routing-1',
        // Optional fields omitted: trim, features, plannedStartDate, plannedFinishDate, priority, productSku, qty
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.success).toBe(true)
  })
})
