import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { arrayToCsv, createCsvResponse } from '@/lib/csv/exportCsv'

// GET /api/admin/users/export - Export users as CSV
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      include: {
        department: true,
      },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
    })

    const csvData = users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      departmentId: u.departmentId || '',
      departmentName: u.department?.name || '',
      hourlyRate: u.hourlyRate?.toString() || '',
      shiftSchedule: u.shiftSchedule ? JSON.stringify(u.shiftSchedule) : '',
      createdAt: u.createdAt.toISOString(),
    }))

    const csv = arrayToCsv(csvData, [
      { key: 'id', label: 'ID' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'departmentId', label: 'Department ID' },
      { key: 'departmentName', label: 'Department Name' },
      { key: 'hourlyRate', label: 'Hourly Rate' },
      { key: 'shiftSchedule', label: 'Shift Schedule (JSON)' },
      { key: 'createdAt', label: 'Created At' },
    ])

    return createCsvResponse(csv, 'users.csv')
  } catch (error) {
    logger.error('Error exporting users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
