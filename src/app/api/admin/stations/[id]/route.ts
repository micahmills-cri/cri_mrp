import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '@/lib/auth'
import { z } from 'zod'

// GET /api/admin/stations/[id] - Get station details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const station = await prisma.station.findUnique({
      where: { id: params.id },
      include: {
        workCenter: {
          include: {
            department: true,
          },
        },
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                hourlyRate: true,
                shiftSchedule: true,
                departmentId: true,
              },
            },
          },
        },
        equipment: {
          include: {
            equipment: true,
          },
        },
        metrics: {
          orderBy: {
            periodStart: 'desc',
          },
          take: 12, // Last 12 periods
        },
      },
    })

    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, station })
  } catch (error) {
    console.error('Error fetching station:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/stations/[id] - Update station
const updateStationSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  workCenterId: z.string().cuid().optional(),
  defaultPayRate: z.number().positive().optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  targetCycleTimeSeconds: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const data = updateStationSchema.parse(body)

    // Check if station exists
    const existing = await prisma.station.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    // If updating code, check for conflicts
    if (data.code && data.code !== existing.code) {
      const codeConflict = await prisma.station.findUnique({
        where: { code: data.code },
      })

      if (codeConflict) {
        return NextResponse.json(
          { error: 'Station code already exists' },
          { status: 400 }
        )
      }
    }

    // Update station
    const station = await prisma.station.update({
      where: { id: params.id },
      data,
      include: {
        workCenter: {
          include: {
            department: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, station })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating station:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/stations/[id] - Soft delete station
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if station exists
    const existing = await prisma.station.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    // Soft delete by setting isActive to false
    await prisma.station.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, message: 'Station deleted' })
  } catch (error) {
    console.error('Error deleting station:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
