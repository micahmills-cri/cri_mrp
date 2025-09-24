import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'
import { getUserFromRequest } from '../../../../lib/auth'
import { Role } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workOrderId = params.id

    // Get work order with full details
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
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
                      where: { isActive: true }
                    }
                  }
                },
                workInstructionVersions: {
                  where: { isActive: true },
                  orderBy: { version: 'desc' },
                  take: 1
                }
              }
            }
          }
        },
        woStageLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            routingStage: {
              include: {
                workCenter: true
              }
            },
            station: true,
            user: {
              select: {
                id: true,
                email: true,
                role: true
              }
            }
          }
        }
      }
    })

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    // Check department scoping for operators only (admin and supervisor have full access)
    if (user.role === Role.OPERATOR && user.departmentId) {
      const enabledStages = workOrder.routingVersion.stages.filter(s => s.enabled)
      const currentStage = enabledStages[workOrder.currentStageIndex]
      
      if (currentStage && currentStage.workCenter.department.id !== user.departmentId) {
        return NextResponse.json({ error: 'Work order not in your department' }, { status: 403 })
      }
    }

    // Calculate stage timeline
    const stageTimeline = workOrder.woStageLogs.reduce((timeline, log) => {
      const stageId = log.routingStage.id
      if (!timeline[stageId]) {
        timeline[stageId] = {
          stageId,
          stageName: log.routingStage.name,
          stageCode: log.routingStage.code,
          workCenter: log.routingStage.workCenter.name,
          events: []
        }
      }
      
      timeline[stageId].events.push({
        id: log.id,
        event: log.event,
        createdAt: log.createdAt,
        station: log.station.name,
        stationCode: log.station.code,
        user: log.user.email,
        goodQty: log.goodQty,
        scrapQty: log.scrapQty,
        note: log.note
      })
      
      return timeline
    }, {} as Record<string, any>)

    // Get enabled stages for progress tracking
    const enabledStages = workOrder.routingVersion.stages.filter(s => s.enabled)
    const currentStage = enabledStages[workOrder.currentStageIndex]

    return NextResponse.json({
      workOrder: {
        id: workOrder.id,
        number: workOrder.number,
        hullId: workOrder.hullId,
        productSku: workOrder.productSku,
        qty: workOrder.qty,
        status: workOrder.status,
        currentStageIndex: workOrder.currentStageIndex,
        specSnapshot: workOrder.specSnapshot,
        createdAt: workOrder.createdAt,
        routingVersion: {
          id: workOrder.routingVersion.id,
          model: workOrder.routingVersion.model,
          trim: workOrder.routingVersion.trim,
          version: workOrder.routingVersion.version,
          status: workOrder.routingVersion.status
        },
        currentStage: currentStage ? {
          id: currentStage.id,
          code: currentStage.code,
          name: currentStage.name,
          sequence: currentStage.sequence,
          workCenter: currentStage.workCenter.name,
          department: currentStage.workCenter.department.name,
          standardSeconds: currentStage.standardStageSeconds
        } : null,
        enabledStages: enabledStages.map(s => ({
          id: s.id,
          code: s.code,
          name: s.name,
          sequence: s.sequence,
          enabled: s.enabled,
          workCenter: s.workCenter.name,
          department: s.workCenter.department.name
        })),
        stageTimeline: Object.values(stageTimeline),
        notes: workOrder.woStageLogs
          .filter(log => log.note)
          .map(log => ({
            note: log.note,
            event: log.event,
            stage: log.routingStage.name,
            user: log.user.email,
            createdAt: log.createdAt
          }))
      }
    })
  } catch (error) {
    console.error('Get work order details error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}