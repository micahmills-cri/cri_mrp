import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '@/lib/auth'
import { z } from 'zod'

// GET /api/admin/equipment - List all equipment
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const equipment = await prisma.equipment.findMany({
      include: {
        _count: {
          select: {
            stations: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ success: true, equipment })
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/equipment - Create new equipment
const createEquipmentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const data = createEquipmentSchema.parse(body)

    // Check if name already exists
    const existing = await prisma.equipment.findUnique({
      where: { name: data.name },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Equipment name already exists' },
        { status: 400 }
      )
    }

    // Create equipment
    const equipment = await prisma.equipment.create({
      data: {
        name: data.name,
        description: data.description || null,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, equipment }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating equipment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
