'use client'

import { useState, useEffect } from 'react'
import { DataTable, Column } from '@/components/admin/DataTable'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { logger } from '@/lib/logger'

type WorkCenter = {
  id: string
  name: string
  departmentId: string
  isActive: boolean
  department: {
    id: string
    name: string
  }
  _count: {
    stations: number
    routingStages: number
  }
}

type Department = {
  id: string
  name: string
}

export default function WorkCentersPage() {
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [workCenterToDelete, setWorkCenterToDelete] = useState<WorkCenter | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [workCenterToEdit, setWorkCenterToEdit] = useState<WorkCenter | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    departmentId: '',
  })

  useEffect(() => {
    loadWorkCenters()
    loadDepartments()
  }, [])

  async function loadWorkCenters() {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/work-centers')
      const data = await res.json()

      if (data.success) {
        setWorkCenters(data.workCenters)
      }
    } catch (error) {
      logger.error('Error loading work centers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadDepartments() {
    try {
      const res = await fetch('/api/departments')
      const data = await res.json()

      if (data.success) {
        setDepartments(data.departments)
      }
    } catch (error) {
      logger.error('Error loading departments:', error)
    }
  }

  function handleEdit(workCenter: WorkCenter) {
    setWorkCenterToEdit(workCenter)
    setFormData({
      name: workCenter.name,
      departmentId: workCenter.departmentId,
    })
    setEditModalOpen(true)
  }

  function handleDelete(workCenter: WorkCenter) {
    setWorkCenterToDelete(workCenter)
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!workCenterToDelete) return

    try {
      const res = await fetch(`/api/admin/work-centers/${workCenterToDelete.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await loadWorkCenters()
        setDeleteDialogOpen(false)
        setWorkCenterToDelete(null)
      } else {
        alert('Failed to delete work center')
      }
    } catch (error) {
      logger.error('Error deleting work center:', error)
      alert('Error deleting work center')
    }
  }

  function handleCreate() {
    setFormData({
      name: '',
      departmentId: '',
    })
    setCreateModalOpen(true)
  }

  async function handleSubmitCreate() {
    try {
      const res = await fetch('/api/admin/work-centers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (data.success) {
        await loadWorkCenters()
        setCreateModalOpen(false)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      logger.error('Error creating work center:', error)
      alert('Error creating work center')
    }
  }

  async function handleSubmitEdit() {
    if (!workCenterToEdit) return

    try {
      const res = await fetch(`/api/admin/work-centers/${workCenterToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (data.success) {
        await loadWorkCenters()
        setEditModalOpen(false)
        setWorkCenterToEdit(null)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      logger.error('Error updating work center:', error)
      alert('Error updating work center')
    }
  }

  const columns: Column<WorkCenter>[] = [
    { key: 'name', label: 'Name' },
    {
      key: 'department',
      label: 'Department',
      render: (row) => row.department.name,
    },
    {
      key: 'stations',
      label: 'Stations',
      render: (row) => row._count.stations,
    },
    {
      key: 'routingStages',
      label: 'Routing Stages',
      render: (row) => row._count.routingStages,
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            row.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}
        >
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ]

  return (
    <>
      <DataTable
        data={workCenters}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        title="Work Centers"
        isLoading={isLoading}
        emptyMessage="No work centers found. Create one to get started."
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
                  <CardTitle>Create Work Center</CardTitle>
                  <button
                    onClick={() => setCreateModalOpen(false)}
                    className="text-[color:var(--muted-strong)] hover:text-[color:var(--foreground)]"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Hull Rigging"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Department *</label>
                    <Select
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      options={[
                        { value: '', label: 'Select department...' },
                        ...departments.map((d) => ({ value: d.id, label: d.name })),
                      ]}
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button onClick={() => setCreateModalOpen(false)} variant="outline">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitCreate}
                    disabled={!formData.name || !formData.departmentId}
                  >
                    Create Work Center
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
                  <CardTitle>Edit Work Center</CardTitle>
                  <button
                    onClick={() => setEditModalOpen(false)}
                    className="text-[color:var(--muted-strong)] hover:text-[color:var(--foreground)]"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Department *</label>
                    <Select
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      options={[
                        { value: '', label: 'Select department...' },
                        ...departments.map((d) => ({ value: d.id, label: d.name })),
                      ]}
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button onClick={() => setEditModalOpen(false)} variant="outline">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitEdit}
                    disabled={!formData.name || !formData.departmentId}
                  >
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
        title="Delete Work Center"
        message={`Are you sure you want to delete work center "${workCenterToDelete?.name}"? This will mark it as inactive.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setWorkCenterToDelete(null)
        }}
        variant="danger"
      />
    </>
  )
}
