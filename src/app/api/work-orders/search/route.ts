import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '../../../../lib/auth'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query } = searchSchema.parse(body)

    // Search by work order number or hull ID
    const workOrder = await prisma.workOrder.findFirst({
      where: {
        OR: [
          { number: { contains: query, mode: 'insensitive' } },
          { hullId: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        routingVersion: {
          include: {
            stages: {
              orderBy: { sequence: 'asc' },
              include: {
                workCenter: {
                  include: {
                    department: true,
                    stations: {
                      where: { isActive: true },
                      orderBy: { code: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    // Get current stage
    const currentStage = workOrder.routingVersion.stages[workOrder.currentStageIndex]
    if (!currentStage) {
      return NextResponse.json({ error: 'No current stage found' }, { status: 400 })
    }

    // Check if user has access to this stage (department scoped for operators only)
    if (
      user.role === 'OPERATOR' &&
      user.departmentId &&
      user.departmentId !== currentStage.workCenter.department.id
    ) {
      return NextResponse.json({ error: 'Work order not in your department' }, { status: 403 })
    }

    // Filter stations for operators only (admin and supervisor see all stations)
    const availableStations =
      user.role === 'OPERATOR'
        ? currentStage.workCenter.stations.filter(
            (station) =>
              currentStage.workCenter.department.id === user.departmentId || !user.departmentId
          )
        : currentStage.workCenter.stations

    return NextResponse.json({
      success: true,
      workOrder: {
        id: workOrder.id,
        number: workOrder.number,
        hullId: workOrder.hullId,
        productSku: workOrder.productSku,
        status: workOrder.status,
        qty: workOrder.qty,
        currentStage: {
          id: currentStage.id,
          code: currentStage.code,
          name: currentStage.name,
          sequence: currentStage.sequence,
          enabled: currentStage.enabled,
          workCenter: {
            id: currentStage.workCenter.id,
            name: currentStage.workCenter.name,
            department: currentStage.workCenter.department.name,
          },
        },
        availableStations,
      },
    })
  } catch (error) {
    logger.error('Search work order error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
