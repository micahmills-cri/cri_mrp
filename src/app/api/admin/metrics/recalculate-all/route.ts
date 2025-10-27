import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { updateAllStationMetrics } from '@/lib/metrics/calculateStationMetrics'

// POST /api/admin/metrics/recalculate-all - Recalculate all station metrics
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const results = await updateAllStationMetrics()

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Recalculated metrics for ${successCount} stations (${failCount} failed)`,
      results,
    })
  } catch (error) {
    console.error('Error recalculating all station metrics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
