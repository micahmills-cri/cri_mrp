'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import {
  TrashIcon,
  PlusIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'

type Station = {
  id: string
  code: string
  name: string
  description: string | null
  defaultPayRate: number | null
  capacity: number | null
  targetCycleTimeSeconds: number | null
  isActive: boolean
  workCenter: {
    id: string
    name: string
    department: {
      id: string
      name: string
    }
  }
  members: Array<{
    id: string
    isActive: boolean
    user: {
      id: string
      email: string
      role: string
      hourlyRate: number | null
      shiftSchedule: any
    }
  }>
  equipment: Array<{
    id: string
    equipment: {
      id: string
      name: string
      description: string | null
    }
  }>
}

type WorkCenter = {
  id: string
  name: string
  department: {
    id: string
    name: string
  }
}

type User = {
  id: string
  email: string
  role: string
  hourlyRate: number | null
}

type Equipment = {
  id: string
  name: string
  description: string | null
}

export default function StationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const stationId = params.id as string

  const [station, setStation] = useState<Station | null>(null)
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'members' | 'equipment'>('details')

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    workCenterId: '',
    defaultPayRate: '',
    capacity: '',
    targetCycleTimeSeconds: '',
  })

  // Member management
  const [selectedUserId, setSelectedUserId] = useState('')
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null)
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false)

  // Equipment management
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('')
  const [equipmentToRemove, setEquipmentToRemove] = useState<string | null>(null)
  const [removeEquipmentDialogOpen, setRemoveEquipmentDialogOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [stationId])

  async function loadData() {
    try {
      setIsLoading(true)

      // Load station details
      const stationRes = await fetch(`/api/admin/stations/${stationId}`)
      const stationData = await stationRes.json()

      if (stationData.success) {
        setStation(stationData.station)
        setFormData({
          code: stationData.station.code,
          name: stationData.station.name,
          description: stationData.station.description || '',
          workCenterId: stationData.station.workCenter.id,
          defaultPayRate: stationData.station.defaultPayRate?.toString() || '',
          capacity: stationData.station.capacity?.toString() || '',
          targetCycleTimeSeconds: stationData.station.targetCycleTimeSeconds?.toString() || '',
        })
      }

      // Load work centers
      const wcRes = await fetch('/api/work-centers')
      const wcData = await wcRes.json()
      if (wcData.success) {
        setWorkCenters(wcData.workCenters)
      }

      // Load all users
      const usersRes = await fetch('/api/admin/users')
      const usersData = await usersRes.json()
      if (usersData.success) {
        setAllUsers(usersData.users)
      }

      // Load all equipment
      const equipRes = await fetch('/api/admin/equipment')
      const equipData = await equipRes.json()
      if (equipData.success) {
        setAllEquipment(equipData.equipment)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    try {
      setIsSaving(true)

      const payload: any = {
        code: formData.code,
        name: formData.name,
        description: formData.description || null,
        workCenterId: formData.workCenterId,
      }

      if (formData.defaultPayRate) {
        payload.defaultPayRate = parseFloat(formData.defaultPayRate)
      }
      if (formData.capacity) {
        payload.capacity = parseInt(formData.capacity)
      }
      if (formData.targetCycleTimeSeconds) {
        payload.targetCycleTimeSeconds = parseInt(formData.targetCycleTimeSeconds)
      }

      const res = await fetch(`/api/admin/stations/${stationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (data.success) {
        await loadData()
        alert('Station updated successfully')
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error saving station:', error)
      alert('Error saving station')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleAddMember() {
    if (!selectedUserId) return

    try {
      const res = await fetch(`/api/admin/stations/${stationId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
      })

      const data = await res.json()

      if (data.success) {
        await loadData()
        setSelectedUserId('')
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error adding member:', error)
      alert('Error adding member')
    }
  }

  async function handleRemoveMember() {
    if (!memberToRemove) return

    try {
      const res = await fetch(
        `/api/admin/stations/${stationId}/members?memberId=${memberToRemove}`,
        { method: 'DELETE' }
      )

      const data = await res.json()

      if (data.success) {
        await loadData()
        setRemoveMemberDialogOpen(false)
        setMemberToRemove(null)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Error removing member')
    }
  }

  async function handleAddEquipment() {
    if (!selectedEquipmentId) return

    try {
      const res = await fetch(`/api/admin/stations/${stationId}/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipmentId: selectedEquipmentId }),
      })

      const data = await res.json()

      if (data.success) {
        await loadData()
        setSelectedEquipmentId('')
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error adding equipment:', error)
      alert('Error adding equipment')
    }
  }

  async function handleRemoveEquipment() {
    if (!equipmentToRemove) return

    try {
      const res = await fetch(
        `/api/admin/stations/${stationId}/equipment?assignmentId=${equipmentToRemove}`,
        { method: 'DELETE' }
      )

      const data = await res.json()

      if (data.success) {
        await loadData()
        setRemoveEquipmentDialogOpen(false)
        setEquipmentToRemove(null)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error removing equipment:', error)
      alert('Error removing equipment')
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center text-[color:var(--muted-strong)]">
        Loading...
      </div>
    )
  }

  if (!station) {
    return (
      <div className="p-8 text-center text-[color:var(--muted-strong)]">
        Station not found
      </div>
    )
  }

  const availableUsers = allUsers.filter(
    (u) => !station.members.some((m) => m.user.id === u.id && m.isActive)
  )

  const availableEquipment = allEquipment.filter(
    (e) => !station.equipment.some((se) => se.equipment.id === e.id)
  )

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/stations')}
              className="text-[color:var(--muted-strong)] hover:text-[color:var(--foreground)]"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-[color:var(--foreground)]">
              {station.name}
            </h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-[var(--border)] mb-6">
          {[
            { key: 'details', label: 'Details' },
            { key: 'members', label: `Members (${station.members.filter((m) => m.isActive).length})` },
            { key: 'equipment', label: `Equipment (${station.equipment.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-[color:var(--foreground)] border-b-2 border-blue-600'
                  : 'text-[color:var(--muted-strong)] hover:text-[color:var(--foreground)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Details Tab */}
        {activeTab === 'details' && (
          <Card>
            <CardHeader divider>
              <CardTitle>Station Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[color:var(--foreground)] mb-2">
                    Code *
                  </label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., HRIG-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[color:var(--foreground)] mb-2">
                    Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Hull Rigging Station 1"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[color:var(--foreground)] mb-2">
                    Description
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Station description..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[color:var(--foreground)] mb-2">
                    Work Center *
                  </label>
                  <Select
                    value={formData.workCenterId}
                    onChange={(e) => setFormData({ ...formData, workCenterId: e.target.value })}
                    options={[
                      { value: '', label: 'Select work center...' },
                      ...workCenters.map((wc) => ({
                        value: wc.id,
                        label: `${wc.name} (${wc.department.name})`,
                      })),
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[color:var(--foreground)] mb-2">
                    Default Pay Rate ($/hr)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.defaultPayRate}
                    onChange={(e) => setFormData({ ...formData, defaultPayRate: e.target.value })}
                    placeholder="e.g., 22.50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[color:var(--foreground)] mb-2">
                    Capacity (max operators)
                  </label>
                  <Input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    placeholder="e.g., 2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[color:var(--foreground)] mb-2">
                    Target Cycle Time (seconds)
                  </label>
                  <Input
                    type="number"
                    value={formData.targetCycleTimeSeconds}
                    onChange={(e) =>
                      setFormData({ ...formData, targetCycleTimeSeconds: e.target.value })
                    }
                    placeholder="e.g., 10800"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <Card>
            <CardHeader divider>
              <CardTitle>Station Members</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Add Member */}
              <div className="mb-6 flex gap-2">
                <Select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  options={[
                    { value: '', label: 'Select user to add...' },
                    ...availableUsers.map((u) => ({
                      value: u.id,
                      label: `${u.email} (${u.role})`,
                    })),
                  ]}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddMember}
                  disabled={!selectedUserId}
                  variant="primary"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>

              {/* Members List */}
              {station.members.filter((m) => m.isActive).length === 0 ? (
                <div className="text-center py-8 text-[color:var(--muted-strong)]">
                  No members assigned to this station
                </div>
              ) : (
                <div className="space-y-2">
                  {station.members
                    .filter((m) => m.isActive)
                    .map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 bg-[var(--muted-weak)] rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-[color:var(--foreground)]">
                            {member.user.email}
                          </div>
                          <div className="text-sm text-[color:var(--muted-strong)]">
                            Role: {member.user.role}
                            {member.user.hourlyRate && (
                              <> • Pay Rate: ${Number(member.user.hourlyRate).toFixed(2)}/hr</>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setMemberToRemove(member.id)
                            setRemoveMemberDialogOpen(true)
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Equipment Tab */}
        {activeTab === 'equipment' && (
          <Card>
            <CardHeader divider>
              <CardTitle>Station Equipment</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Add Equipment */}
              <div className="mb-6 flex gap-2">
                <Select
                  value={selectedEquipmentId}
                  onChange={(e) => setSelectedEquipmentId(e.target.value)}
                  options={[
                    { value: '', label: 'Select equipment to add...' },
                    ...availableEquipment.map((e) => ({
                      value: e.id,
                      label: e.name,
                    })),
                  ]}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddEquipment}
                  disabled={!selectedEquipmentId}
                  variant="primary"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Equipment
                </Button>
              </div>

              {/* Equipment List */}
              {station.equipment.length === 0 ? (
                <div className="text-center py-8 text-[color:var(--muted-strong)]">
                  No equipment assigned to this station
                </div>
              ) : (
                <div className="space-y-2">
                  {station.equipment.map((se) => (
                    <div
                      key={se.id}
                      className="flex items-center justify-between p-4 bg-[var(--muted-weak)] rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-[color:var(--foreground)]">
                          {se.equipment.name}
                        </div>
                        {se.equipment.description && (
                          <div className="text-sm text-[color:var(--muted-strong)]">
                            {se.equipment.description}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setEquipmentToRemove(se.id)
                          setRemoveEquipmentDialogOpen(true)
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Confirm Dialogs */}
        <ConfirmDialog
          isOpen={removeMemberDialogOpen}
          title="Remove Member"
          message="Are you sure you want to remove this member from the station?"
          confirmLabel="Remove"
          onConfirm={handleRemoveMember}
          onCancel={() => {
            setRemoveMemberDialogOpen(false)
            setMemberToRemove(null)
          }}
          variant="warning"
        />

        <ConfirmDialog
          isOpen={removeEquipmentDialogOpen}
          title="Remove Equipment"
          message="Are you sure you want to remove this equipment from the station?"
          confirmLabel="Remove"
          onConfirm={handleRemoveEquipment}
          onCancel={() => {
            setRemoveEquipmentDialogOpen(false)
            setEquipmentToRemove(null)
          }}
          variant="warning"
        />
      </div>
    </div>
  )
}
