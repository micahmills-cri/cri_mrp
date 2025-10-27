import { prisma } from '@/server/db/client'

/**
 * Calculate weighted average pay rate for a station based on historical work logs
 * Formula: SUM(userRate * hoursWorked) / SUM(hoursWorked)
 */
export async function calculateStationMetrics(
  stationId: string,
  periodStart: Date,
  periodEnd: Date
) {
  // Get all work logs for this station in the period
  const logs = await prisma.wOStageLog.findMany({
    where: {
      stationId,
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
      event: {
        in: ['START', 'COMPLETE', 'PAUSE'],
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          hourlyRate: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  if (logs.length === 0) {
    return null
  }

  // Calculate hours worked per user
  type UserWork = {
    userId: string
    hourlyRate: number
    hoursWorked: number
    totalCost: number
  }

  const userWork = new Map<string, UserWork>()

  // Track active work sessions
  const activeSessions = new Map<
    string,
    { userId: string; startTime: Date; hourlyRate: number }
  >()

  for (const log of logs) {
    const workOrderKey = log.workOrderId

    if (log.event === 'START') {
      // Start tracking time for this user on this work order
      activeSessions.set(workOrderKey, {
        userId: log.userId,
        startTime: log.createdAt,
        hourlyRate: Number(log.user.hourlyRate) || 0,
      })
    } else if (log.event === 'COMPLETE' || log.event === 'PAUSE') {
      // Calculate time worked
      const session = activeSessions.get(workOrderKey)

      if (session && session.userId === log.userId) {
        const hoursWorked =
          (log.createdAt.getTime() - session.startTime.getTime()) / (1000 * 60 * 60)

        // Add to user's total
        const existing = userWork.get(session.userId)

        if (existing) {
          existing.hoursWorked += hoursWorked
          existing.totalCost += hoursWorked * session.hourlyRate
        } else {
          userWork.set(session.userId, {
            userId: session.userId,
            hourlyRate: session.hourlyRate,
            hoursWorked,
            totalCost: hoursWorked * session.hourlyRate,
          })
        }

        // Clear session if completed
        if (log.event === 'COMPLETE') {
          activeSessions.delete(workOrderKey)
        }
      }
    }
  }

  // Calculate totals
  let totalHoursWorked = 0
  let totalLaborCost = 0
  const uniqueOperators = new Set<string>()

  for (const work of userWork.values()) {
    totalHoursWorked += work.hoursWorked
    totalLaborCost += work.totalCost
    uniqueOperators.add(work.userId)
  }

  if (totalHoursWorked === 0) {
    return null
  }

  const weightedAverageRate = totalLaborCost / totalHoursWorked

  return {
    weightedAverageRate,
    totalHoursWorked,
    totalLaborCost,
    uniqueOperatorCount: uniqueOperators.size,
  }
}

/**
 * Update station metrics for a specific period
 */
export async function updateStationMetrics(stationId: string) {
  const now = new Date()
  const periodEnd = now
  const periodStart = new Date(now)
  periodStart.setDate(periodStart.getDate() - 30) // Last 30 days

  const metrics = await calculateStationMetrics(stationId, periodStart, periodEnd)

  if (!metrics) {
    console.log(`No metrics data for station ${stationId}`)
    return null
  }

  // Upsert metrics
  const result = await prisma.stationMetrics.upsert({
    where: {
      stationId_periodStart: {
        stationId,
        periodStart,
      },
    },
    create: {
      stationId,
      periodStart,
      periodEnd,
      weightedAverageRate: metrics.weightedAverageRate,
      totalHoursWorked: metrics.totalHoursWorked,
      totalLaborCost: metrics.totalLaborCost,
      uniqueOperatorCount: metrics.uniqueOperatorCount,
    },
    update: {
      periodEnd,
      weightedAverageRate: metrics.weightedAverageRate,
      totalHoursWorked: metrics.totalHoursWorked,
      totalLaborCost: metrics.totalLaborCost,
      uniqueOperatorCount: metrics.uniqueOperatorCount,
      calculatedAt: new Date(),
    },
  })

  return result
}

/**
 * Update metrics for all active stations
 */
export async function updateAllStationMetrics() {
  const stations = await prisma.station.findMany({
    where: { isActive: true },
    select: { id: true, code: true },
  })

  const results = []

  for (const station of stations) {
    console.log(`Calculating metrics for station ${station.code}...`)
    try {
      const result = await updateStationMetrics(station.id)
      results.push({ stationId: station.id, code: station.code, success: true, result })
    } catch (error) {
      console.error(`Error calculating metrics for station ${station.code}:`, error)
      results.push({
        stationId: station.id,
        code: station.code,
        success: false,
        error: String(error),
      })
    }
  }

  return results
}
