import { NextRequest } from 'next/server'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { Role } from '@prisma/client'

const { verifyTokenMock } = vi.hoisted(() => ({
  verifyTokenMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  verifyToken: verifyTokenMock,
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
import { GET } from '../auth/me/route'

function buildRequest(token?: string) {
  const request = new NextRequest('https://example.com/api/auth/me', {
    method: 'GET',
  })

  if (token) {
    // Set cookie manually
    request.cookies.set('token', token)
  }

  return request
}

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    verifyTokenMock.mockReset()
  })

  it('returns 200 with user info when valid token provided', async () => {
    const mockUser = {
      userId: 'user-123',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    }

    verifyTokenMock.mockReturnValue(mockUser)

    const response = await GET(buildRequest('valid-token'))

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload).toEqual({
      ok: true,
      user: mockUser,
    })
  })

  it('returns user info with OPERATOR role', async () => {
    const mockUser = {
      userId: 'operator-1',
      role: Role.OPERATOR,
      departmentId: 'dept-2',
    }

    verifyTokenMock.mockReturnValue(mockUser)

    const response = await GET(buildRequest('valid-token'))

    const payload = await response.json()

    expect(payload.ok).toBe(true)
    expect(payload.user.role).toBe(Role.OPERATOR)
    expect(payload.user.departmentId).toBe('dept-2')
  })

  it('returns user info with ADMIN role', async () => {
    const mockUser = {
      userId: 'admin-1',
      role: Role.ADMIN,
      departmentId: null,
    }

    verifyTokenMock.mockReturnValue(mockUser)

    const response = await GET(buildRequest('valid-token'))

    const payload = await response.json()

    expect(payload.ok).toBe(true)
    expect(payload.user.role).toBe(Role.ADMIN)
    expect(payload.user.departmentId).toBeNull()
  })

  it('verifies token using verifyToken helper', async () => {
    const mockUser = {
      userId: 'user-123',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    }

    verifyTokenMock.mockReturnValue(mockUser)

    await GET(buildRequest('test-token-abc'))

    expect(verifyTokenMock).toHaveBeenCalledWith('test-token-abc')
  })

  it('returns 401 when no token cookie provided', async () => {
    const response = await GET(buildRequest())

    expect(response.status).toBe(401)
    const payload = await response.json()

    expect(payload).toEqual({
      ok: false,
      error: 'No token provided',
    })
    expect(verifyTokenMock).not.toHaveBeenCalled()
  })

  it('returns 401 when token is empty string', async () => {
    const response = await GET(buildRequest(''))

    expect(response.status).toBe(401)
    const payload = await response.json()

    expect(payload).toEqual({
      ok: false,
      error: 'No token provided',
    })
    expect(verifyTokenMock).not.toHaveBeenCalled()
  })

  it('returns 401 when token verification throws error', async () => {
    verifyTokenMock.mockImplementation(() => {
      throw new Error('Invalid token signature')
    })

    const response = await GET(buildRequest('invalid-token'))

    expect(response.status).toBe(401)
    const payload = await response.json()

    expect(payload).toEqual({
      ok: false,
      error: 'Invalid token',
    })
  })

  it('returns 401 when token is expired', async () => {
    verifyTokenMock.mockImplementation(() => {
      throw new Error('Token expired')
    })

    const response = await GET(buildRequest('expired-token'))

    expect(response.status).toBe(401)
    const payload = await response.json()

    expect(payload.ok).toBe(false)
    expect(payload.error).toBe('Invalid token')
  })

  it('returns 401 when token is malformed', async () => {
    verifyTokenMock.mockImplementation(() => {
      throw new Error('jwt malformed')
    })

    const response = await GET(buildRequest('malformed-token'))

    expect(response.status).toBe(401)
    const payload = await response.json()

    expect(payload.ok).toBe(false)
    expect(payload.error).toBe('Invalid token')
  })

  it('includes all required user fields in response', async () => {
    const mockUser = {
      userId: 'user-123',
      role: Role.SUPERVISOR,
      departmentId: 'dept-1',
    }

    verifyTokenMock.mockReturnValue(mockUser)

    const response = await GET(buildRequest('valid-token'))

    const payload = await response.json()

    expect(payload.user).toHaveProperty('userId')
    expect(payload.user).toHaveProperty('role')
    expect(payload.user).toHaveProperty('departmentId')
  })

  it('handles user without department (null departmentId)', async () => {
    const mockUser = {
      userId: 'supervisor-1',
      role: Role.SUPERVISOR,
      departmentId: null,
    }

    verifyTokenMock.mockReturnValue(mockUser)

    const response = await GET(buildRequest('valid-token'))

    const payload = await response.json()

    expect(payload.ok).toBe(true)
    expect(payload.user.departmentId).toBeNull()
  })

  it('returns consistent structure for success and error responses', async () => {
    // Success response
    verifyTokenMock.mockReturnValue({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    const successResponse = await GET(buildRequest('valid-token'))
    const successPayload = await successResponse.json()

    expect(successPayload).toHaveProperty('ok')
    expect(successPayload.ok).toBe(true)

    // Error response
    const errorResponse = await GET(buildRequest())
    const errorPayload = await errorResponse.json()

    expect(errorPayload).toHaveProperty('ok')
    expect(errorPayload.ok).toBe(false)
    expect(errorPayload).toHaveProperty('error')
  })

  it('does not expose sensitive token information in error messages', async () => {
    verifyTokenMock.mockImplementation(() => {
      throw new Error('JWT secret key is invalid')
    })

    const response = await GET(buildRequest('token-with-bad-secret'))

    const payload = await response.json()

    // Should return generic error, not expose secret details
    expect(payload.error).toBe('Invalid token')
    expect(payload.error).not.toContain('secret')
  })
})
