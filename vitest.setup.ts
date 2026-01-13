import '@testing-library/jest-dom'
import { vi } from 'vitest'

const fallbackEnums = {
  Role: {
    ADMIN: 'ADMIN',
    SUPERVISOR: 'SUPERVISOR',
    OPERATOR: 'OPERATOR',
  } as const,
  WOStatus: {
    PLANNED: 'PLANNED',
    RELEASED: 'RELEASED',
    IN_PROGRESS: 'IN_PROGRESS',
    HOLD: 'HOLD',
    COMPLETED: 'COMPLETED',
    CLOSED: 'CLOSED',
    CANCELLED: 'CANCELLED',
  } as const,
  WOPriority: {
    LOW: 'LOW',
    NORMAL: 'NORMAL',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL',
  } as const,
  WOEvent: {
    START: 'START',
    PAUSE: 'PAUSE',
    COMPLETE: 'COMPLETE',
    RESUME: 'RESUME',
  } as const,
  RoutingVersionStatus: {
    DRAFT: 'DRAFT',
    RELEASED: 'RELEASED',
    ARCHIVED: 'ARCHIVED',
  } as const,
}

vi.mock('@prisma/client', async () => {
  try {
    const actual = await vi.importActual<typeof import('@prisma/client')>('@prisma/client')

    return {
      ...actual,
      Prisma: {
        ...actual.Prisma,
        Role: actual.Prisma?.Role ?? fallbackEnums.Role,
        WOStatus: actual.Prisma?.WOStatus ?? fallbackEnums.WOStatus,
        WOPriority: actual.Prisma?.WOPriority ?? fallbackEnums.WOPriority,
        WOEvent: actual.Prisma?.WOEvent ?? fallbackEnums.WOEvent,
        RoutingVersionStatus: actual.Prisma?.RoutingVersionStatus ?? fallbackEnums.RoutingVersionStatus,
      },
      Role: actual.Role ?? fallbackEnums.Role,
      WOStatus: actual.WOStatus ?? fallbackEnums.WOStatus,
      WOPriority: actual.WOPriority ?? fallbackEnums.WOPriority,
      WOEvent: actual.WOEvent ?? fallbackEnums.WOEvent,
      RoutingVersionStatus: actual.RoutingVersionStatus ?? fallbackEnums.RoutingVersionStatus,
    }
  } catch (error) {
    return {
      PrismaClient: class PrismaClientMock {
        constructor() {
          throw new Error(
            'PrismaClient is not available in the test environment. Mock the database calls you need.'
          )
        }
      },
      Prisma: {
        Role: fallbackEnums.Role,
        WOStatus: fallbackEnums.WOStatus,
        WOPriority: fallbackEnums.WOPriority,
        WOEvent: fallbackEnums.WOEvent,
        RoutingVersionStatus: fallbackEnums.RoutingVersionStatus,
      },
      Role: fallbackEnums.Role,
      WOStatus: fallbackEnums.WOStatus,
      WOPriority: fallbackEnums.WOPriority,
      WOEvent: fallbackEnums.WOEvent,
      RoutingVersionStatus: fallbackEnums.RoutingVersionStatus,
    }
  }
})

process.env.DATABASE_URL ??= 'postgresql://user:password@localhost:5432/test'
process.env.JWT_SECRET ??= 'development-test-secret-key-123456'
process.env.STORAGE_BUCKET_ID ??= 'local-bucket'
process.env.NODE_ENV ??= 'test'
