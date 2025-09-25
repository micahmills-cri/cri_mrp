import React from 'react'
import clsx from 'clsx'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './Card'

export interface DataField {
  label: string
  value: string | number | React.ReactNode
  /** Highlight this field */
  highlight?: boolean
  /** Make this field a link */
  link?: boolean
  /** Color variant for the value */
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export interface DataSection {
  /** Section title */
  title: string
  /** Fields in this section */
  fields: DataField[]
  /** Show divider below section */
  divider?: boolean
}

export interface ProgressInfo {
  /** Current progress percentage (0-100) */
  percentage: number
  /** Progress label */
  label?: string
  /** Current step description */
  currentStep?: string
  /** Total steps */
  totalSteps?: number
  /** Current step number */
  currentStepNumber?: number
}

export interface DataCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card title */
  title: string
  /** Subtitle or secondary info */
  subtitle?: string
  /** Main sections of data */
  sections: DataSection[]
  /** Progress information */
  progress?: ProgressInfo
  /** Priority level */
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  /** Card layout variant */
  layout?: 'compact' | 'detailed' | 'summary'
  /** Actions to display */
  actions?: React.ReactNode
  /** Additional header content */
  headerExtra?: React.ReactNode
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

const priorityConfig = {
  low: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    label: 'Low Priority'
  },
  normal: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    label: 'Normal Priority'
  },
  high: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    label: 'High Priority'
  },
  urgent: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    label: 'Urgent'
  }
}

const fieldVariantConfig = {
  default: 'text-slate-900',
  success: 'text-green-600 font-semibold',
  warning: 'text-orange-600 font-semibold',
  danger: 'text-red-600 font-semibold',
  info: 'text-blue-600 font-semibold'
}

