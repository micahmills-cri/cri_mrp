'use client'

import { useState, useEffect } from 'react'
import { DataTable, Column } from '@/components/admin/DataTable'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { logger } from '@/lib/logger'

type Equipment = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  _count: {
    stations: number
  }
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [equipmentToEdit, setEquipmentToEdit] = useState<Equipment | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    loadEquipment()
  }, [])

  async function loadEquipment() {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/equipment')
      const data = await res.json()

      if (data.success) {
        setEquipment(data.equipment)
      }
    } catch (error) {
      logger.error('Error loading equipment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleEdit(equipment: Equipment) {
    setEquipmentToEdit(equipment)
    setFormData({
      name: equipment.name,
      description: equipment.description || '',
    })
    setEditModalOpen(true)
  }

  function handleDelete(equipment: Equipment) {
    setEquipmentToDelete(equipment)
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!equipmentToDelete) return

    try {
      const res = await fetch(`/api/admin/equipment/${equipmentToDelete.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await loadEquipment()
        setDeleteDialogOpen(false)
        setEquipmentToDelete(null)
      } else {
        alert('Failed to delete equipment')
      }
    } catch (error) {
      logger.error('Error deleting equipment:', error)
      alert('Error deleting equipment')
    }
  }

  function handleCreate() {
    setFormData({
      name: '',
      description: '',
    })
    setCreateModalOpen(true)
  }

  async function handleSubmitCreate() {
    try {
      const res = await fetch('/api/admin/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
        }),
      })

      const data = await res.json()

      if (data.success) {
        await loadEquipment()
        setCreateModalOpen(false)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      logger.error('Error creating equipment:', error)
      alert('Error creating equipment')
    }
  }

  async function handleSubmitEdit() {
    if (!equipmentToEdit) return

    try {
      const res = await fetch(`/api/admin/equipment/${equipmentToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
        }),
      })

      const data = await res.json()

      if (data.success) {
        await loadEquipment()
        setEditModalOpen(false)
        setEquipmentToEdit(null)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      logger.error('Error updating equipment:', error)
      alert('Error updating equipment')
    }
  }

  const columns: Column<Equipment>[] = [
    { key: 'name', label: 'Name' },
    {
      key: 'description',
      label: 'Description',
      render: (row) => row.description || '-',
    },
    {
      key: 'stations',
      label: 'Stations',
      render: (row) => row._count.stations,
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
        data={equipment}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        title="Equipment"
        isLoading={isLoading}
        emptyMessage="No equipment found. Create one to get started."
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
                  <CardTitle>Create Equipment</CardTitle>
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
                      placeholder="e.g., Rivet Gun"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Equipment description..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button onClick={() => setCreateModalOpen(false)} variant="outline">
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitCreate} disabled={!formData.name}>
                    Create Equipment
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
                  <CardTitle>Edit Equipment</CardTitle>
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
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
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
        title="Delete Equipment"
        message={`Are you sure you want to delete equipment "${equipmentToDelete?.name}"? This will mark it as inactive.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setEquipmentToDelete(null)
        }}
        variant="danger"
      />
    </>
  )
}
