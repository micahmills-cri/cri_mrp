import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '../../../../lib/auth'
import { Role } from '@prisma/client'
import { z } from 'zod'

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
        priority: workOrder.priority,
        plannedStartDate: workOrder.plannedStartDate,
        plannedFinishDate: workOrder.plannedFinishDate,
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

// Schema for PATCH request validation
const updateWorkOrderSchema = z.object({
  hullId: z.string().min(1).optional(),
  productSku: z.string().min(1).optional(),
  qty: z.number().positive().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional(),
  plannedStartDate: z.string().datetime().optional().nullable(),
  plannedFinishDate: z.string().datetime().optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only supervisors and admins can update work orders
    if (user.role === Role.OPERATOR) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const workOrderId = params.id
    const body = await request.json()
    
    // Validate request body
    const validation = updateWorkOrderSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        errors: validation.error.flatten().fieldErrors
      }, { status: 400 })
    }

    const data = validation.data

    // Date validation
    if (data.plannedStartDate && data.plannedFinishDate) {
      const startDate = new Date(data.plannedStartDate)
      const finishDate = new Date(data.plannedFinishDate)
      
      if (startDate >= finishDate) {
        return NextResponse.json({
          error: 'Planned start date must be before planned finish date'
        }, { status: 400 })
      }

      // Check if start date is in the future (only for new/changed dates)
      const now = new Date()
      if (startDate < now) {
        return NextResponse.json({
          error: 'Planned start date must be in the future'
        }, { status: 400 })
      }
    }

    // Get current work order state for audit logging
    const currentWorkOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId }
    })

    if (!currentWorkOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    // Check if work order can be edited (only PLANNED and CANCELLED statuses)
    if (!['PLANNED', 'CANCELLED'].includes(currentWorkOrder.status)) {
      return NextResponse.json({
        error: 'Work order can only be edited in PLANNED or CANCELLED status'
      }, { status: 400 })
    }

    // Build update object with only changed fields
    const updateData: any = {}
    const changes: string[] = []

    if (data.hullId && data.hullId !== currentWorkOrder.hullId) {
      updateData.hullId = data.hullId
      changes.push(`Hull ID changed from ${currentWorkOrder.hullId} to ${data.hullId}`)
    }
    
    if (data.productSku && data.productSku !== currentWorkOrder.productSku) {
      updateData.productSku = data.productSku
      changes.push(`Product SKU changed from ${currentWorkOrder.productSku} to ${data.productSku}`)
    }
    
    if (data.qty !== undefined && data.qty !== currentWorkOrder.qty) {
      updateData.qty = data.qty
      changes.push(`Quantity changed from ${currentWorkOrder.qty} to ${data.qty}`)
    }
    
    if (data.priority && data.priority !== currentWorkOrder.priority) {
      updateData.priority = data.priority as any
      changes.push(`Priority changed from ${currentWorkOrder.priority} to ${data.priority}`)
    }
    
    if (data.plannedStartDate !== undefined) {
      const newDate = data.plannedStartDate ? new Date(data.plannedStartDate) : null
      updateData.plannedStartDate = newDate
      changes.push(`Planned start date ${newDate ? 'set to ' + newDate.toISOString() : 'cleared'}`)
    }
    
    if (data.plannedFinishDate !== undefined) {
      const newDate = data.plannedFinishDate ? new Date(data.plannedFinishDate) : null
      updateData.plannedFinishDate = newDate
      changes.push(`Planned finish date ${newDate ? 'set to ' + newDate.toISOString() : 'cleared'}`)
    }

    // Update work order with audit log
    const updatedWorkOrder = await prisma.$transaction(async (tx) => {
      // Update work order
      const updated = await tx.workOrder.update({
        where: { id: workOrderId },
        data: updateData,
        include: {
          routingVersion: true
        }
      })

      // Create audit log entries for each change
      if (changes.length > 0) {
        await tx.auditLog.createMany({
          data: changes.map(change => ({
            actorId: user.id,
            action: 'UPDATE',
            modelType: 'WorkOrder',
            modelId: workOrderId,
            changes: { message: change, ...updateData },
            metadata: { workOrderNumber: updated.number }
          }))
        })
      }

      return updated
    })

    return NextResponse.json({
      success: true,
      workOrder: updatedWorkOrder,
      changes: changes.length > 0 ? changes : ['No changes made']
    })
  } catch (error) {
    console.error('Update work order error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}