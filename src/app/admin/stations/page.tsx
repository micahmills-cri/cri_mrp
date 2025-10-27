'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable, Column } from '@/components/admin/DataTable'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

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
  _count: {
    members: number
    equipment: number
  }
}

export default function StationsPage() {
  const router = useRouter()
  const [stations, setStations] = useState<Station[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [stationToDelete, setStationToDelete] = useState<Station | null>(null)

  useEffect(() => {
    loadStations()
  }, [])

  async function loadStations() {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/stations')
      const data = await res.json()

      if (data.success) {
        setStations(data.stations)
      }
    } catch (error) {
      console.error('Error loading stations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleEdit(station: Station) {
    router.push(`/admin/stations/${station.id}`)
  }

  function handleDelete(station: Station) {
    setStationToDelete(station)
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!stationToDelete) return

    try {
      const res = await fetch(`/api/admin/stations/${stationToDelete.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await loadStations()
        setDeleteDialogOpen(false)
        setStationToDelete(null)
      } else {
        alert('Failed to delete station')
      }
    } catch (error) {
      console.error('Error deleting station:', error)
      alert('Error deleting station')
    }
  }

  function handleCreate() {
    router.push('/admin/stations/new')
  }

  const columns: Column<Station>[] = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    {
      key: 'workCenter',
      label: 'Work Center',
      render: (row) => row.workCenter.name,
    },
    {
      key: 'department',
      label: 'Department',
      render: (row) => row.workCenter.department.name,
    },
    {
      key: 'defaultPayRate',
      label: 'Default Pay Rate',
      render: (row) =>
        row.defaultPayRate ? `$${Number(row.defaultPayRate).toFixed(2)}/hr` : '-',
    },
    {
      key: 'capacity',
      label: 'Capacity',
      render: (row) => row.capacity ?? '-',
    },
    {
      key: 'members',
      label: 'Members',
      render: (row) => row._count.members,
    },
    {
      key: 'equipment',
      label: 'Equipment',
      render: (row) => row._count.equipment,
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            row.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
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
        data={stations}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        title="Stations"
        isLoading={isLoading}
        emptyMessage="No stations found. Create one to get started."
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete Station"
        message={`Are you sure you want to delete station "${stationToDelete?.name}"? This will mark it as inactive.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setStationToDelete(null)
        }}
        variant="danger"
      />
    </>
  )
}
