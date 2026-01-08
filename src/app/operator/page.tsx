"use client";

import { useState, useEffect, useCallback } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";

import {
  ActionButton,
  Button,
  PauseButton,
  SecondaryButton,
  StartButton,
} from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import FileListDisplay from "@/components/FileListDisplay";
import NotesTimeline from "@/components/NotesTimeline";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";

type Station = {
  id: string;
  code: string;
  name: string;
};

type QueueWorkOrder = {
  id: string;
  number: string;
  hullId: string;
  productSku: string;
  status: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  qty: number;
  currentStage: {
    id: string;
    code: string;
    name: string;
    sequence: number;
    workCenter: {
      id: string;
      name: string;
    };
    stations: Station[];
  };
  lastEvent: {
    event: string;
    createdAt: string;
    station: string;
    user: string;
  } | null;
  currentStageIndex: number;
  totalEnabledStages: number;
  createdAt: string;
};

type WorkOrderDetails = {
  workOrder: {
    id: string;
    number: string;
    hullId: string;
    productSku: string;
    status: string;
    priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
    qty: number;
    currentStageIndex: number;
    specSnapshot: any;
    currentStage: {
      id: string;
      code: string;
      name: string;
      sequence: number;
      enabled: boolean;
      standardSeconds: number;
      workCenter: {
        id: string;
        name: string;
        department: {
          id: string;
          name: string;
        };
        stations: Station[];
      };
      workInstruction: {
        id: string;
        version: number;
        contentMd: string;
      } | null;
    };
    lastEvent: {
      event: string;
      createdAt: string;
      station: string;
      user: string;
      note: string | null;
      goodQty: number;
      scrapQty: number;
    } | null;
    enabledStagesCount: number;
  };
};

type Department = {
  id: string;
  name: string;
};

const queueStatusVariants: Record<string, string> = {
  READY:
    "border-[var(--status-neutral-border)] bg-[var(--status-neutral-surface)] text-[color:var(--status-neutral-foreground)]",
  IN_PROGRESS:
    "border-[var(--status-info-border)] bg-[var(--status-info-surface)] text-[color:var(--status-info-foreground)]",
  HOLD:
    "border-[var(--status-warning-border)] bg-[var(--status-warning-surface)] text-[color:var(--status-warning-foreground)]",
};

const workOrderStatusVariants: Record<string, string> = {
  IN_PROGRESS:
    "border-[var(--status-info-border)] bg-[var(--status-info-surface)] text-[color:var(--status-info-foreground)]",
  HOLD:
    "border-[var(--status-warning-border)] bg-[var(--status-warning-surface)] text-[color:var(--status-warning-foreground)]",
  COMPLETED:
    "border-[var(--status-success-border)] bg-[var(--status-success-surface)] text-[color:var(--status-success-foreground)]",
  CANCELLED:
    "border-[var(--status-danger-border)] bg-[var(--status-danger-surface)] text-[color:var(--status-danger-foreground)]",
};

const fallbackStatusClass =
  "border-[var(--border)] bg-[var(--surface-muted)] text-[color:var(--muted-strong)]";

const priorityVariants: Record<string, string> = {
  LOW: "border-[var(--border)] bg-[var(--surface-muted)] text-[color:var(--muted-strong)]",
  NORMAL: "border-[var(--status-info-border)] bg-[var(--status-info-surface)] text-[color:var(--status-info-foreground)]",
  HIGH: "border-[var(--status-warning-border)] bg-[var(--status-warning-surface)] text-[color:var(--status-warning-foreground)]",
  CRITICAL: "border-[var(--status-danger-border)] bg-[var(--status-danger-surface)] text-[color:var(--status-danger-foreground)]",
};

const formatDate = (value: string) => new Date(value).toLocaleString();

