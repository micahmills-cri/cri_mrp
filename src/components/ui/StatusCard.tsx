import React from 'react'
import clsx from 'clsx'
import { Card, CardHeader, CardTitle, CardContent } from './Card'

export type StatusVariant = 
  | 'operational' 
  | 'warning' 
  | 'error' 
  | 'maintenance' 
  | 'offline'
  | 'pending'

export interface StatusCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Equipment or process name */
  name: string
  /** Current status */
  status: StatusVariant
  /** Optional description */
  description?: string
  /** Location or area */
  location?: string
  /** Last updated timestamp */
  lastUpdated?: string
  /** Optional additional details */
  details?: Array<{ label: string; value: string }>
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show status indicator dot */
  showDot?: boolean
}

const statusConfig = {
  operational: {
    label: 'Operational',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    dotColor: 'bg-green-500',
    accentColor: 'border-l-green-500'
  },
  warning: {
    label: 'Warning',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    dotColor: 'bg-yellow-500',
    accentColor: 'border-l-yellow-500'
  },
  error: {
    label: 'Error',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    dotColor: 'bg-red-500',
    accentColor: 'border-l-red-500'
  },
  maintenance: {
    label: 'Maintenance',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    dotColor: 'bg-blue-500',
    accentColor: 'border-l-blue-500'
  },
  offline: {
    label: 'Offline',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    dotColor: 'bg-gray-500',
    accentColor: 'border-l-gray-500'
  },
  pending: {
    label: 'Pending',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-800',
    dotColor: 'bg-purple-500',
    accentColor: 'border-l-purple-500'
  }
}

export const StatusCard = React.forwardRef<HTMLDivElement, StatusCardProps>(({
  name,
  status,
  description,
  location,
  lastUpdated,
  details = [],
  size = 'md',
  showDot = true,
  className,
  ...props
}, ref) => {
  const config = statusConfig[status]

  return (
    <Card
      ref={ref}
      className={clsx(
        'transition-all duration-200 hover:shadow-md border-l-4',
        config.bgColor,
        config.borderColor,
        config.accentColor,
        className
      )}
      variant="default"
      padding={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
      {...props}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle 
              size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
              className="text-slate-900 mb-1"
            >
              {name}
            </CardTitle>
            {location && (
              <div className={clsx(
                'text-slate-600 font-medium',
                {
                  'text-xs': size === 'sm',
                  'text-sm': size === 'md',
                  'text-base': size === 'lg'
                }
              )}>
                📍 {location}
              </div>
            )}
          </div>
          
          {/* Status Badge */}
          <div className="flex items-center space-x-2">
            {showDot && (
              <div className={clsx(
                'w-3 h-3 rounded-full',
                config.dotColor,
                {
                  'animate-pulse': status === 'pending'
                }
              )} />
            )}
            <span className={clsx(
              'px-3 py-1 rounded-full text-xs font-semibold',
              config.bgColor,
              config.textColor,
              config.borderColor,
              'border'
            )}>
              {config.label}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {description && (
          <p className={clsx(
            'text-slate-600',
            {
              'text-sm': size === 'sm',
              'text-base': size === 'md',
              'text-lg': size === 'lg'
            }
          )}>
            {description}
          </p>
        )}

        {/* Details */}
        {details.length > 0 && (
          <div className="space-y-2">
            {details.map((detail, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className={clsx(
                  'text-slate-600 font-medium',
                  {
                    'text-xs': size === 'sm',
                    'text-sm': size === 'md',
                    'text-base': size === 'lg'
                  }
                )}>
                  {detail.label}:
                </span>
                <span className={clsx(
                  'text-slate-900 font-semibold',
                  {
                    'text-xs': size === 'sm',
                    'text-sm': size === 'md',
                    'text-base': size === 'lg'
                  }
                )}>
                  {detail.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Last Updated */}
        {lastUpdated && (
          <div className={clsx(
            'text-slate-500 pt-2 border-t border-slate-200',
            {
              'text-xs': size === 'sm',
              'text-sm': size === 'md',
              'text-base': size === 'lg'
            }
          )}>
            Last updated: {lastUpdated}
          </div>
        )}
      </CardContent>
    </Card>
  )
})

StatusCard.displayName = 'StatusCard'

export interface StatusGridProps {
  /** Array of status items */
  statuses: Array<Omit<StatusCardProps, 'size'>>
  /** Grid columns */
  columns?: 2 | 3 | 4
  /** Size for all cards */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

export const StatusGrid: React.FC<StatusGridProps> = ({
  statuses,
  columns = 3,
  size = 'md',
  className,
}) => {
  const gridCols = {
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
  }

  return (
    <div className={clsx(
      'grid gap-4',
      gridCols[columns],
      className
    )}>
      {statuses.map((statusItem, index) => (
        <StatusCard
          key={index}
          {...statusItem}
          size={size}
        />
      ))}
    </div>
  )
}

// Status summary component for dashboard overviews
export interface StatusSummaryProps {
  /** Array of status counts */
  statusCounts: { status: StatusVariant; count: number; label?: string }[]
  /** Title for the summary */
  title?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

export const StatusSummary: React.FC<StatusSummaryProps> = ({
  statusCounts,
  title = 'System Status',
  size = 'md',
  className,
}) => {
  const totalCount = statusCounts.reduce((sum, item) => sum + item.count, 0)

  return (
    <Card className={clsx('', className)} variant="elevated">
      <CardHeader divider>
        <CardTitle size={size}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {statusCounts.map((item, index) => {
          const config = statusConfig[item.status]
          const percentage = totalCount > 0 ? (item.count / totalCount) * 100 : 0
          
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={clsx('w-3 h-3 rounded-full', config.dotColor)} />
                <span className={clsx(
                  'font-medium text-slate-700',
                  {
                    'text-sm': size === 'sm',
                    'text-base': size === 'md',
                    'text-lg': size === 'lg'
                  }
                )}>
                  {item.label || config.label}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={clsx(
                  'font-semibold text-slate-900',
                  {
                    'text-sm': size === 'sm',
                    'text-base': size === 'md',
                    'text-lg': size === 'lg'
                  }
                )}>
                  {item.count}
                </span>
                <span className={clsx(
                  'text-slate-500',
                  {
                    'text-xs': size === 'sm',
                    'text-sm': size === 'md',
                    'text-base': size === 'lg'
                  }
                )}>
                  ({percentage.toFixed(0)}%)
                </span>
              </div>
            </div>
          )
        })}
        
        {totalCount > 0 && (
          <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
            <span className={clsx(
              'font-semibold text-slate-700',
              {
                'text-sm': size === 'sm',
                'text-base': size === 'md',
                'text-lg': size === 'lg'
              }
            )}>
              Total Equipment
            </span>
            <span className={clsx(
              'font-bold text-slate-900',
              {
                'text-sm': size === 'sm',
                'text-base': size === 'md',
                'text-lg': size === 'lg'
              }
            )}>
              {totalCount}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}