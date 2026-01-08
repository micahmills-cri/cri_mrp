import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// GET /api/admin/departments - List all departments
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: {
            users: true,
            workCenters: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ success: true, departments })
  } catch (error) {
    logger.error('Error fetching departments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/departments - Create new department
const createDepartmentSchema = z.object({
  name: z.string().min(1).max(255),
})

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const data = createDepartmentSchema.parse(body)

    // Check if name already exists
    const existing = await prisma.department.findUnique({
      where: { name: data.name },
    })

    if (existing) {
      return NextResponse.json({ error: 'Department name already exists' }, { status: 400 })
    }

    // Create department
    const department = await prisma.department.create({
      data: {
        name: data.name,
      },
    })

    return NextResponse.json({ success: true, department }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    logger.error('Error creating department:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
