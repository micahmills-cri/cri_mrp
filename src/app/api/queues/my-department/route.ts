import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'
import { getUserFromRequest } from '../../../../lib/auth'
import { WOStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.departmentId) {
      return NextResponse.json({ error: 'User not assigned to a department' }, { status: 400 })
    }

    // Get work orders that are RELEASED or IN_PROGRESS
    // where the current stage's work center belongs to the user's department
    const workOrders = await prisma.workOrder.findMany({
      where: {
        OR: [
          { status: WOStatus.RELEASED },
          { status: WOStatus.IN_PROGRESS }
        ]
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
                      orderBy: { code: 'asc' }
                    }
                  }
                }
              }
            }
          }
        },
        woStageLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            station: true,
            user: true
          }
        }
      },
      orderBy: [
        { status: 'desc' }, // IN_PROGRESS first
        { createdAt: 'asc' } // Then by age
      ]
    })

    // Filter to only include work orders where current stage is in user's department
    const filteredWorkOrders = workOrders.filter(wo => {
      const enabledStages = wo.routingVersion.stages.filter(s => s.enabled).sort((a, b) => a.sequence - b.sequence)
      const currentStage = enabledStages[wo.currentStageIndex]
      return currentStage && currentStage.workCenter.department.id === user.departmentId
    })

    // Transform the data for the queue display
    const queue = filteredWorkOrders.map(wo => {
      const enabledStages = wo.routingVersion.stages.filter(s => s.enabled).sort((a, b) => a.sequence - b.sequence)
      const currentStage = enabledStages[wo.currentStageIndex]
      const lastEvent = wo.woStageLogs[0]

      return {
        id: wo.id,
        number: wo.number,
        hullId: wo.hullId,
        productSku: wo.productSku,
        status: wo.status,
        qty: wo.qty,
        currentStage: currentStage ? {
          id: currentStage.id,
          code: currentStage.code,
          name: currentStage.name,
          sequence: currentStage.sequence,
          workCenter: {
            id: currentStage.workCenter.id,
            name: currentStage.workCenter.name
          },
          stations: currentStage.workCenter.stations
        } : null,
        lastEvent: lastEvent ? {
          event: lastEvent.event,
          createdAt: lastEvent.createdAt,
          station: lastEvent.station.code,
          user: lastEvent.user.email
        } : null,
        currentStageIndex: wo.currentStageIndex,
        totalEnabledStages: enabledStages.length,
        createdAt: wo.createdAt
      }
    })

    return NextResponse.json({
      queue,
      department: {
        id: user.departmentId,
        name: (user as any).departmentName || 'Unknown'
      },
      totalReady: queue.filter(wo => wo.status === WOStatus.RELEASED).length,
      totalInProgress: queue.filter(wo => wo.status === WOStatus.IN_PROGRESS).length
    })
  } catch (error) {
    console.error('Get queue error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}