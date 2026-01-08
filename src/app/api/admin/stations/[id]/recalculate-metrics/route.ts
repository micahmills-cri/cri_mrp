import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { updateStationMetrics } from '@/lib/metrics/calculateStationMetrics'

// POST /api/admin/stations/[id]/recalculate-metrics - Recalculate station metrics
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const result = await updateStationMetrics(params.id)

    if (!result) {
      return NextResponse.json({
        success: true,
        message: 'No work data available for this station in the last 30 days',
        metrics: null,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Metrics calculated successfully',
      metrics: result,
    })
  } catch (error) {
    logger.error('Error recalculating station metrics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
