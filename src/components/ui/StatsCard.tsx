import React from 'react'
import clsx from 'clsx'
import { Card, CardContent } from './Card'
import { cssVar, metricPalette, trendPalette } from '@/theme/palette'

export interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The main value/metric to display */
  value: string | number
  /** Label describing the metric */
  label: string
  /** Optional subtitle or description */
  subtitle?: string
  /** Trend indicator */
  trend?: {
    value: string | number
    direction: 'up' | 'down' | 'neutral'
    label?: string
  }
  /** Status color variant */
  variant?: 'default' | 'success' | 'warning' | 'danger'
  /** Optional icon component */
  icon?: React.ReactNode
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

export const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  (
    {
      value,
      label,
      subtitle,
      trend,
      variant = 'default',
      icon,
      size = 'md',
      className,
      style,
      ...props
    },
    ref
  ) => {
    const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
      switch (direction) {
        case 'up':
          return (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )
        case 'down':
          return (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )
        case 'neutral':
          return (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )
      }
    }

    const palette = metricPalette[variant]
    const paletteStyle: React.CSSProperties = {
      '--metric-surface': cssVar(palette.surface),
      '--metric-border': cssVar(palette.border),
      '--metric-accent': cssVar(palette.accent),
      '--metric-foreground': cssVar(palette.foreground),
      '--metric-muted': cssVar(palette.muted),
    }

    return (
      <Card
        ref={ref}
        style={{ ...paletteStyle, ...(style as React.CSSProperties) }}
        className={clsx(
          'transition-all duration-200 hover:shadow-card-hover border border-l-4',
          'bg-[var(--metric-surface)]',
          'border-[var(--metric-border)]',
          'border-l-[var(--metric-accent)]',
          className
        )}
        variant="elevated"
        padding={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
        {...props}
      >
        <CardContent className="p-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Icon */}
              {icon && (
                <div
                  className={clsx('mb-3 text-[color:var(--metric-muted)]', {
                    'text-lg': size === 'sm',
                    'text-xl': size === 'md',
                    'text-2xl': size === 'lg',
                  })}
                >
                  {icon}
                </div>
              )}

              {/* Main Value */}
              <div
                className={clsx(
                  'font-bold leading-none mb-2 text-[color:var(--metric-foreground)]',
                  {
                    'text-2xl': size === 'sm',
                    'text-3xl': size === 'md',
                    'text-4xl': size === 'lg',
                  }
                )}
              >
                {value}
              </div>

              {/* Label */}
              <div
                className={clsx('font-medium text-[color:var(--muted-strong)] mb-1', {
                  'text-xs': size === 'sm',
                  'text-sm': size === 'md',
                  'text-base': size === 'lg',
                })}
              >
                {label}
              </div>

              {/* Subtitle */}
              {subtitle && (
                <div
                  className={clsx('text-[color:var(--muted)]', {
                    'text-xs': size === 'sm',
                    'text-sm': size === 'md',
                    'text-base': size === 'lg',
                  })}
                >
                  {subtitle}
                </div>
              )}
            </div>

            {/* Trend Indicator */}
            {trend && (
              <div
                className={clsx('flex items-center space-x-1 ml-4', {
                  'text-xs': size === 'sm',
                  'text-sm': size === 'md',
                  'text-base': size === 'lg',
                })}
                style={{ color: trendPalette[trend.direction] }}
              >
                {getTrendIcon(trend.direction)}
                <span className="font-medium">{trend.value}</span>
                {trend.label && <span className="text-[color:var(--muted)]">({trend.label})</span>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
)

StatsCard.displayName = 'StatsCard'

export interface StatsGridProps {
  /** Array of stats to display */
  stats: Array<Omit<StatsCardProps, 'size'>>
  /** Grid columns */
  columns?: 2 | 3 | 4
  /** Size for all cards */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  stats,
  columns = 4,
  size = 'md',
  className,
}) => {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={clsx('grid gap-6', gridCols[columns], className)}>
      {stats.map((stat, index) => (
        <StatsCard key={index} {...stat} size={size} />
      ))}
    </div>
  )
}
