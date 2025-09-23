import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'
import { getUserFromRequest } from '../../../../lib/auth'
import { z } from 'zod'
import { WOStatus, WOEvent } from '@prisma/client'

const pauseWOSchema = z.object({
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
    const { workOrderNumber, stationId, note } = pauseWOSchema.parse(body)

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

    // Verify station and create log entry
    const currentStage = workOrder.routingVersion.stages[workOrder.currentStageIndex]
    if (!currentStage) {
      return NextResponse.json({ error: 'No current stage found' }, { status: 400 })
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

    // Update work order status to HOLD
    await prisma.workOrder.update({
      where: { id: workOrder.id },
      data: { status: WOStatus.HOLD }
    })

    return NextResponse.json({ 
      success: true, 
      message: `Paused work on ${workOrderNumber}` 
    })
  } catch (error) {
    console.error('Pause work order error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}