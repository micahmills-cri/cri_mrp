import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { arrayToCsv, createCsvResponse } from '@/lib/csv/exportCsv'

// GET /api/admin/work-centers/export - Export work centers as CSV
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const workCenters = await prisma.workCenter.findMany({
      include: {
        department: true,
      },
      orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }],
    })

    const csvData = workCenters.map((wc) => ({
      id: wc.id,
      name: wc.name,
      departmentId: wc.departmentId,
      departmentName: wc.department.name,
      isActive: wc.isActive,
    }))

    const csv = arrayToCsv(csvData, [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'departmentId', label: 'Department ID' },
      { key: 'departmentName', label: 'Department Name' },
      { key: 'isActive', label: 'Active' },
    ])

    return createCsvResponse(csv, 'work-centers.csv')
  } catch (error) {
    logger.error('Error exporting work centers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
