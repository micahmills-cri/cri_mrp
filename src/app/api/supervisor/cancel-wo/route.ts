import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getUserFromRequest } from "../../../../lib/auth";
import { Role } from "@prisma/client";
import { formatDateOnly } from "@/server/work-orders/date-utils";

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only supervisors and admins can cancel work orders
    if (user.role !== Role.SUPERVISOR && user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const { workOrderId } = await request.json();

    if (!workOrderId) {
      return NextResponse.json(
        { error: "Work order ID is required" },
        { status: 400 },
      );
    }

    // Get current work order
    const currentWorkOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        routingVersion: {
          include: {
            stages: true,
          },
        },
      },
    });

    if (!currentWorkOrder) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    // Check if work order can be cancelled
    if (["COMPLETED", "CLOSED"].includes(currentWorkOrder.status)) {
      return NextResponse.json(
        {
          error: "Cannot cancel completed or closed work orders",
        },
        { status: 400 },
      );
    }

    if (currentWorkOrder.status === "CANCELLED") {
      return NextResponse.json(
        {
          error: "Work order is already cancelled",
        },
        { status: 400 },
      );
    }

    // Cancel work order with version creation and audit log
    const cancelledWorkOrder = await prisma.$transaction(async (tx) => {
      // Get latest version number
      const latestVersion = await tx.workOrderVersion.findFirst({
        where: { workOrderId },
        orderBy: { versionNumber: "desc" },
      });

      const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;

      // Create snapshot before cancellation
      const snapshot = {
        number: currentWorkOrder.number,
        hullId: currentWorkOrder.hullId,
        productSku: currentWorkOrder.productSku,
        qty: currentWorkOrder.qty,
        status: "CANCELLED",
        priority: (currentWorkOrder as any).priority || "NORMAL",
        plannedStartDate: formatDateOnly(currentWorkOrder.plannedStartDate),
        plannedFinishDate: formatDateOnly(currentWorkOrder.plannedFinishDate),
        routingVersionId: currentWorkOrder.routingVersionId,
        currentStageIndex: currentWorkOrder.currentStageIndex,
        specSnapshot: currentWorkOrder.specSnapshot,
        routingVersion: {
          model: currentWorkOrder.routingVersion.model,
          trim: currentWorkOrder.routingVersion.trim,
          version: currentWorkOrder.routingVersion.version,
          stages: currentWorkOrder.routingVersion.stages.map((s) => ({
            sequence: s.sequence,
            code: s.code,
            name: s.name,
            enabled: s.enabled,
            workCenterId: s.workCenterId,
            standardStageSeconds: s.standardStageSeconds,
          })),
        },
      };

      // Create version for cancellation
      await tx.workOrderVersion.create({
        data: {
          workOrderId,
          versionNumber: newVersionNumber,
          snapshotData: snapshot,
          reason: "Work order cancelled",
          createdBy: user.userId,
        },
      });

      // Update work order status
      const updated = await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          status: "CANCELLED" as any,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          action: "UPDATE",
          model: "WorkOrder",
          modelId: workOrderId,
          before: { status: currentWorkOrder.status },
          after: { status: "CANCELLED" },
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: "Work order cancelled successfully",
      workOrder: cancelledWorkOrder,
    });
  } catch (error) {
    console.error("Cancel work order error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
