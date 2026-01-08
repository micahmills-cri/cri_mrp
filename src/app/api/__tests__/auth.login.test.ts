import { NextRequest } from 'next/server'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { Role } from '@prisma/client'

const { findUniqueMock, verifyPasswordMock, signJWTMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
  signJWTMock: vi.fn(),
}))

vi.mock('@/server/db/client', () => ({
  prisma: {
    user: { findUnique: findUniqueMock },
  },
}))

vi.mock('@/lib/auth', () => ({
  verifyPassword: verifyPasswordMock,
  signJWT: signJWTMock,
}))

// Mock logger to prevent console output during tests
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Import after mocks so the handler wires up the mocked modules
import { POST } from '../auth/login/route'

function buildRequest(body: unknown) {
  return new NextRequest('https://example.com/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    findUniqueMock.mockReset()
    verifyPasswordMock.mockReset()
    signJWTMock.mockReset()
  })

  it('returns 200 and sets cookie when credentials are valid for OPERATOR', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'operator@example.com',
      passwordHash: '$2a$12$hashedpassword',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
      department: { id: 'dept-1', name: 'Assembly' },
    }

    findUniqueMock.mockResolvedValue(mockUser)
    verifyPasswordMock.mockResolvedValue(true)
    signJWTMock.mockReturnValue('mock-jwt-token')

    const response = await POST(
      buildRequest({
        email: 'operator@example.com',
        password: 'password123',
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload).toEqual({
      ok: true,
      redirectTo: '/operator',
      user: {
        id: 'user-1',
        email: 'operator@example.com',
        role: Role.OPERATOR,
        departmentId: 'dept-1',
        departmentName: 'Assembly',
      },
    })

    // Verify Prisma was called correctly
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email: 'operator@example.com' },
      include: { department: true },
    })

    // Verify password verification
    expect(verifyPasswordMock).toHaveBeenCalledWith('password123', '$2a$12$hashedpassword')

    // Verify JWT signing
    expect(signJWTMock).toHaveBeenCalledWith({
      userId: 'user-1',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
    })

    // Verify cookie was set
    const cookie = response.cookies.get('token')
    expect(cookie).toBeDefined()
    expect(cookie?.value).toBe('mock-jwt-token')
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe('lax')
    expect(cookie?.path).toBe('/')
    expect(cookie?.maxAge).toBe(604800) // 7 days
  })

  it('returns 200 and redirects SUPERVISOR to /supervisor', async () => {
    const mockUser = {
      id: 'user-2',
      email: 'supervisor@example.com',
      passwordHash: '$2a$12$hashedpassword',
      role: Role.SUPERVISOR,
      departmentId: null,
      department: null,
    }

    findUniqueMock.mockResolvedValue(mockUser)
    verifyPasswordMock.mockResolvedValue(true)
    signJWTMock.mockReturnValue('mock-jwt-token')

    const response = await POST(
      buildRequest({
        email: 'supervisor@example.com',
        password: 'password123',
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.ok).toBe(true)
    expect(payload.redirectTo).toBe('/supervisor')
    expect(payload.user.role).toBe(Role.SUPERVISOR)

    // Verify JWT signing with undefined departmentId
    expect(signJWTMock).toHaveBeenCalledWith({
      userId: 'user-2',
      role: Role.SUPERVISOR,
      departmentId: undefined,
    })
  })

  it('returns 200 and redirects ADMIN to /supervisor', async () => {
    const mockUser = {
      id: 'user-3',
      email: 'admin@example.com',
      passwordHash: '$2a$12$hashedpassword',
      role: Role.ADMIN,
      departmentId: null,
      department: null,
    }

    findUniqueMock.mockResolvedValue(mockUser)
    verifyPasswordMock.mockResolvedValue(true)
    signJWTMock.mockReturnValue('mock-jwt-token')

    const response = await POST(
      buildRequest({
        email: 'admin@example.com',
        password: 'password123',
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.ok).toBe(true)
    expect(payload.redirectTo).toBe('/supervisor')
    expect(payload.user.role).toBe(Role.ADMIN)
  })

  it('returns 401 when user email is not found', async () => {
    findUniqueMock.mockResolvedValue(null)

    const response = await POST(
      buildRequest({
        email: 'nonexistent@example.com',
        password: 'password123',
      })
    )

    expect(response.status).toBe(401)
    const payload = await response.json()

    expect(payload).toEqual({
      ok: false,
      error: 'Invalid email or password',
    })

    // Verify password verification was never called
    expect(verifyPasswordMock).not.toHaveBeenCalled()
    expect(signJWTMock).not.toHaveBeenCalled()

    // Verify no cookie was set
    const cookie = response.cookies.get('token')
    expect(cookie).toBeUndefined()
  })

  it('returns 401 when password is incorrect', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'operator@example.com',
      passwordHash: '$2a$12$hashedpassword',
      role: Role.OPERATOR,
      departmentId: 'dept-1',
      department: { id: 'dept-1', name: 'Assembly' },
    }

    findUniqueMock.mockResolvedValue(mockUser)
    verifyPasswordMock.mockResolvedValue(false)

    const response = await POST(
      buildRequest({
        email: 'operator@example.com',
        password: 'wrongpassword',
      })
    )

    expect(response.status).toBe(401)
    const payload = await response.json()

    expect(payload).toEqual({
      ok: false,
      error: 'Invalid email or password',
    })

    // Verify password verification was called
    expect(verifyPasswordMock).toHaveBeenCalledWith('wrongpassword', '$2a$12$hashedpassword')
    expect(signJWTMock).not.toHaveBeenCalled()

    // Verify no cookie was set
    const cookie = response.cookies.get('token')
    expect(cookie).toBeUndefined()
  })

  it('returns 500 when email format is invalid', async () => {
    const response = await POST(
      buildRequest({
        email: 'not-an-email',
        password: 'password123',
      })
    )

    expect(response.status).toBe(500)
    const payload = await response.json()

    expect(payload).toEqual({
      ok: false,
      error: 'Internal server error',
    })

    // Verify database was never queried
    expect(findUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 500 when password is missing', async () => {
    const response = await POST(
      buildRequest({
        email: 'operator@example.com',
        password: '',
      })
    )

    expect(response.status).toBe(500)
    const payload = await response.json()

    expect(payload).toEqual({
      ok: false,
      error: 'Internal server error',
    })

    // Verify database was never queried
    expect(findUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 500 when request body is invalid JSON', async () => {
    const response = await POST(
      new NextRequest('https://example.com/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid json',
      })
    )

    expect(response.status).toBe(500)
    const payload = await response.json()

    expect(payload).toEqual({
      ok: false,
      error: 'Internal server error',
    })

    // Verify database was never queried
    expect(findUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 500 when database query fails', async () => {
    findUniqueMock.mockRejectedValue(new Error('Database connection error'))

    const response = await POST(
      buildRequest({
        email: 'operator@example.com',
        password: 'password123',
      })
    )

    expect(response.status).toBe(500)
    const payload = await response.json()

    expect(payload).toEqual({
      ok: false,
      error: 'Internal server error',
    })
  })

  it('handles user with department but no department object', async () => {
    const mockUser = {
      id: 'user-4',
      email: 'operator2@example.com',
      passwordHash: '$2a$12$hashedpassword',
      role: Role.OPERATOR,
      departmentId: 'dept-2',
      department: null, // Department not included or deleted
    }

    findUniqueMock.mockResolvedValue(mockUser)
    verifyPasswordMock.mockResolvedValue(true)
    signJWTMock.mockReturnValue('mock-jwt-token')

    const response = await POST(
      buildRequest({
        email: 'operator2@example.com',
        password: 'password123',
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.user.departmentId).toBe('dept-2')
    expect(payload.user.departmentName).toBeUndefined()
  })
})
