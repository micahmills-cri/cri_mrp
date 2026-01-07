import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getUserFromRequest } from "../../../../lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "SUPERVISOR" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Parse query parameters for filtering, sorting, and search
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const statusFilter = searchParams.getAll("status");
    const priorityFilter = searchParams.getAll("priority");
    const workCenterFilter = searchParams.get("workCenter") || "";
    const modelFilter = searchParams.get("model") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDir = (searchParams.get("sortDir") || "desc") as "asc" | "desc";

    // Build where clause dynamically
    const whereClause: Prisma.WorkOrderWhereInput = {
      status: {
        in: statusFilter.length > 0
          ? statusFilter as any[]
          : ["PLANNED", "RELEASED", "IN_PROGRESS", "HOLD", "COMPLETED"],
      },
    };

    // Add priority filter
    if (priorityFilter.length > 0) {
      whereClause.priority = { in: priorityFilter as any[] };
    }

    // Add search filter (search across multiple fields)
    if (search) {
      whereClause.OR = [
        { number: { contains: search, mode: "insensitive" } },
        { hullId: { contains: search, mode: "insensitive" } },
        { productSku: { contains: search, mode: "insensitive" } },
        { routingVersion: { model: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Add model filter via routing version
    if (modelFilter) {
      whereClause.routingVersion = {
        model: { contains: modelFilter, mode: "insensitive" },
      };
    }

    // Build orderBy clause
    let orderByClause: Prisma.WorkOrderOrderByWithRelationInput = { createdAt: "desc" };
    const validSortFields = ["createdAt", "priority", "plannedStartDate", "plannedFinishDate", "status", "number"];
    if (validSortFields.includes(sortBy)) {
      orderByClause = { [sortBy]: sortDir };
    }

    // Get ALL work orders for supervisors to see complete factory status
    const workOrders = await prisma.workOrder.findMany({
      where: whereClause,
      include: {
        routingVersion: {
          include: {
            stages: {
              orderBy: { sequence: "asc" },
              include: {
                workCenter: {
                  include: { department: true },
                },
              },
            },
          },
        },
        woStageLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            routingStage: true,
            station: true,
            user: true,
          },
        },
        _count: {
          select: {
            notes: true,
            attachments: true,
          },
        },
      },
      orderBy: orderByClause,
    });

    // Show all work orders to supervisors for complete factory visibility
    const filteredWorkOrders = workOrders;

    const workCenterOrdering = new Map<
      string,
      {
        id: string;
        name: string;
        departmentId: string;
        departmentName: string;
        sequence: number;
      }
    >();

    for (const wo of filteredWorkOrders) {
      for (const stage of wo.routingVersion.stages) {
        if (!stage.enabled) {
          continue;
        }

        const workCenter = stage.workCenter;
        if (!workCenter?.isActive) {
          continue;
        }

        const department = workCenter.department;
        if (!department) {
          continue;
        }

        const existing = workCenterOrdering.get(workCenter.id);
        if (!existing || stage.sequence < existing.sequence) {
          workCenterOrdering.set(workCenter.id, {
            id: workCenter.id,
            name: workCenter.name,
            departmentId: department.id,
            departmentName: department.name,
            sequence: stage.sequence,
          });
        }
      }
    }

    // Transform work orders for display
    const wipData = filteredWorkOrders.map((wo) => {
      const currentStage = wo.routingVersion.stages[wo.currentStageIndex];
      const lastLog = wo.woStageLogs[0];
      const workCenter = currentStage?.workCenter;
      const department = workCenter?.department;

      return {
        id: wo.id,
        number: wo.number,
        hullId: wo.hullId,
        productSku: wo.productSku,
        status: wo.status,
        priority: wo.priority,
        qty: wo.qty,
        plannedStartDate: wo.plannedStartDate,
        plannedFinishDate: wo.plannedFinishDate,
        currentStage: currentStage
          ? {
              id: currentStage.id,
              name: currentStage.name,
              code: currentStage.code,
              sequence: currentStage.sequence,
              workCenter: workCenter
                ? {
                    id: workCenter.id,
                    name: workCenter.name,
                  }
                : null,
              department: department
                ? {
                    id: department.id,
                    name: department.name,
                  }
                : null,
            }
          : null,
        lastEvent: lastLog
          ? {
              event: lastLog.event,
              time: lastLog.createdAt,
              user: lastLog.user.email,
              station: lastLog.station.code,
            }
          : null,
        createdAt: wo.createdAt,
        // Include count data for badges
        _count: wo._count,
      };
    });

    // Calculate summary metrics with trend data
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setTime(lastWeekEnd.getTime() - 1);

    const statusCounts = {
      RELEASED: filteredWorkOrders.filter((wo) => wo.status === "RELEASED")
        .length,
      IN_PROGRESS: filteredWorkOrders.filter(
        (wo) => wo.status === "IN_PROGRESS",
      ).length,
      COMPLETED: filteredWorkOrders.filter(
        (wo) =>
          wo.status === "COMPLETED" &&
          wo.woStageLogs.some((log) => log.createdAt >= today),
      ).length,
      HOLD: filteredWorkOrders.filter((wo) => wo.status === "HOLD").length,
    };

    // Calculate real trends based on historical data

    // Calculate weekday average for In Progress over past 4 weeks
    const fourWeeksAgo = new Date(today);
    fourWeeksAgo.setDate(today.getDate() - 28);

    // Get historical counts for weekdays only (Mon-Fri)
    const historicalInProgress = await prisma.workOrder.count({
      where: {
        status: "IN_PROGRESS",
        createdAt: {
          gte: fourWeeksAgo,
          lt: today,
        },
      },
    });

    // Simple weekday average calculation (20 weekdays in 4 weeks)
    const weekdayAvg = Math.round(historicalInProgress / 20) || 0;
    const inProgressTrend = statusCounts.IN_PROGRESS - weekdayAvg;

    // Calculate completed work orders for this week vs last week
    const completedThisWeek = await prisma.workOrder.count({
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: thisWeekStart,
        },
      },
    });

    const completedLastWeek = await prisma.workOrder.count({
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: lastWeekStart,
          lt: thisWeekStart,
        },
      },
    });

    const completedTrend = completedThisWeek - completedLastWeek;

    const trends = {
      inProgress: {
        current: statusCounts.IN_PROGRESS,
        weekdayAvg: weekdayAvg,
        trend: Math.abs(inProgressTrend),
        direction: inProgressTrend >= 0 ? "up" : "down",
      },
      completed: {
        thisWeek: completedThisWeek,
        lastWeek: completedLastWeek,
        trend: Math.abs(completedTrend),
        direction: completedTrend >= 0 ? "up" : "down",
      },
    };

    // Calculate average stage times per work center (simplified version)
    const workCenterTimes: Record<
      string,
      { totalTime: number; count: number }
    > = {};

    for (const wo of filteredWorkOrders) {
      const stageLogs = await prisma.wOStageLog.findMany({
        where: { workOrderId: wo.id },
        include: { routingStage: { include: { workCenter: true } } },
        orderBy: { createdAt: "asc" },
      });

      for (let i = 0; i < stageLogs.length - 1; i++) {
        const startLog = stageLogs[i];
        const endLog = stageLogs[i + 1];

        if (
          startLog.event === "START" &&
          endLog.event === "COMPLETE" &&
          startLog.routingStageId === endLog.routingStageId
        ) {
          const workCenterName = startLog.routingStage.workCenter.name;
          const timeInMinutes = Math.floor(
            (endLog.createdAt.getTime() - startLog.createdAt.getTime()) /
              (1000 * 60),
          );

          if (!workCenterTimes[workCenterName]) {
            workCenterTimes[workCenterName] = { totalTime: 0, count: 0 };
          }

          workCenterTimes[workCenterName].totalTime += timeInMinutes;
          workCenterTimes[workCenterName].count += 1;
        }
      }
    }

    const avgStageTimes = Object.entries(workCenterTimes).map(
      ([workCenter, data]) => ({
        workCenter,
        avgTimeMinutes: Math.round(data.totalTime / data.count) || 0,
      }),
    );

    const orderedWorkCenters = Array.from(workCenterOrdering.values()).sort(
      (a, b) => a.sequence - b.sequence,
    );

    // Get unique models for filter dropdown
    const uniqueModels = await prisma.routingVersion.findMany({
      select: { model: true },
      distinct: ["model"],
      orderBy: { model: "asc" },
    });

    // Apply work center filter post-query (since it's a nested relation)
    // Only filter work orders that have a current stage; others (PLANNED/RELEASED) pass through
    let finalWipData = wipData;
    if (workCenterFilter) {
      finalWipData = wipData.filter((wo) => {
        // If work order has no current stage (e.g., PLANNED), include it
        if (!wo.currentStage?.workCenter) {
          return true;
        }
        // Otherwise, check if it matches the work center filter
        return (
          wo.currentStage.workCenter.id === workCenterFilter ||
          wo.currentStage.workCenter.name
            .toLowerCase()
            .includes(workCenterFilter.toLowerCase())
        );
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        wipData: finalWipData,
        summary: {
          statusCounts,
          avgStageTimes,
          trends,
        },
        workCenters: orderedWorkCenters,
        filterOptions: {
          models: uniqueModels.map((m) => m.model),
          statuses: ["PLANNED", "RELEASED", "IN_PROGRESS", "HOLD", "COMPLETED"],
          priorities: ["STANDARD", "RUSH", "CRITICAL"],
        },
      },
    });
  } catch (error) {
    console.error("Supervisor dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
