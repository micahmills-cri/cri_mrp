import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '../../../../lib/auth'
import { z } from 'zod'
import { WOStatus, WOEvent } from '@prisma/client'

const completeWOSchema = z.object({
  workOrderId: z.string(),
  stationId: z.string(),
  goodQty: z.number().min(0),
  scrapQty: z.number().min(0).optional(),
  note: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workOrderId, stationId, goodQty, scrapQty = 0, note } = completeWOSchema.parse(body)
    
    // Get selected department from query params, fallback to user's assigned department
    const { searchParams } = new URL(request.url)
    const selectedDepartmentId = searchParams.get('departmentId') || user.departmentId

    if (!selectedDepartmentId) {
      return NextResponse.json({ error: 'No department specified' }, { status: 400 })
    }

    // Find work order with current stage
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

    // Check work order status - can't complete if on HOLD
    if (workOrder.status === WOStatus.HOLD) {
      return NextResponse.json({ error: 'Work order is on hold' }, { status: 409 })
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

    // Verify station
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

    // Create completion log entry
    await prisma.wOStageLog.create({
      data: {
        workOrderId: workOrder.id,
        routingStageId: currentStage.id,
        stationId: station.id,
        userId: user.userId,
        event: WOEvent.COMPLETE,
        goodQty,
        scrapQty,
        note: note || null
      }
    })

    // Check if this is the last enabled stage
    const isLastStage = workOrder.currentStageIndex >= enabledStages.length - 1

    let newStatus = workOrder.status
    let newStageIndex = workOrder.currentStageIndex

    if (isLastStage) {
      newStatus = WOStatus.COMPLETED
    } else {
      newStatus = WOStatus.RELEASED // Ready for next stage
      newStageIndex = workOrder.currentStageIndex + 1
    }

    // Update work order
    await prisma.workOrder.update({
      where: { id: workOrder.id },
      data: {
        status: newStatus,
        currentStageIndex: newStageIndex
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: isLastStage 
        ? `Completed work order ${workOrder.number}` 
        : `Completed stage ${currentStage.name} for ${workOrder.number}`,
      isComplete: isLastStage
    })
  } catch (error) {
    console.error('Complete work order error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}