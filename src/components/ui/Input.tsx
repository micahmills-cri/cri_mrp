import React from 'react'
import clsx from 'clsx'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Input variant */
  variant?: 'default' | 'error'
  /** Full width input */
  fullWidth?: boolean
  /** Label text */
  label?: string
  /** Error message to display */
  error?: string
  /** Helper text */
  helperText?: string
  /** Required field indicator */
  isRequired?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant = 'default',
    fullWidth = true,
    label,
    error,
    helperText,
    isRequired,
    disabled,
    id,
    ...props 
  }, ref) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    const errorId = `${inputId}-error`
    const helperTextId = `${inputId}-helper`
    const hasError = variant === 'error' || !!error
    const isDisabled = disabled

    return (
      <div className={clsx('space-y-1', { 'w-full': fullWidth }, className)}>
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700"
          >
            {label}
            {isRequired && <span className="text-danger-600 ml-1">*</span>}
          </label>
        )}
        
        <input
          ref={ref}
          id={inputId}
          required={isRequired}
          aria-invalid={hasError}
          aria-describedby={clsx(
            error && errorId,
            helperText && !error && helperTextId
          ) || undefined}
          className={clsx(
            // Base styles
            'block border rounded-md shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
            'px-3 py-2 text-sm placeholder-slate-400',
            // Size
            {
              'w-full': fullWidth,
            },
            // State variants
            {
              // Default state
              'border-slate-300 bg-white text-slate-900': !hasError && !isDisabled,
              'hover:border-slate-400 focus:border-primary-500 focus:ring-primary-500': !hasError && !isDisabled,
              
              // Error state
              'border-danger-300 bg-danger-50 text-danger-900': hasError && !isDisabled,
              'hover:border-danger-400 focus:border-danger-500 focus:ring-danger-500': hasError && !isDisabled,
              
              // Disabled state
              'border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed': isDisabled,
              'placeholder-slate-300': isDisabled,
            }
          )}
          disabled={isDisabled}
          {...props}
        />
        
        {(error || helperText) && (
          <div className="space-y-1">
            {error && (
              <p id={errorId} className="text-xs text-danger-600 flex items-center">
                <svg className="w-3 h-3 mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
            {helperText && !error && (
              <p id={helperTextId} className="text-xs text-slate-500">{helperText}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Export input size configurations for consistency
export const inputSizes = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base'
} as const