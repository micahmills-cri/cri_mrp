import React from "react";
import clsx from "clsx";
import { Card, CardHeader, CardTitle, CardContent } from "./Card";
import { cssVar, equipmentStatusPalette } from "@/theme/palette";

export type StatusVariant =
  | "operational"
  | "warning"
  | "error"
  | "maintenance"
  | "offline"
  | "pending";

export interface StatusCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Equipment or process name */
  name: string;
  /** Current status */
  status: StatusVariant;
  /** Optional description */
  description?: string;
  /** Location or area */
  location?: string;
  /** Last updated timestamp */
  lastUpdated?: string;
  /** Optional additional details */
  details?: Array<{ label: string; value: string }>;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show status indicator dot */
  showDot?: boolean;
}

const statusConfig = {
  operational: {
    label: "Operational",
    palette: equipmentStatusPalette.operational,
  },
  warning: {
    label: "Warning",
    palette: equipmentStatusPalette.warning,
  },
  error: {
    label: "Error",
    palette: equipmentStatusPalette.error,
  },
  maintenance: {
    label: "Maintenance",
    palette: equipmentStatusPalette.maintenance,
  },
  offline: {
    label: "Offline",
    palette: equipmentStatusPalette.offline,
  },
  pending: {
    label: "Pending",
    palette: equipmentStatusPalette.pending,
  },
} as const;

export const StatusCard = React.forwardRef<HTMLDivElement, StatusCardProps>(
  (
    {
      name,
      status,
      description,
      location,
      lastUpdated,
      details = [],
      size = "md",
      showDot = true,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const config = statusConfig[status];
    const palette = config.palette;
    const paletteStyle: React.CSSProperties = {
      "--status-surface": cssVar(palette.surface),
      "--status-border": cssVar(palette.border),
      "--status-accent": cssVar(palette.accent),
      "--status-foreground": cssVar(palette.foreground),
      "--status-muted": cssVar(palette.muted),
    };

    return (
      <Card
        ref={ref}
        className={clsx(
          "transition-all duration-200 hover:shadow-card-hover border border-l-4",
          "bg-[var(--status-surface)]",
          "border-[var(--status-border)]",
          "border-l-[var(--status-accent)]",
          className,
        )}
        style={{ ...paletteStyle, ...(style as React.CSSProperties) }}
        variant="default"
        padding={size === "sm" ? "sm" : size === "lg" ? "lg" : "md"}
        {...props}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle
                size={size === "sm" ? "sm" : size === "lg" ? "lg" : "md"}
                className="text-[color:var(--foreground)] mb-1"
              >
                {name}
              </CardTitle>
              {location && (
                <div
                  className={clsx(
                    "text-[color:var(--muted-strong)] font-medium",
                    {
                      "text-xs": size === "sm",
                      "text-sm": size === "md",
                      "text-base": size === "lg",
                    },
                  )}
                >
                  📍 {location}
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div className="flex items-center space-x-2">
              {showDot && (
                <div
                  className={clsx("w-3 h-3 rounded-full", {
                    "animate-pulse": status === "pending",
                  })}
                  style={{ backgroundColor: cssVar(palette.accent) }}
                />
              )}
              <span
                className={clsx(
                  "px-3 py-1 rounded-full text-xs font-semibold",
                  "border",
                )}
                style={{
                  backgroundColor: cssVar(palette.surface),
                  borderColor: cssVar(palette.border),
                  color: cssVar(palette.foreground),
                }}
              >
                {config.label}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          {description && (
            <p
              className={clsx("text-[color:var(--status-muted)]", {
                "text-sm": size === "sm",
                "text-base": size === "md",
                "text-lg": size === "lg",
              })}
            >
              {description}
            </p>
          )}

          {/* Details */}
          {details.length > 0 && (
            <div className="space-y-2">
              {details.map((detail, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span
                    className={clsx(
                      "text-[color:var(--status-muted)] font-medium",
                      {
                        "text-xs": size === "sm",
                        "text-sm": size === "md",
                        "text-base": size === "lg",
                      },
                    )}
                  >
                    {detail.label}:
                  </span>
                  <span
                    className={clsx(
                      "text-[color:var(--status-foreground)] font-semibold",
                      {
                        "text-xs": size === "sm",
                        "text-sm": size === "md",
                        "text-base": size === "lg",
                      },
                    )}
                  >
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Last Updated */}
          {lastUpdated && (
            <div
              className={clsx(
                "text-[color:var(--muted)] pt-2 border-t border-[var(--border)]",
                {
                  "text-xs": size === "sm",
                  "text-sm": size === "md",
                  "text-base": size === "lg",
                },
              )}
            >
              Last updated: {lastUpdated}
            </div>
          )}
        </CardContent>
      </Card>
    );
  },
);

StatusCard.displayName = "StatusCard";

export interface StatusGridProps {
  /** Array of status items */
  statuses: Array<Omit<StatusCardProps, "size">>;
  /** Grid columns */
  columns?: 2 | 3 | 4;
  /** Size for all cards */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

export const StatusGrid: React.FC<StatusGridProps> = ({
  statuses,
  columns = 3,
  size = "md",
  className,
}) => {
  const gridCols = {
    2: "grid-cols-1 lg:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
  };

  return (
    <div className={clsx("grid gap-4", gridCols[columns], className)}>
      {statuses.map((statusItem, index) => (
        <StatusCard key={index} {...statusItem} size={size} />
      ))}
    </div>
  );
};

// Status summary component for dashboard overviews
export interface StatusSummaryProps {
  /** Array of status counts */
  statusCounts: { status: StatusVariant; count: number; label?: string }[];
  /** Title for the summary */
  title?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

export const StatusSummary: React.FC<StatusSummaryProps> = ({
  statusCounts,
  title = "System Status",
  size = "md",
  className,
}) => {
  const totalCount = statusCounts.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className={clsx("", className)} variant="elevated">
      <CardHeader divider>
        <CardTitle size={size}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {statusCounts.map((item, index) => {
          const config = statusConfig[item.status];
          const palette = config.palette;
          const percentage =
            totalCount > 0 ? (item.count / totalCount) * 100 : 0;

          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cssVar(palette.accent) }}
                />
                <span
                  className={clsx("font-medium", {
                    "text-sm": size === "sm",
                    "text-base": size === "md",
                    "text-lg": size === "lg",
                  })}
                  style={{ color: cssVar(palette.foreground) }}
                >
                  {item.label || config.label}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={clsx(
                    "font-semibold text-[color:var(--foreground)]",
                    {
                      "text-sm": size === "sm",
                      "text-base": size === "md",
                      "text-lg": size === "lg",
                    },
                  )}
                >
                  {item.count}
                </span>
                <span
                  className={clsx("text-[color:var(--muted)]", {
                    "text-xs": size === "sm",
                    "text-sm": size === "md",
                    "text-base": size === "lg",
                  })}
                >
                  ({percentage.toFixed(0)}%)
                </span>
              </div>
            </div>
          );
        })}

        {totalCount > 0 && (
          <div className="pt-3 border-t border-[var(--border)] flex justify-between items-center">
            <span
              className={clsx(
                "font-semibold text-[color:var(--muted-strong)]",
                {
                  "text-sm": size === "sm",
                  "text-base": size === "md",
                  "text-lg": size === "lg",
                },
              )}
            >
              Total Equipment
            </span>
            <span
              className={clsx("font-bold text-[color:var(--foreground)]", {
                "text-sm": size === "sm",
                "text-base": size === "md",
                "text-lg": size === "lg",
              })}
            >
              {totalCount}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