export default function OperatorConsole() {
  const [department, setDepartment] = useState<Department | null>(null);
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [queue, setQueue] = useState<QueueWorkOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderDetails | null>(
    null,
  );
  const [selectedStation, setSelectedStation] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [openLoadingId, setOpenLoadingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    null | "start" | "pause" | "complete"
  >(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [goodQty, setGoodQty] = useState("");
  const [scrapQty, setScrapQty] = useState("");
  const [isActionPanelOpen, setIsActionPanelOpen] = useState(false);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [notesCount, setNotesCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const savedStation = localStorage.getItem("operator-selected-station");
    const savedDepartmentId = localStorage.getItem("operator-selected-department");
    if (savedStation) {
      setSelectedStation(savedStation);
    }
    if (savedDepartmentId) {
      setSelectedDepartmentId(savedDepartmentId);
    }
  }, []);

  useEffect(() => {
    if (selectedStation) {
      localStorage.setItem("operator-selected-station", selectedStation);
    }
  }, [selectedStation]);

  useEffect(() => {
    if (selectedDepartmentId) {
      localStorage.setItem("operator-selected-department", selectedDepartmentId);
    }
  }, [selectedDepartmentId]);

  useEffect(() => {
    fetch("/api/auth/me", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) {
          router.push("/login");
        } else if (!selectedDepartmentId && data.user?.departmentId) {
          setSelectedDepartmentId(data.user.departmentId);
        }
      })
      .catch(() => router.push("/login"));
  }, [router, selectedDepartmentId]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch("/api/departments", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setAvailableDepartments(data.departments || []);
        }
      } catch (err) {
        console.error("Error fetching departments:", err);
      }
    };

    void fetchDepartments();
  }, []);

  const fetchQueue = useCallback(async () => {
    if (!selectedDepartmentId) return;

    try {
      const response = await fetch(
        `/api/queues/my-department?departmentId=${selectedDepartmentId}`,
        {
          credentials: "include",
        },
      );

      if (response.ok) {
        const data = await response.json();
        setQueue(data.queue || []);
        if (data.department) {
          setDepartment(data.department);
        }
      } else if (response.status === 401) {
        router.push("/login");
      }
    } catch (err) {
      console.error("Error fetching queue:", err);
    }
  }, [router, selectedDepartmentId]);

  useEffect(() => {
    void fetchQueue();
    const interval = setInterval(() => {
      void fetchQueue();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchQueue]);

  const searchWorkOrder = async () => {
    if (!searchQuery.trim() || !selectedDepartmentId) return;

    setSearchLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/work-orders/find?query=${encodeURIComponent(searchQuery.trim())}&departmentId=${selectedDepartmentId}`,
        {
          credentials: "include",
        },
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedWorkOrder(data);
        setIsActionPanelOpen(true);
        setIsAttachmentsOpen(false);
        setIsNotesOpen(false);
        if (data.workOrder.currentStage.workCenter.stations.length === 1) {
          setSelectedStation(data.workOrder.currentStage.workCenter.stations[0].id);
        }
        // Fetch attachment count and notes count in parallel
        try {
          const [attachmentsResponse, notesResponse] = await Promise.all([
            fetch(`/api/work-orders/${data.workOrder.id}/attachments`, { credentials: "include" }),
            fetch(`/api/work-orders/${data.workOrder.id}/notes`, { credentials: "include" })
          ]);
          if (attachmentsResponse.ok) {
            const attachments = await attachmentsResponse.json();
            setAttachmentCount(Array.isArray(attachments) ? attachments.length : 0);
          } else {
            setAttachmentCount(0);
          }
          if (notesResponse.ok) {
            const notes = await notesResponse.json();
            setNotesCount(Array.isArray(notes) ? notes.length : 0);
          } else {
            setNotesCount(0);
          }
        } catch {
          setAttachmentCount(0);
          setNotesCount(0);
        }
      } else {
        const data = await response.json();
        setError(data.error || "Work order not found");
        setSelectedWorkOrder(null);
      }
    } catch (err) {
      setError("Network error searching for work order");
      setSelectedWorkOrder(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const openWorkOrder = async (woId: string) => {
    if (!selectedDepartmentId) return;

    setOpenLoadingId(woId);
    setError("");
    setMessage("");

    try {
      const wo = queue.find((entry) => entry.id === woId);
      if (wo) {
        const response = await fetch(
          `/api/work-orders/find?query=${encodeURIComponent(wo.number)}&departmentId=${selectedDepartmentId}`,
          { credentials: "include" },
        );

        if (response.ok) {
          const data = await response.json();
          setSelectedWorkOrder(data);
          setIsActionPanelOpen(true);
          setIsAttachmentsOpen(false);
          setIsNotesOpen(false);
          if (data.workOrder.currentStage.workCenter.stations.length === 1) {
            setSelectedStation(data.workOrder.currentStage.workCenter.stations[0].id);
          }
          // Fetch attachment count and notes count in parallel
          try {
            const [attachmentsResponse, notesResponse] = await Promise.all([
              fetch(`/api/work-orders/${data.workOrder.id}/attachments`, { credentials: "include" }),
              fetch(`/api/work-orders/${data.workOrder.id}/notes`, { credentials: "include" })
            ]);
            if (attachmentsResponse.ok) {
              const attachments = await attachmentsResponse.json();
              setAttachmentCount(Array.isArray(attachments) ? attachments.length : 0);
            } else {
              setAttachmentCount(0);
            }
            if (notesResponse.ok) {
              const notes = await notesResponse.json();
              setNotesCount(Array.isArray(notes) ? notes.length : 0);
            } else {
              setNotesCount(0);
            }
          } catch {
            setAttachmentCount(0);
            setNotesCount(0);
          }
        } else {
          const data = await response.json();
          setError(data.error || "Failed to load work order details");
        }
      }
    } catch (err) {
      setError("Network error loading work order");
    } finally {
      setOpenLoadingId(null);
    }
  };

  const performAction = async (action: "start" | "pause" | "complete") => {
    if (!selectedWorkOrder || !selectedStation) {
      setError("Please select a station");
      return;
    }

    if (action === "complete" && !goodQty) {
      setError("Please enter good quantity");
      return;
    }

    setActionLoading(true);
    setPendingAction(action);
    setError("");
    setMessage("");

    try {
      const requestBody: Record<string, unknown> = {
        workOrderId: selectedWorkOrder.workOrder.id,
        stationId: selectedStation,
      };

      if (action === "complete") {
        requestBody.goodQty = parseInt(goodQty, 10) || 0;
        requestBody.scrapQty = parseInt(scrapQty, 10) || 0;
      }

      const response = await fetch(
        `/api/work-orders/${action}?departmentId=${selectedDepartmentId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(requestBody),
        },
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage(data.message);
        setGoodQty("");
        setScrapQty("");

        await fetchQueue();

        if (action === "complete" && data.isComplete) {
          setTimeout(() => {
            setIsActionPanelOpen(false);
            setSelectedWorkOrder(null);
            setMessage("");
          }, 2000);
        } else {
          const refreshResponse = await fetch(
            `/api/work-orders/find?query=${encodeURIComponent(selectedWorkOrder.workOrder.number)}&departmentId=${selectedDepartmentId}`,
            { credentials: "include" },
          );
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            setSelectedWorkOrder(refreshData);
          }
        }
      } else {
        setError(data.error || `Failed to ${action}`);
      }
    } catch (err) {
      setError(`Network error during ${action}`);
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  };

  const canStart =
    !!selectedWorkOrder &&
    selectedWorkOrder.workOrder.currentStage.enabled &&
    selectedWorkOrder.workOrder.status !== "HOLD";

  const canPause =
    !!selectedWorkOrder && selectedWorkOrder.workOrder.status === "IN_PROGRESS";

  const canComplete =
    !!selectedWorkOrder && selectedWorkOrder.workOrder.status === "IN_PROGRESS";

  const departmentOptions = availableDepartments.map((dept) => ({
    value: dept.id,
    label: dept.name,
  }));

  const stationOptions =
    selectedWorkOrder?.workOrder.currentStage.workCenter.stations.map((station) => ({
      value: station.id,
      label: `${station.code} — ${station.name}`,
    })) ?? [];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[color:var(--foreground)]">
      <div className="border-b border-[var(--border-strong)] bg-[var(--surface)] shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Operator Console</h1>
              {department && (
                <p className="text-sm text-[color:var(--muted)]">
                  Current department: <span className="font-medium">{department.name}</span>
                </p>
              )}
            </div>
            <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-end">
              <Select
                className="sm:w-64"
                label="Department"
                value={selectedDepartmentId}
                onChange={(event) => setSelectedDepartmentId(event.target.value)}
                options={departmentOptions}
                placeholder="Select department…"
              />
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <Input
                  className="sm:w-80"
                  placeholder="Enter WO Number or Hull ID…"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void searchWorkOrder();
                    }
                  }}
                />
                <Button
                  onClick={() => void searchWorkOrder()}
                  disabled={searchLoading}
                  loading={searchLoading}
                >
                  Search
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        {error && (
          <div className="flex items-center justify-between rounded-md border border-[var(--status-danger-border)] bg-[var(--status-danger-surface)] px-4 py-3 text-[color:var(--status-danger-foreground)]">
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-4 text-xl leading-none opacity-70 hover:opacity-100"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {message && (
          <div className="flex items-center justify-between rounded-md border border-[var(--status-success-border)] bg-[var(--status-success-surface)] px-4 py-3 text-[color:var(--status-success-foreground)]">
            <span>{message}</span>
            <button
              onClick={() => setMessage('')}
              className="ml-4 text-xl leading-none opacity-70 hover:opacity-100"
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-muted)] px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold">Work Orders in Queue</h2>
              <p className="text-sm text-[color:var(--muted)]">Live updates every 5 seconds</p>
            </div>
            <span className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
              {queue.length} active
            </span>
          </div>

          {queue.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[color:var(--border)]">
                <thead className="bg-[var(--table-header-surface)]">
                  <tr className="text-left text-xs font-medium uppercase tracking-wide text-[color:var(--muted-strong)]">
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Priority</th>
                    <th className="px-6 py-3">WO Number</th>
                    <th className="px-6 py-3">Hull ID</th>
                    <th className="px-6 py-3">SKU</th>
                    <th className="px-6 py-3">Current Stage</th>
                    <th className="px-6 py-3">Work Center</th>
                    <th className="px-6 py-3">Last Activity</th>
                    <th className="px-6 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {queue.map((wo) => (
                    <tr
                      key={wo.id}
                      className="bg-[var(--surface)] transition-colors hover:bg-[color:var(--table-row-hover)]"
                    >
                      <td className="px-6 py-3">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                            queueStatusVariants[wo.status] ?? fallbackStatusClass,
                          )}
                        >
                          {wo.status === "IN_PROGRESS" ? "In Progress" : wo.status}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={clsx(
                            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                            priorityVariants[wo.priority] ?? fallbackStatusClass,
                          )}
                        >
                          {wo.priority}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold">
                        {wo.number}
                      </td>
                      <td className="px-6 py-3 text-sm">{wo.hullId}</td>
                      <td className="px-6 py-3 text-sm">{wo.productSku}</td>
                      <td className="px-6 py-3 text-sm">
                        <div className="font-medium">{wo.currentStage.name}</div>
                        <div className="text-xs text-[color:var(--muted)]">{wo.currentStage.code}</div>
                      </td>
                      <td className="px-6 py-3 text-sm">{wo.currentStage.workCenter.name}</td>
                      <td className="px-6 py-3 text-sm">
                        {wo.lastEvent ? (
                          <div className="space-y-1">
                            <div className="font-medium">{wo.lastEvent.event}</div>
                            <div className="text-xs text-[color:var(--muted)]">
                              {formatDate(wo.lastEvent.createdAt)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-[color:var(--muted)]">No activity</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <Button
                          size="sm"
                          onClick={() => void openWorkOrder(wo.id)}
                          loading={openLoadingId === wo.id}
                        >
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-[color:var(--muted)]">
              No work orders in queue
            </div>
          )}
        </div>

        {isActionPanelOpen && selectedWorkOrder && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--surface-muted)] px-6 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Work Order Action Panel</h2>
                <p className="text-sm text-[color:var(--muted)]">
                  {selectedWorkOrder.workOrder.number} · Stage {" "}
                  {selectedWorkOrder.workOrder.currentStage.sequence} —{
                    " "
                  }
                  {selectedWorkOrder.workOrder.currentStage.name}
                </p>
              </div>
              <SecondaryButton
                size="sm"
                onClick={() => {
                  setIsActionPanelOpen(false);
                  setSelectedWorkOrder(null);
                  setMessage("");
                  setError("");
                }}
              >
                Close
              </SecondaryButton>
            </div>

            <div className="space-y-6 px-6 py-6">
              {/* 1. WO Details */}
              <div className="grid gap-4 border-b border-[var(--border)] pb-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">WO Number</p>
                  <p className="text-sm font-semibold">
                    {selectedWorkOrder.workOrder.number}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Hull ID</p>
                  <p className="text-sm font-medium">{selectedWorkOrder.workOrder.hullId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">SKU</p>
                  <p className="text-sm font-medium">{selectedWorkOrder.workOrder.productSku}</p>
                </div>
                {selectedWorkOrder.workOrder.specSnapshot && (() => {
                  const filteredFeatures = Object.entries(selectedWorkOrder.workOrder.specSnapshot)
                    .filter(([key]) => !['routingVersionId', 'stages'].includes(key));
                  return filteredFeatures.length > 0 ? (
                    <div className="space-y-1 md:col-span-2 lg:col-span-3">
                      <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Features</p>
                      <div className="flex flex-wrap gap-2">
                        {filteredFeatures.map(([key, value]) => (
                          <span
                            key={key}
                            className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-xs"
                          >
                            <span className="font-medium">{key}:</span>
                            <span className="ml-1 text-[color:var(--muted-strong)]">{String(value)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Status</p>
                  <span
                    className={clsx(
                      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                      workOrderStatusVariants[selectedWorkOrder.workOrder.status] ??
                        fallbackStatusClass,
                    )}
                  >
                    {selectedWorkOrder.workOrder.status.replace("_", " ")}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Priority</p>
                  <span
                    className={clsx(
                      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                      priorityVariants[selectedWorkOrder.workOrder.priority] ??
                        fallbackStatusClass,
                    )}
                  >
                    {selectedWorkOrder.workOrder.priority}
                  </span>
                </div>
              </div>

              {/* 2. Last Activity */}
              {selectedWorkOrder.workOrder.lastEvent && (
                <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
                  <p className="font-medium">Last Activity</p>
                  <p className="mt-1 text-[color:var(--muted)]">
                    {selectedWorkOrder.workOrder.lastEvent.event} at station {" "}
                    {selectedWorkOrder.workOrder.lastEvent.station} on {" "}
                    {formatDate(selectedWorkOrder.workOrder.lastEvent.createdAt)}
                  </p>
                  {selectedWorkOrder.workOrder.lastEvent.note && (
                    <p className="mt-2 text-sm italic text-[color:var(--muted-strong)]">
                      Note: {selectedWorkOrder.workOrder.lastEvent.note}
                    </p>
                  )}
                </div>
              )}

              {/* 3. Actions Section */}
              <div className="space-y-4 border-b border-[var(--border)] pb-6">
                <h3 className="text-lg font-semibold">Actions</h3>
                <Select
                  label="Station"
                  value={selectedStation}
                  onChange={(event) => setSelectedStation(event.target.value)}
                  options={stationOptions}
                  placeholder="Select a station…"
                  helperText={stationOptions.length === 0 ? "No stations configured for this stage" : undefined}
                />

                <div className="flex flex-col gap-4 sm:flex-row">
                  <Input
                    label="Good Qty"
                    type="number"
                    value={goodQty}
                    onChange={(event) => setGoodQty(event.target.value)}
                    min={0}
                    className="sm:w-40"
                    fullWidth={false}
                  />
                  <Input
                    label="Scrap Qty"
                    type="number"
                    value={scrapQty}
                    onChange={(event) => setScrapQty(event.target.value)}
                    min={0}
                    className="sm:w-40"
                    fullWidth={false}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <StartButton
                    onClick={() => void performAction("start")}
                    disabled={!canStart || actionLoading || !selectedStation}
                    loading={pendingAction === "start"}
                  >
                    Start
                  </StartButton>
                  <PauseButton
                    onClick={() => void performAction("pause")}
                    disabled={!canPause || actionLoading || !selectedStation}
                    loading={pendingAction === "pause"}
                  >
                    Pause
                  </PauseButton>
                  <ActionButton
                    onClick={() => void performAction("complete")}
                    disabled={!canComplete || actionLoading || !selectedStation || !goodQty}
                    loading={pendingAction === "complete"}
                  >
                    Complete
                  </ActionButton>
                </div>

                {!selectedWorkOrder.workOrder.currentStage.enabled && (
                  <div className="rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-surface)] px-4 py-3 text-sm text-[color:var(--status-warning-foreground)]">
                    This stage is not currently enabled.
                  </div>
                )}

                {selectedWorkOrder.workOrder.status === "HOLD" && (
                  <div className="rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-surface)] px-4 py-3 text-sm text-[color:var(--status-warning-foreground)]">
                    Work order is on HOLD — actions are not available.
                  </div>
                )}
              </div>

              {/* 4. Collapsible Notes Section */}
              <div className="space-y-2">
                <button
                  onClick={() => setIsNotesOpen(!isNotesOpen)}
                  className="flex w-full items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-left transition-colors hover:bg-[var(--table-row-hover)]"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Notes</h3>
                    {notesCount > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-[var(--status-info-accent)] px-2 py-0.5 text-xs font-medium text-[color:var(--status-info-foreground)]">
                        {notesCount}
                      </span>
                    )}
                  </div>
                  {isNotesOpen ? (
                    <ChevronUpIcon className="h-5 w-5 text-[color:var(--muted)]" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-[color:var(--muted)]" />
                  )}
                </button>
                {isNotesOpen && (
                  <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
                    <NotesTimeline
                      workOrderId={selectedWorkOrder.workOrder.id}
                      onError={(err) => setError(err)}
                      onSuccess={(msg) => setMessage(msg)}
                      onNotesChange={(count) => setNotesCount(count)}
                    />
                  </div>
                )}
              </div>

              {/* 5. Collapsible Attachments Section */}
              <div className="space-y-2">
                <button
                  onClick={() => setIsAttachmentsOpen(!isAttachmentsOpen)}
                  className="flex w-full items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-left transition-colors hover:bg-[var(--table-row-hover)]"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Attachments</h3>
                    {attachmentCount > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-[var(--status-info-accent)] px-2 py-0.5 text-xs font-medium text-[color:var(--status-info-foreground)]">
                        {attachmentCount}
                      </span>
                    )}
                  </div>
                  {isAttachmentsOpen ? (
                    <ChevronUpIcon className="h-5 w-5 text-[color:var(--muted)]" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-[color:var(--muted)]" />
                  )}
                </button>
                {isAttachmentsOpen && (
                  <div className="rounded-md border border-[var(--border)] bg-[var(--surface)]">
                    <FileListDisplay
                      workOrderId={selectedWorkOrder.workOrder.id}
                      readOnly={false}
                      onError={(err) => setError(err)}
                    />
                  </div>
                )}
              </div>

              {/* 6. Stage Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Stage Details: {selectedWorkOrder.workOrder.currentStage.name}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1 text-sm">
                    <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Stage Code</p>
                    <p className="font-medium">
                      {selectedWorkOrder.workOrder.currentStage.code}
                    </p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Sequence</p>
                    <p className="font-medium">
                      {selectedWorkOrder.workOrder.currentStage.sequence}
                    </p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Work Center</p>
                    <p className="font-medium">
                      {selectedWorkOrder.workOrder.currentStage.workCenter.name}
                    </p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Department</p>
                    <p className="font-medium">
                      {selectedWorkOrder.workOrder.currentStage.workCenter.department.name}
                    </p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Standard Time</p>
                    <p className="font-medium">
                      {selectedWorkOrder.workOrder.currentStage.standardSeconds} seconds
                    </p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Stage Progress</p>
                    <p className="font-medium">
                      {selectedWorkOrder.workOrder.currentStageIndex + 1} of{" "}
                      {selectedWorkOrder.workOrder.enabledStagesCount}
                    </p>
                  </div>
                </div>

                {selectedWorkOrder.workOrder.currentStage.workInstruction && (
                  <div className="rounded-md border border-[var(--status-info-border)] bg-[var(--status-info-surface)] px-4 py-3 text-sm text-[color:var(--status-info-foreground)]">
                    Work instruction version {selectedWorkOrder.workOrder.currentStage.workInstruction.version} available
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
