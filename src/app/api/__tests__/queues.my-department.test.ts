import { NextRequest } from 'next/server'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { WOStatus } from '@prisma/client'

const { findManyMock, findUniqueMock, getUserFromRequestMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
  getUserFromRequestMock: vi.fn(),
}))

vi.mock('@/server/db/client', () => ({
  prisma: {
    workOrder: { findMany: findManyMock },
    department: { findUnique: findUniqueMock },
  },
}))

vi.mock('@/lib/auth', () => ({
  getUserFromRequest: getUserFromRequestMock,
}))

// Import after mocks so the handler wires up the mocked modules.
import { GET } from '../queues/my-department/route'

function buildRequest(url: string) {
  return new NextRequest(url)
}

describe('GET /api/queues/my-department', () => {
  beforeEach(() => {
    findManyMock.mockReset()
    findUniqueMock.mockReset()
    getUserFromRequestMock.mockReset()
  })

  it('returns 401 when the request has no authenticated user', async () => {
    getUserFromRequestMock.mockReturnValue(null)

    const response = await GET(buildRequest('https://example.com/api/queues/my-department'))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
    expect(findManyMock).not.toHaveBeenCalled()
    expect(findUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 400 when no department can be resolved', async () => {
    getUserFromRequestMock.mockReturnValue({ userId: 'user-1', role: 'OPERATOR', departmentId: null })

    const response = await GET(buildRequest('https://example.com/api/queues/my-department'))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'No department specified' })
    expect(findManyMock).not.toHaveBeenCalled()
  })

  it('filters work orders to the selected department and returns queue metadata', async () => {
    const departmentId = 'dept-1'
    getUserFromRequestMock.mockReturnValue({
      userId: 'user-1',
      role: 'OPERATOR',
      departmentId,
    })

    findManyMock.mockResolvedValue([
      {
        id: 'wo-1',
        number: 'WO-1',
        hullId: 'HULL-1',
        productSku: 'SKU-1',
        status: WOStatus.RELEASED,
        qty: 3,
        currentStageIndex: 0,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        routingVersion: {
          stages: [
            {
              id: 'stage-1',
              code: 'CUT',
              name: 'Cutting',
              sequence: 1,
              enabled: true,
              workCenter: {
                id: 'wc-1',
                name: 'Cutting Center',
                department: { id: departmentId, name: 'Cutting' },
                stations: [
                  { id: 'station-1', code: 'CUT-1', name: 'Saw 1', isActive: true },
                ],
              },
            },
          ],
        },
        woStageLogs: [
          {
            event: 'START',
            createdAt: new Date('2025-01-01T12:00:00Z'),
            station: { code: 'CUT-1' },
            user: { email: 'operator@example.com' },
          },
        ],
      },
      {
        id: 'wo-2',
        number: 'WO-2',
        hullId: 'HULL-2',
        productSku: 'SKU-2',
        status: WOStatus.RELEASED,
        qty: 1,
        currentStageIndex: 0,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        routingVersion: {
          stages: [
            {
              id: 'stage-2',
              code: 'PAINT',
              name: 'Painting',
              sequence: 1,
              enabled: true,
              workCenter: {
                id: 'wc-2',
                name: 'Painting Center',
                department: { id: 'dept-2', name: 'Paint' },
                stations: [
                  { id: 'station-2', code: 'PAINT-1', name: 'Booth 1', isActive: true },
                ],
              },
            },
          ],
        },
        woStageLogs: [],
      },
    ])

    findUniqueMock.mockResolvedValue({ id: departmentId, name: 'Cutting' })

    const response = await GET(buildRequest('https://example.com/api/queues/my-department'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(findManyMock).toHaveBeenCalledTimes(1)
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: departmentId },
      select: { id: true, name: true },
    })

    expect(payload.queue).toHaveLength(1)
    expect(payload.queue[0]).toMatchObject({
      id: 'wo-1',
      number: 'WO-1',
      status: WOStatus.RELEASED,
      currentStage: {
        id: 'stage-1',
        code: 'CUT',
        workCenter: { id: 'wc-1', name: 'Cutting Center' },
      },
      lastEvent: {
        event: 'START',
        station: 'CUT-1',
        user: 'operator@example.com',
      },
    })
    expect(payload.department).toEqual({ id: departmentId, name: 'Cutting' })
    expect(payload.totalReady).toBe(1)
    expect(payload.totalInProgress).toBe(0)
  })
})
