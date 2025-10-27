import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '@/lib/auth'
import { z } from 'zod'

// GET /api/admin/stations/[id]/members - Get station members
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const members = await prisma.stationMember.findMany({
      where: { stationId: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            hourlyRate: true,
            shiftSchedule: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json({ success: true, members })
  } catch (error) {
    console.error('Error fetching station members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/stations/[id]/members - Add member to station
const addMemberSchema = z.object({
  userId: z.string().cuid(),
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
    const data = addMemberSchema.parse(body)

    // Check if station exists
    const station = await prisma.station.findUnique({
      where: { id: params.id },
    })

    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: data.userId },
    })

    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if assignment already exists
    const existing = await prisma.stationMember.findUnique({
      where: {
        stationId_userId: {
          stationId: params.id,
          userId: data.userId,
        },
      },
    })

    if (existing) {
      // If it exists but is inactive, reactivate it
      if (!existing.isActive) {
        const updated = await prisma.stationMember.update({
          where: { id: existing.id },
          data: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                hourlyRate: true,
                shiftSchedule: true,
              },
            },
          },
        })
        return NextResponse.json({ success: true, member: updated })
      }

      return NextResponse.json(
        { error: 'User is already assigned to this station' },
        { status: 400 }
      )
    }

    // Create new assignment
    const member = await prisma.stationMember.create({
      data: {
        stationId: params.id,
        userId: data.userId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            hourlyRate: true,
            shiftSchedule: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, member }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error adding station member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/stations/[id]/members/[memberId] - Remove member from station
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get memberId from query params
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 })
    }

    // Check if member exists
    const member = await prisma.stationMember.findUnique({
      where: { id: memberId },
    })

    if (!member || member.stationId !== params.id) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Soft delete by setting isActive to false
    await prisma.stationMember.update({
      where: { id: memberId },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, message: 'Member removed from station' })
  } catch (error) {
    console.error('Error removing station member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
