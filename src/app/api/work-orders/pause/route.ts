import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'
import { getUserFromRequest } from '../../../../lib/auth'
import { z } from 'zod'
import { WOStatus, WOEvent } from '@prisma/client'

const pauseWOSchema = z.object({
  workOrderId: z.string(),
  stationId: z.string(),
  note: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workOrderId, stationId, note } = pauseWOSchema.parse(body)
    
    // Get selected department from query params, fallback to user's assigned department
    const { searchParams } = new URL(request.url)
    const selectedDepartmentId = searchParams.get('departmentId') || user.departmentId

    if (!selectedDepartmentId) {
      return NextResponse.json({ error: 'No department specified' }, { status: 400 })
    }

    // Find work order
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        routingVersion: {
          include: {
            stages: {
              orderBy: { sequence: 'asc' },
              include: { workCenter: { include: { department: true } } }
            }
          }
        }
      }
    })

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    // Check work order status - can't pause if on HOLD
    if (workOrder.status === WOStatus.HOLD) {
      return NextResponse.json({ error: 'Work order is already on hold' }, { status: 409 })
    }

    // Get only enabled stages
    const enabledStages = workOrder.routingVersion.stages.filter(s => s.enabled).sort((a, b) => a.sequence - b.sequence)
    const currentStage = enabledStages[workOrder.currentStageIndex]
    if (!currentStage) {
      return NextResponse.json({ error: 'No current stage found' }, { status: 400 })
    }

    // Check if selected department matches current stage
    if (selectedDepartmentId !== currentStage.workCenter.department.id) {
      return NextResponse.json({ error: 'Not authorized for this stage' }, { status: 403 })
    }

    const station = await prisma.station.findFirst({
      where: {
        id: stationId,
        workCenterId: currentStage.workCenterId,
        isActive: true
      }
    })

    if (!station) {
      return NextResponse.json({ error: 'Invalid station' }, { status: 400 })
    }

    await prisma.wOStageLog.create({
      data: {
        workOrderId: workOrder.id,
        routingStageId: currentStage.id,
        stationId: station.id,
        userId: user.userId,
        event: WOEvent.PAUSE,
        note: note || null
      }
    })

    // Don't update work order status for pause - it stays as is
    // Pause is just logged, not a status change

    return NextResponse.json({ 
      success: true, 
      message: `Paused work on ${workOrder.number}` 
    })
  } catch (error) {
    console.error('Pause work order error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}