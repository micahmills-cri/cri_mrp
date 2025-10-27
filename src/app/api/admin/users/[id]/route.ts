import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest, hashPassword } from '@/lib/auth'
import { z } from 'zod'
import { Role } from '@prisma/client'

// GET /api/admin/users/[id] - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = getUserFromRequest(request)
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        role: true,
        departmentId: true,
        hourlyRate: true,
        shiftSchedule: true,
        createdAt: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        stationMembers: {
          where: { isActive: true },
          include: {
            station: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        payRateHistory: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/users/[id] - Update user
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'OPERATOR']).optional(),
  departmentId: z.string().cuid().optional().nullable(),
  hourlyRate: z.number().positive().optional().nullable(),
  shiftSchedule: z.any().optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = getUserFromRequest(request)
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const data = updateUserSchema.parse(body)

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If updating email, check for conflicts
    if (data.email && data.email !== existing.email) {
      const emailConflict = await prisma.user.findUnique({
        where: { email: data.email },
      })

      if (emailConflict) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {}

    if (data.email) updateData.email = data.email
    if (data.role) updateData.role = data.role as Role
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId
    if (data.shiftSchedule !== undefined) updateData.shiftSchedule = data.shiftSchedule

    // Handle password update
    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password)
    }

    // Handle hourly rate update with history tracking
    if (data.hourlyRate !== undefined && data.hourlyRate !== existing.hourlyRate) {
      updateData.hourlyRate = data.hourlyRate

      // Create pay rate history entry
      await prisma.payRateHistory.create({
        data: {
          userId: params.id,
          oldRate: existing.hourlyRate,
          newRate: data.hourlyRate,
          changedBy: adminUser.userId,
          reason: 'Admin update',
        },
      })
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        departmentId: true,
        hourlyRate: true,
        shiftSchedule: true,
        createdAt: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/users/[id] - Delete user (soft delete by deactivating)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = getUserFromRequest(request)
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Prevent self-deletion
    if (adminUser.userId === params.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Deactivate all station memberships
    await prisma.stationMember.updateMany({
      where: { userId: params.id },
      data: { isActive: false },
    })

    // Note: We're not actually deleting the user to preserve data integrity
    // In a production system, you might want to add an isActive flag to User model
    // For now, we'll just deactivate their station memberships

    return NextResponse.json({
      success: true,
      message: 'User deactivated (station memberships removed)',
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
