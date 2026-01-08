import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { arrayToCsv, createCsvResponse } from '@/lib/csv/exportCsv'

// GET /api/admin/equipment/export - Export equipment as CSV
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const equipment = await prisma.equipment.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    const csvData = equipment.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description || '',
      isActive: e.isActive,
      createdAt: e.createdAt.toISOString(),
    }))

    const csv = arrayToCsv(csvData, [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'isActive', label: 'Active' },
      { key: 'createdAt', label: 'Created At' },
    ])

    return createCsvResponse(csv, 'equipment.csv')
  } catch (error) {
    logger.error('Error exporting equipment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
