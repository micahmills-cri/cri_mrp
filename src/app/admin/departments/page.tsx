'use client'

import { useState, useEffect } from 'react'
import { DataTable, Column } from '@/components/admin/DataTable'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { logger } from '@/lib/logger'

type Department = {
  id: string
  name: string
  _count: {
    users: number
    workCenters: number
  }
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [departmentToEdit, setDepartmentToEdit] = useState<Department | null>(null)
  const [formData, setFormData] = useState({ name: '' })

  useEffect(() => {
    loadDepartments()
  }, [])

  async function loadDepartments() {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/departments')
      const data = await res.json()

      if (data.success) {
        setDepartments(data.departments)
      }
    } catch (error) {
      logger.error('Error loading departments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleEdit(department: Department) {
    setDepartmentToEdit(department)
    setFormData({ name: department.name })
    setEditModalOpen(true)
  }

  function handleDelete(department: Department) {
    setDepartmentToDelete(department)
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!departmentToDelete) return

    try {
      const res = await fetch(`/api/admin/departments/${departmentToDelete.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (res.ok) {
        await loadDepartments()
        setDeleteDialogOpen(false)
        setDepartmentToDelete(null)
      } else {
        alert(`Failed to delete department: ${data.error}`)
      }
    } catch (error) {
      logger.error('Error deleting department:', error)
      alert('Error deleting department')
    }
  }

  function handleCreate() {
    setFormData({ name: '' })
    setCreateModalOpen(true)
  }

  async function handleExport() {
    try {
      const res = await fetch('/api/admin/departments/export')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'departments.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      logger.error('Error exporting departments:', error)
      alert('Error exporting departments')
    }
  }

  async function handleSubmitCreate() {
    try {
      const res = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name }),
      })

      const data = await res.json()

      if (data.success) {
        await loadDepartments()
        setCreateModalOpen(false)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      logger.error('Error creating department:', error)
      alert('Error creating department')
    }
  }

  async function handleSubmitEdit() {
    if (!departmentToEdit) return

    try {
      const res = await fetch(`/api/admin/departments/${departmentToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name }),
      })

      const data = await res.json()

      if (data.success) {
        await loadDepartments()
        setEditModalOpen(false)
        setDepartmentToEdit(null)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      logger.error('Error updating department:', error)
      alert('Error updating department')
    }
  }

  const columns: Column<Department>[] = [
    { key: 'name', label: 'Name' },
    {
      key: 'workCenters',
      label: 'Work Centers',
      render: (row) => row._count.workCenters,
    },
    {
      key: 'users',
      label: 'Users',
      render: (row) => row._count.users,
    },
  ]

  return (
    <>
      <DataTable
        data={departments}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        onExport={handleExport}
        title="Departments"
        isLoading={isLoading}
        emptyMessage="No departments found. Create one to get started."
      />

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setCreateModalOpen(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <Card className="relative max-w-md w-full">
              <CardHeader divider>
                <div className="flex items-center justify-between">
                  <CardTitle>Create Department</CardTitle>
                  <button
                    onClick={() => setCreateModalOpen(false)}
                    className="text-[color:var(--muted-strong)] hover:text-[color:var(--foreground)]"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ name: e.target.value })}
                    placeholder="e.g., Hull Rigging"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button onClick={() => setCreateModalOpen(false)} variant="outline">
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitCreate} disabled={!formData.name}>
                    Create Department
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setEditModalOpen(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <Card className="relative max-w-md w-full">
              <CardHeader divider>
                <div className="flex items-center justify-between">
                  <CardTitle>Edit Department</CardTitle>
                  <button
                    onClick={() => setEditModalOpen(false)}
                    className="text-[color:var(--muted-strong)] hover:text-[color:var(--foreground)]"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ name: e.target.value })}
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button onClick={() => setEditModalOpen(false)} variant="outline">
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitEdit} disabled={!formData.name}>
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete Department"
        message={`Are you sure you want to delete department "${departmentToDelete?.name}"? This can only be done if there are no work centers or users assigned.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setDepartmentToDelete(null)
        }}
        variant="danger"
      />
    </>
  )
}
