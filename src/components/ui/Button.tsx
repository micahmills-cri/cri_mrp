'use client'

import React from 'react'
import { clsx } from 'clsx'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      children,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        className={clsx(
          // Base button styles
          'inline-flex items-center border font-medium rounded-md shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
          // Size variants
          {
            'px-3 py-1.5 text-xs': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
          },
          // Color variants
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
          },
          // State variants
          {
            'w-full': fullWidth,
            'cursor-not-allowed': isDisabled,
          },
          className
        )}
        disabled={isDisabled}
        ref={ref}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
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
        )}
        {icon && iconPosition === 'left' && !loading && (
          <span className="mr-2">{icon}</span>
        )}
        {children}
        {icon && iconPosition === 'right' && !loading && (
          <span className="ml-2">{icon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

// Manufacturing-specific button variants for common operations
export const ActionButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button variant="primary" ref={ref} {...props} />
)

export const StartButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button variant="success" ref={ref} {...props} />
)

export const PauseButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button variant="warning" ref={ref} {...props} />
)

export const StopButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button variant="danger" ref={ref} {...props} />
)

export const SecondaryButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button variant="secondary" ref={ref} {...props} />
)

ActionButton.displayName = 'ActionButton'
StartButton.displayName = 'StartButton'
PauseButton.displayName = 'PauseButton'
StopButton.displayName = 'StopButton'
SecondaryButton.displayName = 'SecondaryButton'