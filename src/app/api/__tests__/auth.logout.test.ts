import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

// Import the route handler
import { POST } from '../auth/logout/route'

function buildRequest() {
  return new NextRequest('https://example.com/api/auth/logout', {
    method: 'POST',
  })
}

describe('POST /api/auth/logout', () => {
  it('returns 200 with success:true', async () => {
    const response = await POST(buildRequest())

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload).toEqual({ success: true })
  })

  it('clears the token cookie with maxAge:0', async () => {
    const response = await POST(buildRequest())

    const setCookieHeaders = response.headers.getSetCookie()
    expect(setCookieHeaders.length).toBeGreaterThan(0)

    const tokenCookie = setCookieHeaders.find((header) => header.startsWith('token='))
    expect(tokenCookie).toBeDefined()
    expect(tokenCookie).toContain('token=;') // Empty value
    expect(tokenCookie).toContain('Max-Age=0') // Expires immediately
  })

  it('sets cookie with httpOnly flag', async () => {
    const response = await POST(buildRequest())

    const setCookieHeaders = response.headers.getSetCookie()
    const tokenCookie = setCookieHeaders.find((header) => header.startsWith('token='))

    expect(tokenCookie).toContain('HttpOnly')
  })

  it('sets cookie with SameSite=Lax', async () => {
    const response = await POST(buildRequest())

    const setCookieHeaders = response.headers.getSetCookie()
    const tokenCookie = setCookieHeaders.find((header) => header.startsWith('token='))

    expect(tokenCookie?.toLowerCase()).toContain('samesite=lax')
  })

  it('sets secure flag in production environment', async () => {
    const originalEnv = process.env.NODE_ENV

    // Test production environment
    process.env.NODE_ENV = 'production'

    const response = await POST(buildRequest())

    const setCookieHeaders = response.headers.getSetCookie()
    const tokenCookie = setCookieHeaders.find((header) => header.startsWith('token='))

    expect(tokenCookie).toContain('Secure')

    // Restore environment
    process.env.NODE_ENV = originalEnv
  })

  it('does not set secure flag in non-production environment', async () => {
    const originalEnv = process.env.NODE_ENV

    // Test development environment
    process.env.NODE_ENV = 'development'

    const response = await POST(buildRequest())

    const setCookieHeaders = response.headers.getSetCookie()
    const tokenCookie = setCookieHeaders.find((header) => header.startsWith('token='))

    expect(tokenCookie).not.toContain('Secure')

    // Restore environment
    process.env.NODE_ENV = originalEnv
  })

  it('works without authentication (no token required to logout)', async () => {
    // Logout should succeed even if user is not logged in
    const response = await POST(buildRequest())

    expect(response.status).toBe(200)
  })

  it('returns same response regardless of prior authentication state', async () => {
    // Test multiple logout calls
    const response1 = await POST(buildRequest())
    const response2 = await POST(buildRequest())

    const payload1 = await response1.json()
    const payload2 = await response2.json()

    expect(payload1).toEqual(payload2)
    expect(payload1).toEqual({ success: true })
  })
})