export const DataCard = React.forwardRef<HTMLDivElement, DataCardProps>(({
  title,
  subtitle,
  sections,
  progress,
  priority = 'normal',
  layout = 'detailed',
  actions,
  headerExtra,
  size = 'md',
  className,
  ...props
}, ref) => {
  const priorityStyles = priorityConfig[priority]

  const renderField = (field: DataField, index: number) => {
    const valueClasses = clsx(
      'font-medium',
      field.highlight ? 'font-semibold text-slate-900' : fieldVariantConfig[field.variant || 'default'],
      field.link ? 'cursor-pointer hover:underline' : ''
    )

    return (
      <div key={index} className="flex justify-between items-start">
        <span className={clsx(
          'text-slate-600',
          {
            'text-xs': size === 'sm',
            'text-sm': size === 'md',
            'text-base': size === 'lg'
          }
        )}>
          {field.label}:
        </span>
        <span className={clsx(
          valueClasses,
          'text-right flex-1 ml-3',
          {
            'text-xs': size === 'sm',
            'text-sm': size === 'md',
            'text-base': size === 'lg'
          }
        )}>
          {field.value}
        </span>
      </div>
    )
  }

  const renderSection = (section: DataSection, sectionIndex: number) => (
    <div key={sectionIndex} className={clsx(
      'space-y-3',
      {
        'pb-4 border-b border-slate-200': section.divider && sectionIndex < sections.length - 1
      }
    )}>
      <h4 className={clsx(
        'font-semibold text-slate-800',
        {
          'text-xs': size === 'sm',
          'text-sm': size === 'md',
          'text-base': size === 'lg'
        }
      )}>
        {section.title}
      </h4>
      <div className="space-y-2">
        {section.fields.map(renderField)}
      </div>
    </div>
  )

  return (
    <Card
      ref={ref}
      className={clsx(
        'transition-all duration-200 hover:shadow-md',
        layout === 'compact' && 'max-w-sm',
        className
      )}
      variant="elevated"
      padding={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
      {...props}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <CardTitle 
                size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
                className="text-slate-900"
              >
                {title}
              </CardTitle>
              {priority !== 'normal' && (
                <span className={clsx(
                  'px-2 py-1 rounded-full text-xs font-medium border',
                  priorityStyles.color,
                  priorityStyles.bgColor,
                  priorityStyles.borderColor
                )}>
                  {priorityStyles.label}
                </span>
              )}
            </div>
            {subtitle && (
              <p className={clsx(
                'text-slate-600',
                {
                  'text-xs': size === 'sm',
                  'text-sm': size === 'md',
                  'text-lg': size === 'lg'
                }
              )}>
                {subtitle}
              </p>
            )}
          </div>
          {headerExtra && (
            <div className="ml-4">
              {headerExtra}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {progress && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className={clsx(
                'text-slate-700 font-medium',
                {
                  'text-xs': size === 'sm',
                  'text-sm': size === 'md',
                  'text-sm': size === 'lg'
                }
              )}>
                {progress.label || 'Progress'}
              </span>
              <span className={clsx(
                'text-slate-600',
                {
                  'text-xs': size === 'sm',
                  'text-sm': size === 'md',
                  'text-sm': size === 'lg'
                }
              )}>
                {progress.currentStepNumber && progress.totalSteps 
                  ? `${progress.currentStepNumber}/${progress.totalSteps}`
                  : `${progress.percentage}%`
                }
              </span>
            </div>
            <div 
              className="w-full bg-slate-200 rounded-full h-2 mb-2"
              role="progressbar"
              aria-valuenow={Math.round(progress.percentage)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={progress.label ? `${progress.label}: ${progress.percentage}% complete` : `Progress: ${progress.percentage}% complete`}
            >
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progress.percentage))}%` }}
                aria-hidden="true"
              />
            </div>
            {progress.currentStep && (
              <p className={clsx(
                'text-slate-600',
                {
                  'text-xs': size === 'sm',
                  'text-sm': size === 'md',
                  'text-sm': size === 'lg'
                }
              )}>
                Current: {progress.currentStep}
              </p>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {layout === 'compact' ? (
          <div className="space-y-2">
            {sections.flatMap(section => section.fields).slice(0, 4).map(renderField)}
          </div>
        ) : layout === 'summary' ? (
          <div className="grid grid-cols-2 gap-4">
            {sections.flatMap(section => section.fields).slice(0, 6).map(renderField)}
          </div>
        ) : (
          sections.map(renderSection)
        )}
      </CardContent>

      {actions && (
        <CardFooter divider className="pt-4">
          <div className="flex justify-end space-x-2">
            {actions}
          </div>
        </CardFooter>
      )}
    </Card>
  )
})

DataCard.displayName = 'DataCard'

export interface DataGridProps {
  /** Array of data cards */
  dataCards: Array<Omit<DataCardProps, 'size'>>
  /** Grid columns */
  columns?: 1 | 2 | 3 | 4
  /** Size for all cards */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

export const DataGrid: React.FC<DataGridProps> = ({
  dataCards,
  columns = 2,
  size = 'md',
  className,
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
  }

  return (
    <div className={clsx(
      'grid gap-6',
      gridCols[columns],
      className
    )}>
      {dataCards.map((dataCard, index) => (
        <DataCard
          key={index}
          {...dataCard}
          size={size}
        />
      ))}
    </div>
  )
}

// Quick data display component for simple key-value pairs
export interface QuickDataProps {
  /** Title */
  title: string
  /** Key-value data */
  data: Record<string, string | number | React.ReactNode>
  /** Card variant */
  variant?: 'default' | 'outlined'
  /** Size */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

export const QuickData: React.FC<QuickDataProps> = ({
  title,
  data,
  variant = 'default',
  size = 'md',
  className,
}) => {
  return (
    <Card 
      variant={variant}
      padding={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
      className={className}
    >
      <CardHeader className="pb-3">
        <CardTitle size={size}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(data).map(([key, value], index) => (
            <div key={index} className="flex justify-between items-center">
              <span className={clsx(
                'text-slate-600',
                {
                  'text-xs': size === 'sm',
                  'text-sm': size === 'md',
                  'text-sm': size === 'lg'
                }
              )}>
                {key}:
              </span>
              <span className={clsx(
                'font-medium text-slate-900',
                {
                  'text-xs': size === 'sm',
                  'text-sm': size === 'md',
                  'text-lg': size === 'lg'
                }
              )}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}