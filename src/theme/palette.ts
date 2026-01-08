export const cssVar = (token: string) => `var(${token})`

export type MetricVariant = 'default' | 'success' | 'warning' | 'danger'

export type PriorityVariant = 'low' | 'normal' | 'high' | 'urgent'

export type StatusMetricScale = {
  surface: string
  border: string
  accent: string
  foreground: string
  muted: string
}

export const metricPalette: Record<MetricVariant, StatusMetricScale> = {
  default: {
    surface: '--status-info-surface',
    border: '--status-info-border',
    accent: '--status-info-accent',
    foreground: '--status-info-foreground',
    muted: '--status-info-muted',
  },
  success: {
    surface: '--status-success-surface',
    border: '--status-success-border',
    accent: '--status-success-accent',
    foreground: '--status-success-foreground',
    muted: '--status-success-muted',
  },
  warning: {
    surface: '--status-warning-surface',
    border: '--status-warning-border',
    accent: '--status-warning-accent',
    foreground: '--status-warning-foreground',
    muted: '--status-warning-muted',
  },
  danger: {
    surface: '--status-danger-surface',
    border: '--status-danger-border',
    accent: '--status-danger-accent',
    foreground: '--status-danger-foreground',
    muted: '--status-danger-muted',
  },
}

export const priorityPalette: Record<
  PriorityVariant,
  { surface: string; border: string; foreground: string }
> = {
  low: {
    surface: '--priority-low-surface',
    border: '--priority-low-border',
    foreground: '--priority-low-foreground',
  },
  normal: {
    surface: '--priority-normal-surface',
    border: '--priority-normal-border',
    foreground: '--priority-normal-foreground',
  },
  high: {
    surface: '--priority-high-surface',
    border: '--priority-high-border',
    foreground: '--priority-high-foreground',
  },
  urgent: {
    surface: '--priority-urgent-surface',
    border: '--priority-urgent-border',
    foreground: '--priority-urgent-foreground',
  },
}

export const trendPalette = {
  up: cssVar('--trend-positive'),
  down: cssVar('--trend-negative'),
  neutral: cssVar('--trend-neutral'),
}

export type EquipmentStatusVariant =
  | 'operational'
  | 'warning'
  | 'error'
  | 'maintenance'
  | 'offline'
  | 'pending'

export const equipmentStatusPalette: Record<EquipmentStatusVariant, StatusMetricScale> = {
  operational: metricPalette.success,
  warning: metricPalette.warning,
  error: metricPalette.danger,
  maintenance: {
    surface: '--status-maintenance-surface',
    border: '--status-maintenance-border',
    accent: '--status-maintenance-accent',
    foreground: '--status-maintenance-foreground',
    muted: '--status-maintenance-muted',
  },
  offline: {
    surface: '--status-neutral-surface',
    border: '--status-neutral-border',
    accent: '--status-neutral-accent',
    foreground: '--status-neutral-foreground',
    muted: '--status-neutral-muted',
  },
  pending: {
    surface: '--status-pending-surface',
    border: '--status-pending-border',
    accent: '--status-pending-accent',
    foreground: '--status-pending-foreground',
    muted: '--status-pending-muted',
  },
}
