import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// GET /api/admin/work-centers/[id] - Get work center details
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const workCenter = await prisma.workCenter.findUnique({
      where: { id: params.id },
      include: {
        department: true,
        stations: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
          },
        },
      },
    })

    if (!workCenter) {
      return NextResponse.json({ error: 'Work center not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, workCenter })
  } catch (error) {
    logger.error('Error fetching work center:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/work-centers/[id] - Update work center
const updateWorkCenterSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  departmentId: z.string().cuid().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const data = updateWorkCenterSchema.parse(body)

    // Check if work center exists
    const existing = await prisma.workCenter.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Work center not found' }, { status: 404 })
    }

    // If updating name, check for conflicts
    if (data.name && data.name !== existing.name) {
      const nameConflict = await prisma.workCenter.findUnique({
        where: { name: data.name },
      })

      if (nameConflict) {
        return NextResponse.json({ error: 'Work center name already exists' }, { status: 400 })
      }
    }

    // If updating department, check it exists
    if (data.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: data.departmentId },
      })

      if (!department) {
        return NextResponse.json({ error: 'Department not found' }, { status: 404 })
      }
    }

    // Update work center
    const workCenter = await prisma.workCenter.update({
      where: { id: params.id },
      data,
      include: {
        department: true,
      },
    })

    return NextResponse.json({ success: true, workCenter })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    logger.error('Error updating work center:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/work-centers/[id] - Soft delete work center
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if work center exists
    const existing = await prisma.workCenter.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Work center not found' }, { status: 404 })
    }

    // Soft delete by setting isActive to false
    await prisma.workCenter.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, message: 'Work center deleted' })
  } catch (error) {
    logger.error('Error deleting work center:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
