import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'
import { getUserFromRequest } from '../../../../lib/auth'

// Helper function to calculate trend data
async function calculateTrends() {
  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  
  const thisWeekStart = new Date(today)
  thisWeekStart.setDate(today.getDate() - today.getDay())
  
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(thisWeekStart.getDate() - 7)
  const lastWeekEnd = new Date(thisWeekStart)
  lastWeekEnd.setTime(lastWeekEnd.getTime() - 1)
  
  // Calculate weekday average for In Progress (last 4 weeks of weekdays)
  const fourWeeksAgo = new Date(today)
  fourWeeksAgo.setDate(today.getDate() - 28)
  
  const historicalInProgress = await prisma.wOStageLog.findMany({
    where: {
      event: 'START',
      createdAt: {
        gte: fourWeeksAgo,
        lt: today
      }
    },
    include: {
      workOrder: true
    }
  })
  
  // Group by weekday and calculate average
  const weekdayGroups: { [key: number]: number } = {}
  historicalInProgress.forEach(log => {
    const dayOfWeek = log.createdAt.getDay()
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday-Friday only
      weekdayGroups[dayOfWeek] = (weekdayGroups[dayOfWeek] || 0) + 1
    }
  })
  
  const weekdayAvg = Object.values(weekdayGroups).length > 0 
    ? Math.round(Object.values(weekdayGroups).reduce((a, b) => a + b, 0) / Object.values(weekdayGroups).length)
    : 0
  
  // Current in progress count
  const currentInProgress = await prisma.workOrder.count({
    where: { status: 'IN_PROGRESS' }
  })
  
  // Calculate completed this week vs last week
  const thisWeekCompleted = await prisma.workOrder.count({
    where: {
      status: 'COMPLETED',
      woStageLogs: {
        some: {
          event: 'COMPLETE',
          createdAt: {
            gte: thisWeekStart
          }
        }
      }
    }
  })
  
  const lastWeekCompleted = await prisma.workOrder.count({
    where: {
      status: 'COMPLETED',
      woStageLogs: {
        some: {
          event: 'COMPLETE',
          createdAt: {
            gte: lastWeekStart,
            lte: lastWeekEnd
          }
        }
      }
    }
  })
  
  return {
    inProgress: {
      current: currentInProgress,
      weekdayAvg,
      trend: weekdayAvg > 0 ? Math.round(((currentInProgress - weekdayAvg) / weekdayAvg) * 100) : 0,
      direction: currentInProgress >= weekdayAvg ? 'up' : 'down'
    },
    completed: {
      thisWeek: thisWeekCompleted,
      lastWeek: lastWeekCompleted,
      trend: lastWeekCompleted > 0 ? Math.round(((thisWeekCompleted - lastWeekCompleted) / lastWeekCompleted) * 100) : 0,
      direction: thisWeekCompleted >= lastWeekCompleted ? 'up' : 'down'
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'SUPERVISOR' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get ALL work orders for supervisors to see complete factory status
    const workOrders = await prisma.workOrder.findMany({
      where: {
        status: {
          in: ['PLANNED', 'RELEASED', 'IN_PROGRESS', 'HOLD', 'COMPLETED']
        }
      },
      include: {
        routingVersion: {
          include: {
            stages: {
              orderBy: { sequence: 'asc' },
              include: {
                workCenter: {
                  include: { department: true }
                }
              }
            }
          }
        },
        woStageLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            routingStage: true,
            station: true,
            user: true
          }
        },
        _count: {
          select: {
            notes: true,
            attachments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Show all work orders to supervisors for complete factory visibility
    const filteredWorkOrders = workOrders

    // Transform work orders for display
    const wipData = filteredWorkOrders.map(wo => {
      const currentStage = wo.routingVersion.stages[wo.currentStageIndex]
      const lastLog = wo.woStageLogs[0]
      
      return {
        id: wo.id,
        number: wo.number,
        hullId: wo.hullId,
        productSku: wo.productSku,
        status: wo.status,
        qty: wo.qty,
        currentStage: currentStage ? {
          name: currentStage.name,
          code: currentStage.code,
          sequence: currentStage.sequence,
          workCenter: currentStage.workCenter.name
        } : null,
        lastEvent: lastLog ? {
          event: lastLog.event,
          time: lastLog.createdAt,
          user: lastLog.user.email,
          station: lastLog.station.code
        } : null,
        createdAt: wo.createdAt,
        // Include count data for badges
        _count: wo._count
      }
    })

    // Calculate summary metrics with trend data
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(today.getDate() - today.getDay())
    
    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(thisWeekStart.getDate() - 7)
    const lastWeekEnd = new Date(thisWeekStart)
    lastWeekEnd.setTime(lastWeekEnd.getTime() - 1)

    const statusCounts = {
      RELEASED: filteredWorkOrders.filter(wo => wo.status === 'RELEASED').length,
      IN_PROGRESS: filteredWorkOrders.filter(wo => wo.status === 'IN_PROGRESS').length,
      COMPLETED: filteredWorkOrders.filter(wo => wo.status === 'COMPLETED' && wo.woStageLogs.some(log => log.createdAt >= today)).length,
      HOLD: filteredWorkOrders.filter(wo => wo.status === 'HOLD').length
    }
    
    // Calculate trends
    const trends = await calculateTrends()

    // Calculate average stage times per work center (simplified version)
    const workCenterTimes: Record<string, { totalTime: number; count: number }> = {}
    
    for (const wo of filteredWorkOrders) {
      const stageLogs = await prisma.wOStageLog.findMany({
        where: { workOrderId: wo.id },
        include: { routingStage: { include: { workCenter: true } } },
        orderBy: { createdAt: 'asc' }
      })

      for (let i = 0; i < stageLogs.length - 1; i++) {
        const startLog = stageLogs[i]
        const endLog = stageLogs[i + 1]
        
        if (startLog.event === 'START' && endLog.event === 'COMPLETE' && 
            startLog.routingStageId === endLog.routingStageId) {
          const workCenterName = startLog.routingStage.workCenter.name
          const timeInMinutes = Math.floor((endLog.createdAt.getTime() - startLog.createdAt.getTime()) / (1000 * 60))
          
          if (!workCenterTimes[workCenterName]) {
            workCenterTimes[workCenterName] = { totalTime: 0, count: 0 }
          }
          
          workCenterTimes[workCenterName].totalTime += timeInMinutes
          workCenterTimes[workCenterName].count += 1
        }
      }
    }

    const avgStageTimes = Object.entries(workCenterTimes).map(([workCenter, data]) => ({
      workCenter,
      avgTimeMinutes: Math.round(data.totalTime / data.count) || 0
    }))

    return NextResponse.json({
      success: true,
      data: {
        wipData,
        summary: {
          statusCounts,
          avgStageTimes,
          trends
        }
      }
    })
  } catch (error) {
    console.error('Supervisor dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}