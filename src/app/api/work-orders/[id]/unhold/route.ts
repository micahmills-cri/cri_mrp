import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'
import { getUserFromRequest } from '../../../../../lib/auth'
import { WOStatus, Role } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get work order
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId }
    })

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    // Check if on hold
    if (workOrder.status !== WOStatus.HOLD) {
      return NextResponse.json({ error: 'Work order is not on hold' }, { status: 400 })
    }

    // Get the last audit log to find previous status
    const lastHoldAudit = await prisma.auditLog.findFirst({
      where: {
        modelId: workOrderId,
        model: 'WorkOrder',
        action: 'HOLD'
      },
      orderBy: { createdAt: 'desc' }
    })

    // Determine status to restore
    let restoreStatus = WOStatus.RELEASED // Default
    if (lastHoldAudit && lastHoldAudit.after) {
      const afterData = lastHoldAudit.after as any
      if (afterData.previousStatus) {
        restoreStatus = afterData.previousStatus as WOStatus
      }
    }

    // Update work order status
    const updatedWorkOrder = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: restoreStatus }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.userId,
        model: 'WorkOrder',
        modelId: workOrderId,
        action: 'UNHOLD',
        before: { status: WOStatus.HOLD },
        after: { status: restoreStatus }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Work order ${workOrder.number} removed from hold`,
      workOrder: {
        id: updatedWorkOrder.id,
        number: updatedWorkOrder.number,
        status: updatedWorkOrder.status
      }
    })
  } catch (error) {
    console.error('Unhold work order error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}