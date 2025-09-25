import React from 'react'
import clsx from 'clsx'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Select variant */
  variant?: 'default' | 'error'
  /** Full width select */
  fullWidth?: boolean
  /** Label text */
  label?: string
  /** Error message to display */
  error?: string
  /** Helper text */
  helperText?: string
  /** Required field indicator */
  isRequired?: boolean
  /** Options for the select */
  options?: SelectOption[]
  /** Placeholder text */
  placeholder?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
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
    options = [],
    placeholder,
    children,
    ...props 
  }, ref) => {
    const generatedId = React.useId()
    const selectId = id || generatedId
    const errorId = `${selectId}-error`
    const helperTextId = `${selectId}-helper`
    const hasError = variant === 'error' || !!error
    const isDisabled = disabled

    return (
      <div className={clsx('space-y-1', { 'w-full': fullWidth }, className)}>
        {label && (
          <label 
            htmlFor={selectId}
            className="block text-sm font-medium text-slate-700"
          >
            {label}
            {isRequired && <span className="text-danger-600 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            required={isRequired}
            aria-invalid={hasError}
            aria-describedby={clsx(
              error && errorId,
              helperText && !error && helperTextId
            ) || undefined}
            className={clsx(
              // Base styles
              'block border rounded-md shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
              'px-3 py-2 text-sm appearance-none bg-no-repeat bg-right bg-origin-padding',
              // Custom dropdown arrow
              "bg-[url('data:image/svg+xml;charset=US-ASCII,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 4 5\"><path fill=\"%23666\" d=\"M2 0L0 2h4zm0 5L0 3h4z\"/></svg>')] bg-[length:12px_12px] bg-[position:right_0.5rem_center]",
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
              }
            )}
            disabled={isDisabled}
            {...props}
          >
            {placeholder && (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            )}
            
            {/* Use provided children if available, otherwise use options prop */}
            {children || options.map((option) => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
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

Select.displayName = 'Select'