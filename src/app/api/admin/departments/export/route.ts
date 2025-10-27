import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '@/lib/auth'
import { arrayToCsv, createCsvResponse } from '@/lib/csv/exportCsv'

// GET /api/admin/departments/export - Export departments as CSV
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const departments = await prisma.department.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    const csvData = departments.map((d) => ({
      id: d.id,
      name: d.name,
    }))

    const csv = arrayToCsv(csvData, [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
    ])

    return createCsvResponse(csv, 'departments.csv')
  } catch (error) {
    console.error('Error exporting departments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
