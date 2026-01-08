import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '../../../../lib/auth'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ ok: false, error: 'No token provided' }, { status: 401 })
    }

    const decoded = verifyToken(token)

    return NextResponse.json({
      ok: true,
      user: {
        userId: decoded.userId,
        role: decoded.role,
        departmentId: decoded.departmentId,
      },
    })
  } catch (error) {
    logger.error('Auth verification error:', error)
    return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 })
  }
}
