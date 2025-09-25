import React from 'react'
import clsx from 'clsx'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card variant for different contexts */
  variant?: 'default' | 'elevated' | 'outlined'
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /** Whether the card is interactive (clickable) */
  interactive?: boolean
  /** Whether the card is disabled */
  disabled?: boolean
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({
  variant = 'default',
  padding = 'md',
  interactive = false,
  disabled = false,
  className,
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={clsx(
        // Base styles
        'bg-white rounded-lg transition-all duration-200',
        
        // Variant styles
        {
          // Default card with subtle shadow
          'shadow-sm border border-slate-200': variant === 'default',
          
          // Elevated card with more prominent shadow
          'shadow-lg border border-slate-200': variant === 'elevated',
          
          // Outlined card with no shadow
          'border-2 border-slate-300': variant === 'outlined',
        },
        
        // Padding variants (16px standard spacing)
        {
          'p-0': padding === 'none',
          'p-3': padding === 'sm',        // 12px
          'p-4': padding === 'md',        // 16px (standard)
          'p-6': padding === 'lg',        // 24px
        },
        
        // Interactive states
        {
          'cursor-pointer hover:shadow-md hover:border-slate-300': interactive && !disabled,
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2': interactive && !disabled,
        },
        
        // Disabled state
        {
          'opacity-50 cursor-not-allowed': disabled,
        },
        
        className
      )}
      tabIndex={interactive && !disabled ? 0 : undefined}
      role={interactive ? 'button' : undefined}
      {...props}
    >
      {children}
    </div>
  )
})

Card.displayName = 'Card'

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to include bottom border */
  divider?: boolean
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(({
  divider = false,
  className,
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={clsx(
        'flex items-center justify-between',
        {
          'pb-4 border-b border-slate-200': divider,
          'pb-2': !divider,
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

CardHeader.displayName = 'CardHeader'

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Title size variant */
  size?: 'sm' | 'md' | 'lg'
}

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(({
  size = 'md',
  className,
  children,
  ...props
}, ref) => {
  return (
    <h3
      ref={ref}
      className={clsx(
        'font-semibold text-slate-900 leading-tight',
        {
          'text-sm': size === 'sm',
          'text-base': size === 'md',
          'text-lg': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
})

CardTitle.displayName = 'CardTitle'

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(({
  className,
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={clsx('text-slate-600', className)}
      {...props}
    >
      {children}
    </div>
  )
})

CardContent.displayName = 'CardContent'

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to include top border */
  divider?: boolean
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(({
  divider = false,
  className,
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={clsx(
        'flex items-center justify-between',
        {
          'pt-4 border-t border-slate-200': divider,
          'pt-2': !divider,
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

CardFooter.displayName = 'CardFooter'