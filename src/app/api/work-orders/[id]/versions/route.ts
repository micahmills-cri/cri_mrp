import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '../../../../../lib/auth'
import { logger } from '@/lib/logger'
import { Role } from '@prisma/client'

// GET all versions for a work order
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workOrderId = params.id

    // Get all versions for the work order
    const versions = await prisma.workOrderVersion.findMany({
      where: { workOrderId },
      orderBy: { versionNumber: 'desc' },
    })

    return NextResponse.json({
      success: true,
      versions: versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        reason: v.reason,
        createdBy: v.createdBy,
        createdAt: v.createdAt,
        snapshot: v.snapshotData,
      })),
    })
  } catch (error) {
    logger.error('Get work order versions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create a new version snapshot
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only supervisors and admins can create versions
    if (user.role === Role.OPERATOR) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const workOrderId = params.id
    const { reason } = await request.json()

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
    }

    // Get current work order state
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        routingVersion: {
          include: {
            stages: true,
          },
        },
      },
    })

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    // Get the latest version number
    const latestVersion = await prisma.workOrderVersion.findFirst({
      where: { workOrderId },
      orderBy: { versionNumber: 'desc' },
    })

    const newVersionNumber = (latestVersion?.versionNumber || 0) + 1

    // Create snapshot of current state
    const snapshot = {
      number: workOrder.number,
      hullId: workOrder.hullId,
      productSku: workOrder.productSku,
      qty: workOrder.qty,
      status: workOrder.status,
      priority: workOrder.priority,
      plannedStartDate: workOrder.plannedStartDate,
      plannedFinishDate: workOrder.plannedFinishDate,
      routingVersionId: workOrder.routingVersionId,
      currentStageIndex: workOrder.currentStageIndex,
      specSnapshot: workOrder.specSnapshot,
      routingVersion: {
        model: workOrder.routingVersion.model,
        trim: workOrder.routingVersion.trim,
        version: workOrder.routingVersion.version,
        stages: workOrder.routingVersion.stages.map((s) => ({
          sequence: s.sequence,
          code: s.code,
          name: s.name,
          enabled: s.enabled,
          workCenterId: s.workCenterId,
          standardStageSeconds: s.standardStageSeconds,
        })),
      },
    }

    // Create version with audit log
    const newVersion = await prisma.$transaction(async (tx) => {
      const version = await tx.workOrderVersion.create({
        data: {
          workOrderId,
          versionNumber: newVersionNumber,
          snapshotData: snapshot,
          reason,
          createdBy: user.email,
        },
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          action: 'CREATE',
          model: 'WorkOrderVersion',
          modelId: version.id,
          after: { reason, versionNumber: newVersionNumber, workOrderNumber: workOrder.number },
        },
      })

      return version
    })

    return NextResponse.json({
      success: true,
      version: {
        id: newVersion.id,
        versionNumber: newVersion.versionNumber,
        reason: newVersion.reason,
        createdBy: newVersion.createdBy,
        createdAt: newVersion.createdAt,
      },
    })
  } catch (error) {
    logger.error('Create work order version error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
