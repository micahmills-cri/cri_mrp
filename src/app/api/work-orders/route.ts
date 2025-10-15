import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getUserFromRequest } from "../../../lib/auth";
import {
  getPaginationParams,
  createPaginatedResponse,
} from "../../../lib/pagination";
import { z } from "zod";
import { WOStatus, Role } from "@prisma/client";
import {
  DATE_ONLY_REGEX,
  formatDateOnly,
  parseDateOnlyToUTC,
} from "@/server/work-orders/date-utils";

const dateOnlySchema = z
  .string()
  .regex(DATE_ONLY_REGEX, "Date must be in YYYY-MM-DD format");

const createWOSchema = z.object({
  number: z.string().optional(),
  hullId: z.string().min(1),
  productSku: z.string().optional().default(""),
  qty: z.number().int().min(1).default(1),
  model: z.string().min(1),
  trim: z.string().optional(),
  features: z.any().optional(), // JSON features
  routingVersionId: z.string(),
  priority: z
    .enum(["LOW", "NORMAL", "HIGH", "CRITICAL"])
    .optional()
    .default("NORMAL"),
  plannedStartDate: dateOnlySchema.nullable().optional(),
  plannedFinishDate: dateOnlySchema.nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is supervisor or admin
    if (user.role !== Role.SUPERVISOR && user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden - Supervisor or Admin only" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const data = createWOSchema.parse(body);

    const plannedStartDate = data.plannedStartDate
      ? parseDateOnlyToUTC(data.plannedStartDate)
      : null;
    const plannedFinishDate = data.plannedFinishDate
      ? parseDateOnlyToUTC(data.plannedFinishDate)
      : null;

    // Date validation
    if (plannedStartDate && plannedFinishDate) {
      if (plannedStartDate >= plannedFinishDate) {
        return NextResponse.json(
          {
            error: "Planned start date must be before planned finish date",
          },
          { status: 400 },
        );
      }

      // Check if start date is in the future
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (plannedStartDate < now) {
        return NextResponse.json(
          {
            error: "Planned start date must be in the future",
          },
          { status: 400 },
        );
      }
    }

    // Generate work order number if not provided
    const woNumber =
      data.number ||
      `WO-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Check if routing version exists
    const routingVersion = await prisma.routingVersion.findUnique({
      where: { id: data.routingVersionId },
      include: {
        stages: {
          where: { enabled: true },
          orderBy: { sequence: "asc" },
        },
      },
    });

    if (!routingVersion) {
      return NextResponse.json(
        { error: "Routing version not found" },
        { status: 404 },
      );
    }

    // Create work order with spec snapshot
    const workOrder = await prisma.workOrder.create({
      data: {
        number: woNumber,
        hullId: data.hullId,
        productSku: data.productSku,
        qty: data.qty,
        status: WOStatus.PLANNED,
        priority: (data.priority as any) || "NORMAL",
        plannedStartDate,
        plannedFinishDate,
        routingVersionId: data.routingVersionId,
        currentStageIndex: 0,
        specSnapshot: {
          model: data.model,
          trim: data.trim,
          features: data.features,
          routingVersionId: data.routingVersionId,
          stages: routingVersion.stages.map((s) => ({
            id: s.id,
            code: s.code,
            name: s.name,
            sequence: s.sequence,
            enabled: s.enabled,
            workCenterId: s.workCenterId,
            standardStageSeconds: s.standardStageSeconds,
          })),
        },
      },
    });

    // Create initial version (Version 1)
    const initialSnapshot = {
      number: workOrder.number,
      hullId: workOrder.hullId,
      productSku: workOrder.productSku,
      qty: workOrder.qty,
      status: workOrder.status,
      priority: workOrder.priority,
      plannedStartDate: formatDateOnly(workOrder.plannedStartDate),
      plannedFinishDate: formatDateOnly(workOrder.plannedFinishDate),
      routingVersionId: workOrder.routingVersionId,
      currentStageIndex: workOrder.currentStageIndex,
      specSnapshot: workOrder.specSnapshot,
      routingVersion: {
        model: routingVersion.model,
        trim: routingVersion.trim,
        version: routingVersion.version,
        stages: routingVersion.stages.map((s) => ({
          sequence: s.sequence,
          code: s.code,
          name: s.name,
          enabled: s.enabled,
          workCenterId: s.workCenterId,
          standardStageSeconds: s.standardStageSeconds,
        })),
      },
    };

    await prisma.workOrderVersion.create({
      data: {
        workOrderId: workOrder.id,
        versionNumber: 1,
        snapshotData: initialSnapshot,
        reason: "Initial creation",
        createdBy: user.userId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.userId,
        model: "WorkOrder",
        modelId: workOrder.id,
        action: "CREATE",
        after: workOrder,
      },
    });

    return NextResponse.json({
      success: true,
      workOrder: {
        id: workOrder.id,
        number: workOrder.number,
        hullId: workOrder.hullId,
        status: workOrder.status,
      },
    });
  } catch (error) {
    console.error("Create work order error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      // Return list of work orders with pagination
      const { cursor, limit } = getPaginationParams(searchParams);

      const workOrders = await prisma.workOrder.findMany({
        take: (limit ?? 20) + 1, // Fetch one extra to determine if there's more
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          routingVersion: true,
          _count: {
            select: {
              notes: true,
              attachments: true,
            },
          },
        },
      });

      const serialized = workOrders.map((wo) => ({
        ...wo,
        plannedStartDate: formatDateOnly(wo.plannedStartDate),
        plannedFinishDate: formatDateOnly(wo.plannedFinishDate),
      }));

      const paginatedResponse = createPaginatedResponse(
        serialized,
        limit ?? 20,
      );
      return NextResponse.json(paginatedResponse);
    }

    // Get specific work order with details
    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        routingVersion: {
          include: {
            stages: {
              orderBy: { sequence: "asc" },
              include: {
                workCenter: {
                  include: {
                    department: true,
                  },
                },
              },
            },
          },
        },
        woStageLogs: {
          orderBy: { createdAt: "desc" },
          include: {
            routingStage: true,
            station: true,
            user: true,
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

    // Check department scoping for non-admin users
    if (user.role !== Role.ADMIN && user.departmentId) {
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

    const serializedWorkOrder = {
      ...workOrder,
      plannedStartDate: formatDateOnly(workOrder.plannedStartDate),
      plannedFinishDate: formatDateOnly(workOrder.plannedFinishDate),
      routingVersion: {
        ...workOrder.routingVersion,
      },
      woStageLogs: workOrder.woStageLogs,
    };

    return NextResponse.json({ workOrder: serializedWorkOrder });
  } catch (error) {
    console.error("Get work order error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
