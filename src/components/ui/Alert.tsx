import React from 'react'

interface AlertProps {
  children: React.ReactNode
  variant?: 'info' | 'success' | 'warning' | 'error'
  className?: string
}

export default function Alert({ children, variant = 'info', className = '' }: AlertProps) {
  const variants = {
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    error: 'bg-red-50 border-red-200 text-red-700'
  }

  return (
    <div className={`border px-4 py-3 rounded-md ${variants[variant]} ${className}`}>
      {children}
    </div>
  )
}