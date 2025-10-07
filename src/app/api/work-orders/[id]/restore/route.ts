import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '../../../../../lib/auth'
import { Role, WOStatus, WOPriority } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only supervisors and admins can restore versions
    if (user.role === Role.OPERATOR) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const workOrderId = params.id
    const { versionId } = await request.json()

    if (!versionId) {
      return NextResponse.json({ error: 'Version ID is required' }, { status: 400 })
    }

    // Get the version to restore
    const version = await prisma.workOrderVersion.findUnique({
      where: { id: versionId }
    })

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    if (version.workOrderId !== workOrderId) {
      return NextResponse.json({ error: 'Version does not belong to this work order' }, { status: 400 })
    }

    // Get current work order state for comparison
    const currentWorkOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId }
    })

    if (!currentWorkOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    // Extract data from snapshot
    const snapshot = version.snapshotData as any

    // Restore work order with version creation and audit log
    const restoredWorkOrder = await prisma.$transaction(async (tx) => {
      // Update work order to match snapshot
      const updated = await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          hullId: snapshot.hullId,
          productSku: snapshot.productSku,
          qty: snapshot.qty,
          status: snapshot.status as WOStatus,
          priority: snapshot.priority as WOPriority,
          plannedStartDate: snapshot.plannedStartDate ? new Date(snapshot.plannedStartDate) : null,
          plannedFinishDate: snapshot.plannedFinishDate ? new Date(snapshot.plannedFinishDate) : null,
          currentStageIndex: snapshot.currentStageIndex,
          specSnapshot: snapshot.specSnapshot
        }
      })

      // Get latest version number for new version
      const latestVersion = await tx.workOrderVersion.findFirst({
        where: { workOrderId },
        orderBy: { versionNumber: 'desc' }
      })

      const newVersionNumber = (latestVersion?.versionNumber || 0) + 1

      // Create new version after restore
      await tx.workOrderVersion.create({
        data: {
          workOrderId,
          versionNumber: newVersionNumber,
          snapshotData: snapshot,
          reason: `Restored from Version ${version.versionNumber}`,
          createdBy: user.email
        }
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'RESTORE',
          modelType: 'WorkOrder',
          modelId: workOrderId,
          changes: { 
            restoredFromVersion: version.versionNumber,
            reason: `Restored from Version ${version.versionNumber}`
          },
          metadata: { workOrderNumber: updated.number }
        }
      })

      return updated
    })

    return NextResponse.json({
      success: true,
      message: `Work order restored to Version ${version.versionNumber}`,
      workOrder: restoredWorkOrder
    })
  } catch (error) {
    console.error('Restore work order version error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}