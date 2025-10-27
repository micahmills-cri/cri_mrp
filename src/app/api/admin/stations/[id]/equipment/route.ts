import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '@/lib/auth'
import { z } from 'zod'

// GET /api/admin/stations/[id]/equipment - Get station equipment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const equipment = await prisma.stationEquipment.findMany({
      where: { stationId: params.id },
      include: {
        equipment: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json({ success: true, equipment })
  } catch (error) {
    console.error('Error fetching station equipment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/stations/[id]/equipment - Add equipment to station
const addEquipmentSchema = z.object({
  equipmentId: z.string().cuid(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const data = addEquipmentSchema.parse(body)

    // Check if station exists
    const station = await prisma.station.findUnique({
      where: { id: params.id },
    })

    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    // Check if equipment exists
    const equipmentExists = await prisma.equipment.findUnique({
      where: { id: data.equipmentId },
    })

    if (!equipmentExists) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    // Check if assignment already exists
    const existing = await prisma.stationEquipment.findUnique({
      where: {
        stationId_equipmentId: {
          stationId: params.id,
          equipmentId: data.equipmentId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Equipment is already assigned to this station' },
        { status: 400 }
      )
    }

    // Create new assignment
    const stationEquipment = await prisma.stationEquipment.create({
      data: {
        stationId: params.id,
        equipmentId: data.equipmentId,
      },
      include: {
        equipment: true,
      },
    })

    return NextResponse.json({ success: true, equipment: stationEquipment }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error adding station equipment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/stations/[id]/equipment - Remove equipment from station
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get equipmentAssignmentId from query params
    const { searchParams } = new URL(request.url)
    const equipmentAssignmentId = searchParams.get('assignmentId')

    if (!equipmentAssignmentId) {
      return NextResponse.json(
        { error: 'Equipment assignment ID required' },
        { status: 400 }
      )
    }

    // Check if assignment exists
    const assignment = await prisma.stationEquipment.findUnique({
      where: { id: equipmentAssignmentId },
    })

    if (!assignment || assignment.stationId !== params.id) {
      return NextResponse.json(
        { error: 'Equipment assignment not found' },
        { status: 404 }
      )
    }

    // Hard delete the assignment
    await prisma.stationEquipment.delete({
      where: { id: equipmentAssignmentId },
    })

    return NextResponse.json({
      success: true,
      message: 'Equipment removed from station',
    })
  } catch (error) {
    console.error('Error removing station equipment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
