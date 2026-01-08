'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline'

export type Column<T> = {
  key: string
  label: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
}

type DataTableProps<T> = {
  data: T[]
  columns: Column<T>[]
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  onCreate?: () => void
  onExport?: () => void
  onImport?: () => void
  title: string
  isLoading?: boolean
  emptyMessage?: string
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onEdit,
  onDelete,
  onCreate,
  onExport,
  onImport,
  title,
  isLoading = false,
  emptyMessage = 'No data found',
}: DataTableProps<T>) {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[color:var(--foreground)]">{title}</h1>
          <div className="flex gap-2">
            {onImport && (
              <Button onClick={onImport} variant="outline" size="sm">
                <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                Import
              </Button>
            )}
            {onExport && (
              <Button onClick={onExport} variant="outline" size="sm">
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
            {onCreate && (
              <Button onClick={onCreate} variant="primary" size="sm">
                <PlusIcon className="h-4 w-4 mr-2" />
                Create
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <Card>
          {isLoading ? (
            <div className="p-8 text-center text-[color:var(--muted-strong)]">Loading...</div>
          ) : data.length === 0 ? (
            <div className="p-8 text-center text-[color:var(--muted-strong)]">{emptyMessage}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[var(--border)] bg-[var(--muted-weak)]">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className="px-6 py-3 text-left text-xs font-medium text-[color:var(--muted-strong)] uppercase tracking-wider"
                      >
                        {column.label}
                      </th>
                    ))}
                    {(onEdit || onDelete) && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-[color:var(--muted-strong)] uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.map((row) => (
                    <tr key={row.id} className="hover:bg-[var(--muted-weak)] transition-colors">
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className="px-6 py-4 whitespace-nowrap text-sm text-[color:var(--foreground)]"
                        >
                          {column.render ? column.render(row) : (row as any)[column.key]}
                        </td>
                      ))}
                      {(onEdit || onDelete) && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            {onEdit && (
                              <button
                                onClick={() => onEdit(row)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                            )}
                            {onDelete && (
                              <button
                                onClick={() => onDelete(row)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
