import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'
import { getUserFromRequest } from '../../../../lib/auth'
import { z } from 'zod'
import { WOStatus, WOEvent } from '@prisma/client'

const startWOSchema = z.object({
  workOrderNumber: z.string(),
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
    const { workOrderNumber, stationId, note } = startWOSchema.parse(body)

    // Find work order
    const workOrder = await prisma.workOrder.findUnique({
      where: { number: workOrderNumber },
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

    // Check if user is in the correct department for current stage
    const currentStage = workOrder.routingVersion.stages[workOrder.currentStageIndex]
    if (!currentStage) {
      return NextResponse.json({ error: 'No current stage found' }, { status: 400 })
    }

    if (user.departmentId !== currentStage.workCenter.department.id) {
      return NextResponse.json({ error: 'Not authorized for this stage' }, { status: 403 })
    }

    // Verify station belongs to current stage's work center
    const station = await prisma.station.findFirst({
      where: {
        id: stationId,
        workCenterId: currentStage.workCenterId,
        isActive: true
      }
    })

    if (!station) {
      return NextResponse.json({ error: 'Invalid station for current stage' }, { status: 400 })
    }

    // Create WO stage log entry
    await prisma.wOStageLog.create({
      data: {
        workOrderId: workOrder.id,
        routingStageId: currentStage.id,
        stationId: station.id,
        userId: user.userId,
        event: WOEvent.START,
        note: note || null
      }
    })

    // Update work order status if first time starting
    if (workOrder.status === WOStatus.RELEASED) {
      await prisma.workOrder.update({
        where: { id: workOrder.id },
        data: { status: WOStatus.IN_PROGRESS }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Started work on ${workOrderNumber} at station ${station.code}` 
    })
  } catch (error) {
    console.error('Start work order error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}