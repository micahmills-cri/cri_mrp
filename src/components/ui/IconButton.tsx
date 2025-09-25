'use client'

import React from 'react'
import { clsx } from 'clsx'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon: React.ReactNode
  tooltip?: string
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      loading = false,
      disabled,
      icon,
      tooltip,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    const sizeClasses = {
      sm: 'p-1.5',
      md: 'p-2',
      lg: 'p-3'
    }

    const iconSizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    }

    return (
      <button
        className={clsx(
          'inline-flex items-center justify-center rounded-md border font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
          sizeClasses[size],
          {
            // Primary variant
            'border-transparent text-white bg-primary-600': variant === 'primary',
            'hover:bg-primary-700 focus:ring-primary-500': variant === 'primary' && !isDisabled,
            'disabled:bg-primary-600 disabled:text-white disabled:opacity-50': variant === 'primary',
            
            // Secondary variant
            'border-slate-300 text-slate-700 bg-white': variant === 'secondary',
            'hover:bg-slate-50 focus:ring-slate-500': variant === 'secondary' && !isDisabled,
            'disabled:bg-white disabled:text-slate-700 disabled:opacity-50': variant === 'secondary',
            
            // Success variant
            'border-transparent text-white bg-success-600': variant === 'success',
            'hover:bg-success-700 focus:ring-success-500': variant === 'success' && !isDisabled,
            'disabled:bg-success-600 disabled:text-white disabled:opacity-50': variant === 'success',
            
            // Warning variant
            'border-transparent text-white bg-warning-600': variant === 'warning',
            'hover:bg-warning-700 focus:ring-warning-500': variant === 'warning' && !isDisabled,
            'disabled:bg-warning-600 disabled:text-white disabled:opacity-50': variant === 'warning',
            
            // Danger variant
            'border-transparent text-white bg-danger-600': variant === 'danger',
            'hover:bg-danger-700 focus:ring-danger-500': variant === 'danger' && !isDisabled,
            'disabled:bg-danger-600 disabled:text-white disabled:opacity-50': variant === 'danger',
            
            // Ghost variant
            'border-transparent text-slate-600': variant === 'ghost',
            'hover:text-slate-900 hover:bg-slate-100 focus:ring-slate-500': variant === 'ghost' && !isDisabled,
            'disabled:text-slate-600 disabled:opacity-50': variant === 'ghost',
            
            // Disabled state
            'cursor-not-allowed': isDisabled,
          },
          className
        )}
        disabled={isDisabled}
        ref={ref}
        title={tooltip}
        {...props}
      >
        {loading ? (
          <svg
            className={clsx('animate-spin', iconSizeClasses[size])}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <span className={iconSizeClasses[size]}>{icon}</span>
        )}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'