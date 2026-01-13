import { NextRequest } from 'next/server'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { Role, WOStatus } from '@prisma/client'

const {
  getUserFromRequestMock,
  workOrderFindManyMock,
  workOrderFindUniqueMock,
} = vi.hoisted(() => ({
  getUserFromRequestMock: vi.fn(),
  workOrderFindManyMock: vi.fn(),
  workOrderFindUniqueMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getUserFromRequest: getUserFromRequestMock,
}))

vi.mock('@/server/db/client', () => ({
  prisma: {
    workOrder: {
      findMany: workOrderFindManyMock,
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
import { GET } from '../work-orders/route'

function buildRequest(searchParams?: Record<string, string>) {
  const url = new URL('https://example.com/api/work-orders')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  return new NextRequest(url, {
    method: 'GET',
  })
}

describe('GET /api/work-orders (list)', () => {
  const mockWorkOrders = [
    {
      id: 'wo-1',
      number: 'WO-2025-001',
      hullId: 'HULL-001',
      productSku: 'LX24-BASE',
      qty: 1,
      status: WOStatus.IN_PROGRESS,
      priority: 'NORMAL',
      currentStageIndex: 1,
      createdAt: new Date('2025-01-10'),
      routingVersion: {
        id: 'routing-1',
        model: 'LX24',
        trim: 'Base',
        version: 1,
      },
      _count: {
        notes: 3,
        attachments: 2,
      },
    },
    {
      id: 'wo-2',
      number: 'WO-2025-002',
      hullId: 'HULL-002',
      productSku: 'LX26-SPORT',
      qty: 1,
      status: WOStatus.RELEASED,
      priority: 'HIGH',
      currentStageIndex: 0,
      createdAt: new Date('2025-01-09'),
      routingVersion: {
        id: 'routing-2',
        model: 'LX26',
        trim: 'Sport',
        version: 1,
      },
      _count: {
        notes: 1,
        attachments: 0,
      },
    },
  ]

  beforeEach(() => {
    getUserFromRequestMock.mockReset()
    workOrderFindManyMock.mockReset()
    workOrderFindUniqueMock.mockReset()
  })

  it('returns 200 and list of work orders for authenticated user', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindManyMock.mockResolvedValue(mockWorkOrders)

    const response = await GET(buildRequest())

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.data).toHaveLength(2)
    expect(payload.data[0].id).toBe('wo-1')
    expect(payload.data[0].number).toBe('WO-2025-001')
    expect(payload.data[0].status).toBe(WOStatus.IN_PROGRESS)
    expect(payload.data[1].id).toBe('wo-2')
    expect(payload.nextCursor).toBeNull()
    expect(payload.hasMore).toBe(false)
  })

  it('uses default limit of 20 when not specified', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindManyMock.mockResolvedValue(mockWorkOrders)

    await GET(buildRequest())

    // Verify findMany called with limit + 1 (21) to determine hasMore
    expect(workOrderFindManyMock).toHaveBeenCalledWith({
      take: 21,
      skip: 0,
      cursor: undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        routingVersion: true,
        _count: {
          select: {
            notes: true,
            attachments: true,
          },
        },
      },
    })
  })

  it('supports custom limit via query parameter', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindManyMock.mockResolvedValue([mockWorkOrders[0]])

    await GET(buildRequest({ limit: '10' }))

    // Verify findMany called with limit + 1 (11)
    expect(workOrderFindManyMock).toHaveBeenCalledWith({
      take: 11,
      skip: 0,
      cursor: undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        routingVersion: true,
        _count: {
          select: {
            notes: true,
            attachments: true,
          },
        },
      },
    })
  })

  it('supports cursor-based pagination', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindManyMock.mockResolvedValue([mockWorkOrders[1]])

    await GET(buildRequest({ cursor: 'wo-1', limit: '10' }))

    // Verify cursor used and skip set to 1
    expect(workOrderFindManyMock).toHaveBeenCalledWith({
      take: 11,
      skip: 1,
      cursor: { id: 'wo-1' },
      orderBy: { createdAt: 'desc' },
      include: {
        routingVersion: true,
        _count: {
          select: {
            notes: true,
            attachments: true,
          },
        },
      },
    })
  })

  it('indicates hasMore when more records available', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    // Return limit + 1 items to indicate more available
    const manyWorkOrders = Array.from({ length: 21 }, (_, i) => ({
      ...mockWorkOrders[0],
      id: `wo-${i + 1}`,
      number: `WO-2025-${String(i + 1).padStart(3, '0')}`,
    }))

    workOrderFindManyMock.mockResolvedValue(manyWorkOrders)

    const response = await GET(buildRequest({ limit: '20' }))

    const payload = await response.json()

    // Should return only 20 items (limit)
    expect(payload.data).toHaveLength(20)
    expect(payload.hasMore).toBe(true)
    expect(payload.nextCursor).toBe('wo-20')
  })

  it('orders work orders by createdAt desc (newest first)', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindManyMock.mockResolvedValue(mockWorkOrders)

    await GET(buildRequest())

    expect(workOrderFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      })
    )
  })

  it('includes routing version and counts in response', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindManyMock.mockResolvedValue(mockWorkOrders)

    const response = await GET(buildRequest())

    const payload = await response.json()

    expect(payload.data[0]).toHaveProperty('routingVersion')
    expect(payload.data[0]).toHaveProperty('_count')
    expect(payload.data[0]._count).toEqual({
      notes: 3,
      attachments: 2,
    })
  })

  it('returns empty list when no work orders exist', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindManyMock.mockResolvedValue([])

    const response = await GET(buildRequest())

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.data).toEqual([])
    expect(payload.hasMore).toBe(false)
    expect(payload.nextCursor).toBeNull()
  })

  it('returns 401 when user is not authenticated', async () => {
    getUserFromRequestMock.mockReturnValue(null)

    const response = await GET(buildRequest())

    expect(response.status).toBe(401)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Unauthorized' })
    expect(workOrderFindManyMock).not.toHaveBeenCalled()
  })

  it('works for all roles (ADMIN, SUPERVISOR, OPERATOR)', async () => {
    const roles = [Role.ADMIN, Role.SUPERVISOR, Role.OPERATOR]

    for (const role of roles) {
      getUserFromRequestMock.mockReset()
      workOrderFindManyMock.mockReset()

      getUserFromRequestMock.mockReturnValue({
        userId: `user-${role}`,
        role,
        departmentId: role === Role.OPERATOR ? 'dept-1' : null,
      })

      workOrderFindManyMock.mockResolvedValue([mockWorkOrders[0]])

      const response = await GET(buildRequest())

      expect(response.status).toBe(200)
    }
  })

  it('returns 500 when database operation fails', async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    })

    workOrderFindManyMock.mockRejectedValue(new Error('Database error'))

    const response = await GET(buildRequest())

    expect(response.status).toBe(500)
    const payload = await response.json()

    expect(payload).toEqual({ error: 'Internal server error' })
  })
})
