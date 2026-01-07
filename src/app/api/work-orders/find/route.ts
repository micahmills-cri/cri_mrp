import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '../../../../lib/auth'
import { WOStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('query')
    const selectedDepartmentId = searchParams.get('departmentId') || user.departmentId
    
    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
    }

    if (!selectedDepartmentId) {
      return NextResponse.json({ error: 'No department specified' }, { status: 400 })
    }

    // Search by work order number or hull ID
    const workOrder = await prisma.workOrder.findFirst({
      where: {
        OR: [
          { number: { equals: query, mode: 'insensitive' } },
          { hullId: { equals: query, mode: 'insensitive' } }
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
          take: 1,
          include: {
            station: true,
            user: true
          }
        }
      }
    })

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    // Get only enabled stages and find current
    const enabledStages = workOrder.routingVersion.stages.filter(s => s.enabled).sort((a, b) => a.sequence - b.sequence)
    const currentStage = enabledStages[workOrder.currentStageIndex]
    
    if (!currentStage) {
      return NextResponse.json({ error: 'No current stage found' }, { status: 400 })
    }

    // Check if user has access to this stage (department scoped)
    if (selectedDepartmentId !== currentStage.workCenter.department.id) {
      return NextResponse.json({ error: 'Work order not in selected department' }, { status: 403 })
    }

    // Get the last event for display
    const lastEvent = workOrder.woStageLogs[0]

    // Get work instruction if available
    const workInstruction = currentStage.workInstructionVersions[0]

    return NextResponse.json({
      workOrder: {
        id: workOrder.id,
        number: workOrder.number,
        hullId: workOrder.hullId,
        productSku: workOrder.productSku,
        status: workOrder.status,
        priority: workOrder.priority,
        qty: workOrder.qty,
        currentStageIndex: workOrder.currentStageIndex,
        specSnapshot: workOrder.specSnapshot,
        currentStage: {
          id: currentStage.id,
          code: currentStage.code,
          name: currentStage.name,
          sequence: currentStage.sequence,
          enabled: currentStage.enabled,
          standardSeconds: currentStage.standardStageSeconds,
          workCenter: {
            id: currentStage.workCenter.id,
            name: currentStage.workCenter.name,
            department: {
              id: currentStage.workCenter.department.id,
              name: currentStage.workCenter.department.name
            },
            stations: currentStage.workCenter.stations
          },
          workInstruction: workInstruction ? {
            id: workInstruction.id,
            version: workInstruction.version,
            contentMd: workInstruction.contentMd
          } : null
        },
        lastEvent: lastEvent ? {
          event: lastEvent.event,
          createdAt: lastEvent.createdAt,
          station: lastEvent.station.name,
          user: lastEvent.user.email,
          note: lastEvent.note,
          goodQty: lastEvent.goodQty,
          scrapQty: lastEvent.scrapQty
        } : null,
        enabledStagesCount: enabledStages.length
      }
    })
  } catch (error) {
    console.error('Find work order error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}