import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'
import { verifyPassword, signJWT } from '../../../../lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { department: true }
    })

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json(
        { ok: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate JWT
    const token = signJWT({
      userId: user.id,
      role: user.role,
      departmentId: user.departmentId || undefined
    })

    // Determine redirect based on role
    const redirectTo = user.role === 'OPERATOR' ? '/operator' : '/supervisor'

    // Create response with cookie
    const response = NextResponse.json({
      ok: true,
      redirectTo,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: user.department?.name
      }
    })

    // Set httpOnly cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 604800 // 7 days
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}