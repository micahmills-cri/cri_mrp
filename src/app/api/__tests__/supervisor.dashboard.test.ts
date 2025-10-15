import { NextRequest } from "next/server";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { WOStatus, WOPriority } from "@prisma/client";

const {
  findManyMock,
  countMock,
  stageLogFindManyMock,
  getUserFromRequestMock,
} = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  countMock: vi.fn(),
  stageLogFindManyMock: vi.fn(),
  getUserFromRequestMock: vi.fn(),
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    workOrder: {
      findMany: findManyMock,
      count: countMock,
    },
    wOStageLog: {
      findMany: stageLogFindManyMock,
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getUserFromRequest: getUserFromRequestMock,
}));

import { GET } from "../supervisor/dashboard/route";

function buildRequest(url: string) {
  return new NextRequest(url);
}

describe("GET /api/supervisor/dashboard", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    countMock.mockReset();
    stageLogFindManyMock.mockReset();
    getUserFromRequestMock.mockReset();
  });

  it("returns stage metadata and an ordered work-center list", async () => {
    getUserFromRequestMock.mockReturnValue({
      userId: "user-1",
      role: "SUPERVISOR",
    });

    const createdAt = new Date("2025-02-01T00:00:00Z");

    findManyMock.mockResolvedValue([
      {
        id: "wo-1",
        number: "WO-1",
        hullId: "H1",
        productSku: "SKU-1",
        status: WOStatus.IN_PROGRESS,
        priority: WOPriority.HIGH,
        qty: 2,
        plannedStartDate: createdAt,
        plannedFinishDate: new Date("2025-02-05T00:00:00Z"),
        currentStageIndex: 1,
        createdAt,
        routingVersion: {
          stages: [
            {
              id: "stage-1",
              code: "CUT",
              name: "Cutting",
              sequence: 1,
              enabled: true,
              workCenter: {
                id: "wc-1",
                name: "Cutting Center",
                isActive: true,
                department: { id: "dept-1", name: "Cutting" },
              },
            },
            {
              id: "stage-2",
              code: "LAM",
              name: "Lamination",
              sequence: 2,
              enabled: true,
              workCenter: {
                id: "wc-2",
                name: "Lamination Center",
                isActive: true,
                department: { id: "dept-2", name: "Lamination" },
              },
            },
          ],
        },
        woStageLogs: [
          {
            event: "START",
            createdAt,
            user: { email: "operator@example.com" },
            station: { code: "CUT-1" },
          },
        ],
        _count: { notes: 1, attachments: 0 },
      },
      {
        id: "wo-2",
        number: "WO-2",
        hullId: "H2",
        productSku: "SKU-2",
        status: WOStatus.RELEASED,
        priority: WOPriority.NORMAL,
        qty: 1,
        plannedStartDate: null,
        plannedFinishDate: null,
        currentStageIndex: 0,
        createdAt,
        routingVersion: {
          stages: [
            {
              id: "stage-3",
              code: "QA",
              name: "Quality Assurance",
              sequence: 3,
              enabled: true,
              workCenter: {
                id: "wc-3",
                name: "QA Bay",
                isActive: true,
                department: { id: "dept-3", name: "QA" },
              },
            },
          ],
        },
        woStageLogs: [],
        _count: { notes: 0, attachments: 1 },
      },
    ]);

    countMock.mockResolvedValue(0);
    stageLogFindManyMock.mockResolvedValue([]);

    const response = await GET(
      buildRequest("https://example.com/api/supervisor/dashboard"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);

    const [firstWorkOrder] = payload.data.wipData;
    expect(firstWorkOrder).toMatchObject({
      id: "wo-1",
      priority: WOPriority.HIGH,
      plannedStartDate: createdAt.toISOString(),
      currentStage: {
        id: "stage-2",
        sequence: 2,
        workCenter: { id: "wc-2", name: "Lamination Center" },
        department: { id: "dept-2", name: "Lamination" },
      },
    });

    expect(payload.data.workCenters).toEqual([
      {
        id: "wc-1",
        name: "Cutting Center",
        departmentId: "dept-1",
        departmentName: "Cutting",
        sequence: 1,
      },
      {
        id: "wc-2",
        name: "Lamination Center",
        departmentId: "dept-2",
        departmentName: "Lamination",
        sequence: 2,
      },
      {
        id: "wc-3",
        name: "QA Bay",
        departmentId: "dept-3",
        departmentName: "QA",
        sequence: 3,
      },
    ]);
  });
});
