import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest, hashPassword } from '@/lib/auth'
import { z } from 'zod'
import { Role } from '@prisma/client'

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
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
        _count: {
          select: {
            stationMembers: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
    })

    return NextResponse.json({ success: true, users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/users - Create new user
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'OPERATOR']),
  departmentId: z.string().cuid().optional().nullable(),
  hourlyRate: z.number().positive().optional().nullable(),
  shiftSchedule: z.any().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const adminUser = getUserFromRequest(request)
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const data = createUserSchema.parse(body)

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(data.password)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role as Role,
        departmentId: data.departmentId || null,
        hourlyRate: data.hourlyRate || null,
        shiftSchedule: data.shiftSchedule || null,
      },
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

    // Create initial pay rate history if hourly rate was set
    if (data.hourlyRate) {
      await prisma.payRateHistory.create({
        data: {
          userId: newUser.id,
          oldRate: null,
          newRate: data.hourlyRate,
          changedBy: adminUser.userId,
          reason: 'Initial rate',
        },
      })
    }

    return NextResponse.json({ success: true, user: newUser }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
