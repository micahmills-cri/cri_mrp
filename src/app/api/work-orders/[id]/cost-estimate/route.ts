import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET /api/work-orders/[id]/cost-estimate - Estimate labor cost for work order
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get work order with routing
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: params.id },
      include: {
        routingVersion: {
          include: {
            stages: {
              where: { enabled: true },
              include: {
                workCenter: {
                  include: {
                    stations: {
                      where: { isActive: true },
                      include: {
                        metrics: {
                          orderBy: {
                            periodStart: 'desc',
                          },
                          take: 1,
                        },
                      },
                    },
                  },
                },
              },
              orderBy: {
                sequence: 'asc',
              },
            },
          },
        },
      },
    })

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    // Calculate cost for each stage
    const stageEstimates = []
    let totalEstimatedCost = 0
    let totalStandardHours = 0

    for (const stage of workOrder.routingVersion.stages) {
      const standardHours = stage.standardStageSeconds / 3600 // Convert seconds to hours

      // Get average station rate for this work center
      let stationRate = 0
      let rateSource = 'No rate available'

      // Try to get weighted average from most recent metrics
      if (stage.workCenter.stations.length > 0) {
        const station = stage.workCenter.stations[0] // Use first station as representative

        if (station.metrics.length > 0) {
          stationRate = Number(station.metrics[0].weightedAverageRate)
          rateSource = 'Weighted average (last 30 days)'
        } else if (station.defaultPayRate) {
          stationRate = Number(station.defaultPayRate)
          rateSource = 'Default pay rate'
        }
      }

      const stageCost = standardHours * stationRate

      stageEstimates.push({
        stageId: stage.id,
        stageCode: stage.code,
        stageName: stage.name,
        sequence: stage.sequence,
        standardHours: Number(standardHours.toFixed(2)),
        stationRate: Number(stationRate.toFixed(2)),
        rateSource,
        estimatedCost: Number(stageCost.toFixed(2)),
      })

      totalEstimatedCost += stageCost
      totalStandardHours += standardHours
    }

    return NextResponse.json({
      success: true,
      workOrder: {
        id: workOrder.id,
        number: workOrder.number,
        hullId: workOrder.hullId,
        qty: workOrder.qty,
      },
      costEstimate: {
        totalStandardHours: Number(totalStandardHours.toFixed(2)),
        totalEstimatedCost: Number(totalEstimatedCost.toFixed(2)),
        averageHourlyRate:
          totalStandardHours > 0 ? Number((totalEstimatedCost / totalStandardHours).toFixed(2)) : 0,
        stageEstimates,
      },
    })
  } catch (error) {
    logger.error('Error calculating work order cost estimate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
