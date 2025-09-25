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

    // Get all work centers with their departments
    const workCenters = await prisma.workCenter.findMany({
      where: {
        isActive: true
      },
      include: {
        department: true
      },
      orderBy: [
        { department: { name: 'asc' } },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      workCenters: workCenters
    })

  } catch (error) {
    console.error('Work centers API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}