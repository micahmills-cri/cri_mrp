import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { arrayToCsv, createCsvResponse } from '@/lib/csv/exportCsv'

// GET /api/admin/stations/export - Export stations as CSV
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const stations = await prisma.station.findMany({
      include: {
        workCenter: {
          include: {
            department: true,
          },
        },
      },
      orderBy: [{ workCenter: { name: 'asc' } }, { code: 'asc' }],
    })

    const csvData = stations.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      description: s.description || '',
      workCenterId: s.workCenterId,
      workCenterName: s.workCenter.name,
      departmentName: s.workCenter.department.name,
      defaultPayRate: s.defaultPayRate?.toString() || '',
      capacity: s.capacity?.toString() || '',
      targetCycleTimeSeconds: s.targetCycleTimeSeconds?.toString() || '',
      isActive: s.isActive,
    }))

    const csv = arrayToCsv(csvData, [
      { key: 'id', label: 'ID' },
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'workCenterId', label: 'Work Center ID' },
      { key: 'workCenterName', label: 'Work Center Name' },
      { key: 'departmentName', label: 'Department Name' },
      { key: 'defaultPayRate', label: 'Default Pay Rate' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'targetCycleTimeSeconds', label: 'Target Cycle Time (seconds)' },
      { key: 'isActive', label: 'Active' },
    ])

    return createCsvResponse(csv, 'stations.csv')
  } catch (error) {
    logger.error('Error exporting stations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
