import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '@/lib/auth'
import { z } from 'zod'

// GET /api/admin/stations - List all stations
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const stations = await prisma.station.findMany({
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
                hourlyRate: true,
              },
            },
          },
        },
        equipment: {
          include: {
            equipment: true,
          },
        },
        _count: {
          select: {
            members: true,
            equipment: true,
          },
        },
      },
      orderBy: [{ workCenter: { name: 'asc' } }, { code: 'asc' }],
    })

    return NextResponse.json({ success: true, stations })
  } catch (error) {
    console.error('Error fetching stations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/stations - Create new station
const createStationSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  workCenterId: z.string().cuid(),
  defaultPayRate: z.number().positive().optional(),
  capacity: z.number().int().positive().optional(),
  targetCycleTimeSeconds: z.number().int().positive().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const data = createStationSchema.parse(body)

    // Check if code already exists
    const existing = await prisma.station.findUnique({
      where: { code: data.code },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Station code already exists' },
        { status: 400 }
      )
    }

    // Create station
    const station = await prisma.station.create({
      data: {
        ...data,
        isActive: true,
      },
      include: {
        workCenter: {
          include: {
            department: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, station }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating station:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
