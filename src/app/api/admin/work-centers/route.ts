import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// GET /api/admin/work-centers - List all work centers
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const workCenters = await prisma.workCenter.findMany({
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            stations: true,
            routingStages: true,
          },
        },
      },
      orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }],
    })

    return NextResponse.json({ success: true, workCenters })
  } catch (error) {
    logger.error('Error fetching work centers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/work-centers - Create new work center
const createWorkCenterSchema = z.object({
  name: z.string().min(1).max(255),
  departmentId: z.string().cuid(),
})

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const data = createWorkCenterSchema.parse(body)

    // Check if name already exists
    const existing = await prisma.workCenter.findUnique({
      where: { name: data.name },
    })

    if (existing) {
      return NextResponse.json({ error: 'Work center name already exists' }, { status: 400 })
    }

    // Check if department exists
    const department = await prisma.department.findUnique({
      where: { id: data.departmentId },
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // Create work center
    const workCenter = await prisma.workCenter.create({
      data: {
        name: data.name,
        departmentId: data.departmentId,
        isActive: true,
      },
      include: {
        department: true,
      },
    })

    return NextResponse.json({ success: true, workCenter }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    logger.error('Error creating work center:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
