import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '@/lib/auth'
import { z } from 'zod'

// GET /api/admin/equipment/[id] - Get equipment details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id: params.id },
      include: {
        stations: {
          include: {
            station: true,
          },
        },
      },
    })

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, equipment })
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/equipment/[id] - Update equipment
const updateEquipmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
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
    const data = updateEquipmentSchema.parse(body)

    // Check if equipment exists
    const existing = await prisma.equipment.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    // If updating name, check for conflicts
    if (data.name && data.name !== existing.name) {
      const nameConflict = await prisma.equipment.findUnique({
        where: { name: data.name },
      })

      if (nameConflict) {
        return NextResponse.json(
          { error: 'Equipment name already exists' },
          { status: 400 }
        )
      }
    }

    // Update equipment
    const equipment = await prisma.equipment.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({ success: true, equipment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating equipment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/equipment/[id] - Soft delete equipment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if equipment exists
    const existing = await prisma.equipment.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    // Soft delete by setting isActive to false
    await prisma.equipment.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, message: 'Equipment deleted' })
  } catch (error) {
    console.error('Error deleting equipment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
