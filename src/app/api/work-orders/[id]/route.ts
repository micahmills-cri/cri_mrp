import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getUserFromRequest } from "../../../../lib/auth";
import { Role } from "@prisma/client";
import { z } from "zod";
import { WORK_ORDER_SNAPSHOT_SCHEMA_HASH } from "@/server/work-orders/snapshot-metadata";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workOrderId = params.id;

    // Get work order with full details
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        routingVersion: {
          include: {
            stages: {
              orderBy: { sequence: "asc" },
              include: {
                workCenter: {
                  include: {
                    department: true,
                    stations: {
                      where: { isActive: true },
                    },
                  },
                },
                workInstructionVersions: {
                  where: { isActive: true },
                  orderBy: { version: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
        woStageLogs: {
          orderBy: { createdAt: "desc" },
          include: {
            routingStage: {
              include: {
                workCenter: true,
              },
            },
            station: true,
            user: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    // Check department scoping for operators only (admin and supervisor have full access)
    if (user.role === Role.OPERATOR && user.departmentId) {
      const enabledStages = workOrder.routingVersion.stages.filter(
        (s) => s.enabled,
      );
      const currentStage = enabledStages[workOrder.currentStageIndex];

      if (
        currentStage &&
        currentStage.workCenter.department.id !== user.departmentId
      ) {
        return NextResponse.json(
          { error: "Work order not in your department" },
          { status: 403 },
        );
      }
    }

    // Calculate stage timeline
    const stageTimeline = workOrder.woStageLogs.reduce(
      (timeline, log) => {
        const stageId = log.routingStage.id;
        if (!timeline[stageId]) {
          timeline[stageId] = {
            stageId,
            stageName: log.routingStage.name,
            stageCode: log.routingStage.code,
            workCenter: log.routingStage.workCenter.name,
            events: [],
          };
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
          note: log.note,
        });

        return timeline;
      },
      {} as Record<string, any>,
    );

    // Get enabled stages for progress tracking
    const enabledStages = workOrder.routingVersion.stages.filter(
      (s) => s.enabled,
    );
    const currentStage = enabledStages[workOrder.currentStageIndex];

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
          status: workOrder.routingVersion.status,
        },
        currentStage: currentStage
          ? {
              id: currentStage.id,
              code: currentStage.code,
              name: currentStage.name,
              sequence: currentStage.sequence,
              workCenter: currentStage.workCenter.name,
              department: currentStage.workCenter.department.name,
              standardSeconds: currentStage.standardStageSeconds,
            }
          : null,
        enabledStages: enabledStages.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          sequence: s.sequence,
          enabled: s.enabled,
          workCenter: s.workCenter.name,
          department: s.workCenter.department.name,
        })),
        stageTimeline: Object.values(stageTimeline),
        notes: workOrder.woStageLogs
          .filter((log) => log.note)
          .map((log) => ({
            note: log.note,
            event: log.event,
            stage: log.routingStage.name,
            user: log.user.email,
            createdAt: log.createdAt,
          })),
      },
    });
  } catch (error) {
    console.error("Get work order details error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Schema for PATCH request validation
const updateWorkOrderSchema = z.object({
  hullId: z.string().min(1).optional(),
  productSku: z.string().min(1).optional(),
  qty: z.number().positive().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).optional(),
  plannedStartDate: z.string().datetime().optional().nullable(),
  plannedFinishDate: z.string().datetime().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only supervisors and admins can update work orders
    if (user.role === Role.OPERATOR) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const workOrderId = params.id;
    const body = await request.json();

    // Validate request body
    const validation = updateWorkOrderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    const requestedStart =
      data.plannedStartDate === undefined
        ? undefined
        : data.plannedStartDate
          ? new Date(data.plannedStartDate)
          : null;
    const requestedFinish =
      data.plannedFinishDate === undefined
        ? undefined
        : data.plannedFinishDate
          ? new Date(data.plannedFinishDate)
          : null;

    const currentWorkOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });

    if (!currentWorkOrder) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    const finalStart =
      requestedStart !== undefined
        ? requestedStart
        : currentWorkOrder.plannedStartDate;
    const finalFinish =
      requestedFinish !== undefined
        ? requestedFinish
        : currentWorkOrder.plannedFinishDate;

    if (finalStart && finalFinish && finalStart >= finalFinish) {
      return NextResponse.json(
        {
          error: "Planned start date must be before planned finish date",
        },
        { status: 400 },
      );
    }

    const editableStatuses = [
      "PLANNED",
      "RELEASED",
      "IN_PROGRESS",
      "HOLD",
      "CANCELLED",
    ];
    if (!editableStatuses.includes(currentWorkOrder.status)) {
      return NextResponse.json(
        {
          error: "Work order can only be edited while active",
        },
        { status: 400 },
      );
    }

    const updateData: Record<string, any> = {};
    const changes: string[] = [];

    const planningStatuses = ["PLANNED", "CANCELLED"] as const;
    const isPlanningPhase = planningStatuses.includes(currentWorkOrder.status);

    if (
      data.hullId &&
      data.hullId !== currentWorkOrder.hullId &&
      !isPlanningPhase
    ) {
      return NextResponse.json(
        {
          error: "Hull cannot be changed once the work order is active",
        },
        { status: 400 },
      );
    }
    if (
      data.productSku &&
      data.productSku !== currentWorkOrder.productSku &&
      !isPlanningPhase
    ) {
      return NextResponse.json(
        {
          error: "Product SKU cannot be changed once the work order is active",
        },
        { status: 400 },
      );
    }
    if (
      data.qty !== undefined &&
      data.qty !== currentWorkOrder.qty &&
      !isPlanningPhase
    ) {
      return NextResponse.json(
        {
          error: "Quantity cannot be changed once the work order is active",
        },
        { status: 400 },
      );
    }

    if (data.hullId && data.hullId !== currentWorkOrder.hullId) {
      updateData.hullId = data.hullId;
      changes.push(
        `Hull ID changed from ${currentWorkOrder.hullId} to ${data.hullId}`,
      );
    }

    if (data.productSku && data.productSku !== currentWorkOrder.productSku) {
      updateData.productSku = data.productSku;
      changes.push(
        `Product SKU changed from ${currentWorkOrder.productSku} to ${data.productSku}`,
      );
    }

    if (data.qty !== undefined && data.qty !== currentWorkOrder.qty) {
      updateData.qty = data.qty;
      changes.push(
        `Quantity changed from ${currentWorkOrder.qty} to ${data.qty}`,
      );
    }

    const currentPriority = currentWorkOrder.priority as string | null;
    if (data.priority && data.priority !== currentPriority) {
      updateData.priority = data.priority as any;
      const previousPriority = currentPriority ?? "NORMAL";
      changes.push(
        `Priority changed from ${previousPriority} to ${data.priority}`,
      );
    }

    if (requestedStart !== undefined) {
      const currentStartIso = currentWorkOrder.plannedStartDate
        ? currentWorkOrder.plannedStartDate.toISOString()
        : null;
      const newStartIso = requestedStart ? requestedStart.toISOString() : null;

      if (currentStartIso !== newStartIso) {
        updateData.plannedStartDate = requestedStart;
        const previousLabel = currentStartIso ?? "not set";
        const nextLabel = newStartIso ?? "cleared";
        changes.push(
          `Planned start date changed from ${previousLabel} to ${nextLabel}`,
        );
      }
    }

    if (requestedFinish !== undefined) {
      const currentFinishIso = currentWorkOrder.plannedFinishDate
        ? currentWorkOrder.plannedFinishDate.toISOString()
        : null;
      const newFinishIso = requestedFinish
        ? requestedFinish.toISOString()
        : null;

      if (currentFinishIso !== newFinishIso) {
        updateData.plannedFinishDate = requestedFinish;
        const previousLabel = currentFinishIso ?? "not set";
        const nextLabel = newFinishIso ?? "cleared";
        changes.push(
          `Planned finish date changed from ${previousLabel} to ${nextLabel}`,
        );
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: true,
        workOrder: currentWorkOrder,
        changes: ["No changes detected"],
      });
    }

    const updatedWorkOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.workOrder.update({
        where: { id: workOrderId },
        data: updateData,
        include: {
          routingVersion: {
            include: {
              stages: {
                orderBy: { sequence: "asc" },
              },
            },
          },
        },
      });

      if (changes.length > 0) {
        const serializedUpdateData = Object.fromEntries(
          Object.entries(updateData).map(([key, value]) => [
            key,
            value instanceof Date ? value.toISOString() : value,
          ])
        );
        await tx.auditLog.createMany({
          data: changes.map((change) => ({
            actorId: user.userId,
            action: "UPDATE",
            modelType: "WorkOrder",
            modelId: workOrderId,
            changes: { message: change, ...serializedUpdateData },
            metadata: { workOrderNumber: updated.number },
          })),
        });

        const latestVersion = await tx.workOrderVersion.findFirst({
          where: { workOrderId },
          orderBy: { versionNumber: "desc" },
        });

        const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;
        const snapshot = {
          schema_hash: WORK_ORDER_SNAPSHOT_SCHEMA_HASH,
          versionNumber: newVersionNumber,
          number: updated.number,
          hullId: updated.hullId,
          productSku: updated.productSku,
          qty: updated.qty,
          status: updated.status,
          priority: updated.priority,
          plannedStartDate: updated.plannedStartDate?.toISOString() ?? null,
          plannedFinishDate: updated.plannedFinishDate?.toISOString() ?? null,
          routingVersionId: updated.routingVersionId,
          currentStageIndex: updated.currentStageIndex,
          specSnapshot: updated.specSnapshot,
          routingVersion: updated.routingVersion
            ? {
                model: updated.routingVersion.model,
                trim: updated.routingVersion.trim,
                version: updated.routingVersion.version,
                stages: [...updated.routingVersion.stages]
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((stage) => ({
                    sequence: stage.sequence,
                    code: stage.code,
                    name: stage.name,
                    enabled: stage.enabled,
                    workCenterId: stage.workCenterId,
                  standardStageSeconds: stage.standardStageSeconds,
                })),
              }
            : null,
        };

        const reasonSuffix = changes.join(" | ");
        const versionReason =
          changes.length === 1
            ? changes[0]
            : `Planning details updated: ${reasonSuffix}`;

        await tx.workOrderVersion.create({
          data: {
            workOrderId,
            versionNumber: newVersionNumber,
            snapshotData: snapshot,
            reason: versionReason.slice(0, 255),
            createdBy: user.email || user.userId || user.id,
          },
        });
      }

      return updated;
    });

    return NextResponse.json({
      success: true,
      workOrder: updatedWorkOrder,
      changes,
    });
  } catch (error) {
    console.error("Update work order error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
