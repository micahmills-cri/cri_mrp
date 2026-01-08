import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// GET /api/admin/departments/[id] - Get department details
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const department = await prisma.department.findUnique({
      where: { id: params.id },
      include: {
        workCenters: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        users: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, department })
  } catch (error) {
    logger.error('Error fetching department:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/departments/[id] - Update department
const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const data = updateDepartmentSchema.parse(body)

    // Check if department exists
    const existing = await prisma.department.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // If updating name, check for conflicts
    if (data.name && data.name !== existing.name) {
      const nameConflict = await prisma.department.findUnique({
        where: { name: data.name },
      })

      if (nameConflict) {
        return NextResponse.json({ error: 'Department name already exists' }, { status: 400 })
      }
    }

    // Update department
    const department = await prisma.department.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({ success: true, department })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    logger.error('Error updating department:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/departments/[id] - Delete department
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if department exists
    const existing = await prisma.department.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            workCenters: true,
            users: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // Check if department has dependencies
    if (existing._count.workCenters > 0 || existing._count.users > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete department with ${existing._count.workCenters} work centers and ${existing._count.users} users`,
        },
        { status: 400 }
      )
    }

    // Delete department
    await prisma.department.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true, message: 'Department deleted' })
  } catch (error) {
    logger.error('Error deleting department:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
