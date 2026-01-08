import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '../../../../../lib/auth'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { WOStatus, Role } from '@prisma/client'

const holdSchema = z.object({
  reason: z.string().min(1),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is supervisor or admin
    if (user.role !== Role.SUPERVISOR && user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden - Supervisor or Admin only' }, { status: 403 })
    }

    const workOrderId = params.id
    const body = await request.json()
    const { reason } = holdSchema.parse(body)

    // Get work order
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
    })

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    // Check if already on hold
    if (workOrder.status === WOStatus.HOLD) {
      return NextResponse.json({ error: 'Work order is already on hold' }, { status: 400 })
    }

    // Store the previous status in audit log
    const previousStatus = workOrder.status

    // Update work order status to HOLD
    const updatedWorkOrder = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: WOStatus.HOLD },
    })

    // Create audit log with reason
    await prisma.auditLog.create({
      data: {
        actorId: user.userId,
        model: 'WorkOrder',
        modelId: workOrderId,
        action: 'HOLD',
        before: { status: previousStatus },
        after: { status: WOStatus.HOLD, reason, previousStatus },
      },
    })

    return NextResponse.json({
      success: true,
      message: `Work order ${workOrder.number} placed on hold`,
      workOrder: {
        id: updatedWorkOrder.id,
        number: updatedWorkOrder.number,
        status: updatedWorkOrder.status,
        previousStatus,
      },
    })
  } catch (error) {
    logger.error('Hold work order error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
