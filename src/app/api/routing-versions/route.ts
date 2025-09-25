import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/db'
import { getUserFromRequest } from '../../../lib/auth'
import { Role } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is supervisor or admin
    if (user.role !== Role.SUPERVISOR && user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden - Supervisor or Admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const model = searchParams.get('model')
    const trim = searchParams.get('trim')

    // Build where clause for filtering
    const whereClause: any = {}
    if (model) {
      whereClause.model = model
    }
    if (trim) {
      whereClause.trim = trim
    }

    // Get routing versions with their stages
    const routingVersions = await prisma.routingVersion.findMany({
      where: whereClause,
      include: {
        stages: {
          where: { enabled: true },
          orderBy: { sequence: 'asc' },
          include: {
            workCenter: {
              include: {
                department: true
              }
            }
          }
        }
      },
      orderBy: [
        { model: 'asc' },
        { trim: 'asc' },
        { version: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      routingVersions: routingVersions
    })

  } catch (error) {
    console.error('Routing versions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}