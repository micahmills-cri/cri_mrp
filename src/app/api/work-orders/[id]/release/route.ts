import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'
import { getUserFromRequest } from '../../../../../lib/auth'
import { WOStatus, Role, RoutingVersionStatus } from '@prisma/client'

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

    // Get work order with routing version
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        routingVersion: {
          include: {
            stages: {
              where: { enabled: true },
              orderBy: { sequence: 'asc' },
              include: {
                workCenter: {
                  include: { department: true }
                }
              }
            }
          }
        }
      }
    })

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    // Check if work order is in PLANNED status
    if (workOrder.status !== WOStatus.PLANNED) {
      return NextResponse.json({ error: 'Work order must be in PLANNED status to release' }, { status: 400 })
    }

    // Update routing version status to RELEASED if it's still DRAFT
    if (workOrder.routingVersion.status === RoutingVersionStatus.DRAFT) {
      await prisma.routingVersion.update({
        where: { id: workOrder.routingVersionId },
        data: {
          status: RoutingVersionStatus.RELEASED,
          releasedAt: new Date()
        }
      })
    }

    // Get fresh spec snapshot with enabled stages only
    const specSnapshot = {
      model: (workOrder.specSnapshot as any).model || '',
      trim: (workOrder.specSnapshot as any).trim || '',
      features: (workOrder.specSnapshot as any).features || {},
      routingVersionId: workOrder.routingVersionId,
      stages: workOrder.routingVersion.stages.map(s => ({
        id: s.id,
        code: s.code,
        name: s.name,
        sequence: s.sequence,
        enabled: s.enabled,
        workCenterId: s.workCenterId,
        standardStageSeconds: s.standardStageSeconds
      }))
    }

    // Update work order to RELEASED status
    const updatedWorkOrder = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        status: WOStatus.RELEASED,
        currentStageIndex: 0,
        specSnapshot: specSnapshot
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.userId,
        model: 'WorkOrder',
        modelId: workOrderId,
        action: 'RELEASE',
        before: { status: WOStatus.PLANNED },
        after: { status: WOStatus.RELEASED, specSnapshot }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Work order ${workOrder.number} released`,
      workOrder: {
        id: updatedWorkOrder.id,
        number: updatedWorkOrder.number,
        status: updatedWorkOrder.status,
        specSnapshot: updatedWorkOrder.specSnapshot
      }
    })
  } catch (error) {
    console.error('Release work order error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}