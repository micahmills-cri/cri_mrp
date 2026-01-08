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

type User = {
  id: string
  email: string
  role: 'ADMIN' | 'SUPERVISOR' | 'OPERATOR'
  departmentId: string | null
  hourlyRate: number | null
  shiftSchedule: any
  createdAt: string
  department: {
    id: string
    name: string
  } | null
  _count: {
    stationMembers: number
  }
}

type Department = {
  id: string
  name: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [userToEdit, setUserToEdit] = useState<User | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'OPERATOR' as 'ADMIN' | 'SUPERVISOR' | 'OPERATOR',
    departmentId: '',
    hourlyRate: '',
  })

  useEffect(() => {
    loadUsers()
    loadDepartments()
  }, [])

  async function loadUsers() {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/users')
      const data = await res.json()

      if (data.success) {
        setUsers(data.users)
      }
    } catch (error) {
      logger.error('Error loading users:', error)
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

  function handleEdit(user: User) {
    setUserToEdit(user)
    setFormData({
      email: user.email,
      password: '',
      role: user.role,
      departmentId: user.departmentId || '',
      hourlyRate: user.hourlyRate?.toString() || '',
    })
    setEditModalOpen(true)
  }

  function handleDelete(user: User) {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!userToDelete) return

    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await loadUsers()
        setDeleteDialogOpen(false)
        setUserToDelete(null)
      } else {
        const data = await res.json()
        alert(`Failed to delete user: ${data.error}`)
      }
    } catch (error) {
      logger.error('Error deleting user:', error)
      alert('Error deleting user')
    }
  }

  function handleCreate() {
    setFormData({
      email: '',
      password: '',
      role: 'OPERATOR',
      departmentId: '',
      hourlyRate: '',
    })
    setCreateModalOpen(true)
  }

  async function handleSubmitCreate() {
    try {
      const payload: any = {
        email: formData.email,
        password: formData.password,
        role: formData.role,
      }

      if (formData.departmentId) {
        payload.departmentId = formData.departmentId
      }

      if (formData.hourlyRate) {
        payload.hourlyRate = parseFloat(formData.hourlyRate)
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (data.success) {
        await loadUsers()
        setCreateModalOpen(false)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      logger.error('Error creating user:', error)
      alert('Error creating user')
    }
  }

  async function handleSubmitEdit() {
    if (!userToEdit) return

    try {
      const payload: any = {
        email: formData.email,
        role: formData.role,
        departmentId: formData.departmentId || null,
      }

      if (formData.password) {
        payload.password = formData.password
      }

      if (formData.hourlyRate) {
        payload.hourlyRate = parseFloat(formData.hourlyRate)
      } else {
        payload.hourlyRate = null
      }

      const res = await fetch(`/api/admin/users/${userToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (data.success) {
        await loadUsers()
        setEditModalOpen(false)
        setUserToEdit(null)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      logger.error('Error updating user:', error)
      alert('Error updating user')
    }
  }

  const columns: Column<User>[] = [
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Role',
      render: (row) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            row.role === 'ADMIN'
              ? 'bg-purple-100 text-purple-800'
              : row.role === 'SUPERVISOR'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
          }`}
        >
          {row.role}
        </span>
      ),
    },
    {
      key: 'department',
      label: 'Department',
      render: (row) => row.department?.name || '-',
    },
    {
      key: 'hourlyRate',
      label: 'Pay Rate',
      render: (row) => (row.hourlyRate ? `$${Number(row.hourlyRate).toFixed(2)}/hr` : '-'),
    },
    {
      key: 'stationMembers',
      label: 'Stations',
      render: (row) => row._count.stationMembers,
    },
  ]

  return (
    <>
      <DataTable
        data={users}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        title="Users"
        isLoading={isLoading}
        emptyMessage="No users found. Create one to get started."
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
                  <CardTitle>Create User</CardTitle>
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
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="user@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Password *</label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min 6 characters"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Role *</label>
                    <Select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      options={[
                        { value: 'OPERATOR', label: 'Operator' },
                        { value: 'SUPERVISOR', label: 'Supervisor' },
                        { value: 'ADMIN', label: 'Admin' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Department</label>
                    <Select
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      options={[
                        { value: '', label: 'None' },
                        ...departments.map((d) => ({ value: d.id, label: d.name })),
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Hourly Rate ($/hr)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                      placeholder="e.g., 22.50"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button onClick={() => setCreateModalOpen(false)} variant="outline">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitCreate}
                    disabled={!formData.email || !formData.password}
                  >
                    Create User
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
                  <CardTitle>Edit User</CardTitle>
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
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Password (leave blank to keep current)
                    </label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min 6 characters"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Role *</label>
                    <Select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      options={[
                        { value: 'OPERATOR', label: 'Operator' },
                        { value: 'SUPERVISOR', label: 'Supervisor' },
                        { value: 'ADMIN', label: 'Admin' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Department</label>
                    <Select
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      options={[
                        { value: '', label: 'None' },
                        ...departments.map((d) => ({ value: d.id, label: d.name })),
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Hourly Rate ($/hr)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                      placeholder="e.g., 22.50"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button onClick={() => setEditModalOpen(false)} variant="outline">
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitEdit} disabled={!formData.email}>
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
        title="Delete User"
        message={`Are you sure you want to delete user "${userToDelete?.email}"? This will remove all their station assignments.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setUserToDelete(null)
        }}
        variant="danger"
      />
    </>
  )
}
