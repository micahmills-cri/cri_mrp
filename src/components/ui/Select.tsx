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
  (
    {
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
    },
    ref
  ) => {
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
            className="block text-sm font-medium text-[color:var(--muted-strong)]"
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
            aria-describedby={
              clsx(error && errorId, helperText && !error && helperTextId) || undefined
            }
            className={clsx(
              'block appearance-none rounded-md border px-3 py-2 text-sm shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-[var(--ring-offset)]',
              fullWidth && 'w-full',
              'bg-[var(--surface)] text-[color:var(--foreground)]',
              !hasError &&
                !isDisabled && [
                  'border-[var(--border)]',
                  'hover:border-[var(--border-strong)]',
                  'focus:border-primary-500',
                ],
              hasError &&
                !isDisabled && [
                  'border-[var(--status-danger-border)] bg-[var(--status-danger-surface)] text-[color:var(--status-danger-foreground)]',
                  'hover:border-[var(--status-danger-accent)] focus:border-[var(--status-danger-accent)] focus:ring-danger-500',
                ],
              isDisabled && [
                'border-[var(--border)] bg-[var(--surface-muted)] text-[color:var(--input-disabled-foreground)] cursor-not-allowed',
              ]
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
            {children ||
              options.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[color:var(--muted)]">
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>

        {(error || helperText) && (
          <div className="space-y-1">
            {error && (
              <p id={errorId} className="text-xs text-danger-600 flex items-center">
                <svg className="w-3 h-3 mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </p>
            )}
            {helperText && !error && (
              <p id={helperTextId} className="text-xs text-[color:var(--muted)]">
                {helperText}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
