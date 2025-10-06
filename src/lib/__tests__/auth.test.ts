import { describe, it, expect, beforeAll } from 'vitest'
import { signToken, verifyToken } from '../auth'
import { Role } from '@prisma/client'

// Set JWT_SECRET for tests
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters-long-for-testing'
})

describe('Auth', () => {
  it('should create and verify JWT token', () => {
    const payload = {
      userId: 'test-user-id',
      role: Role.OPERATOR,
      departmentId: 'dept-1'
    }

    const token = signToken(payload)
    expect(token).toBeTruthy()

    const verified = verifyToken(token)
    expect(verified).toBeTruthy()
    expect(verified.userId).toBe('test-user-id')
    expect(verified.role).toBe(Role.OPERATOR)
  })

  it('should reject invalid token', () => {
    expect(() => verifyToken('invalid-token')).toThrow()
  })

  it('should include departmentId in token', () => {
    const payload = {
      userId: 'test-user-id',
      role: Role.SUPERVISOR,
      departmentId: 'test-dept'
    }

    const token = signToken(payload)
    const verified = verifyToken(token)

    expect(verified.departmentId).toBe('test-dept')
  })

  it('should handle null departmentId', () => {
    const payload = {
      userId: 'test-user-id',
      role: Role.ADMIN,
      departmentId: null
    }

    const token = signToken(payload)
    const verified = verifyToken(token)

    expect(verified.departmentId).toBeNull()
  })
})
