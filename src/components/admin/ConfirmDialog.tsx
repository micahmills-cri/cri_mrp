'use client'

import React from 'react'
import { Button } from '@/components/ui/Button'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

type ConfirmDialogProps = {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning',
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onCancel} />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-[var(--surface)] rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Icon */}
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                variant === 'danger'
                  ? 'bg-red-100 text-red-600'
                  : variant === 'warning'
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-blue-100 text-blue-600'
              }`}
            >
              <ExclamationTriangleIcon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-[color:var(--foreground)]">{title}</h3>
          </div>

          {/* Message */}
          <p className="text-sm text-[color:var(--muted-strong)] mb-6">{message}</p>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button onClick={onCancel} variant="outline">
              {cancelLabel}
            </Button>
            <Button onClick={onConfirm} variant={variant === 'danger' ? 'danger' : 'primary'}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
