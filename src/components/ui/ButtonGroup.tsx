'use client'

import React from 'react'
import { clsx } from 'clsx'

export interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  className,
  orientation = 'horizontal',
  size = 'md'
}) => {
  return (
    <div
      className={clsx(
        'inline-flex',
        {
          'flex-row': orientation === 'horizontal',
          'flex-col': orientation === 'vertical',
        },
        className
      )}
      role="group"
    >
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child

        const isFirst = index === 0
        const isLast = index === React.Children.count(children) - 1
        const isMiddle = !isFirst && !isLast

        return React.cloneElement(child, {
          className: clsx(
            child.props.className,
            {
              // Horizontal orientation
              '-ml-px': orientation === 'horizontal' && !isFirst,
              'rounded-r-none': orientation === 'horizontal' && !isLast,
              'rounded-l-none': orientation === 'horizontal' && !isFirst,
              
              // Vertical orientation
              '-mt-px': orientation === 'vertical' && !isFirst,
              'rounded-b-none': orientation === 'vertical' && !isLast,
              'rounded-t-none': orientation === 'vertical' && !isFirst,
              
              // Middle elements lose all rounded corners
              'rounded-none': (orientation === 'horizontal' && isMiddle) || (orientation === 'vertical' && isMiddle),
            }
          ),
          size: child.props.size || size,
        } as any)
      })}
    </div>
  )
}

ButtonGroup.displayName = 'ButtonGroup'