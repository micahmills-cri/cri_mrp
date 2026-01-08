import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case 'work-order-status': {
      const woNumber = args[1]
      const workOrder = await prisma.workOrder.findUnique({
        where: { number: woNumber },
        include: {
          woStageLogs: {
            orderBy: { createdAt: 'desc' },
          },
          routingVersion: {
            include: {
              stages: {
                where: { enabled: true },
                orderBy: { sequence: 'asc' },
              },
            },
          },
        },
      })

      if (workOrder) {
        console.log(`Work Order: ${workOrder.number}`)
        console.log(`  Status: ${workOrder.status}`)
        console.log(`  Current Stage Index: ${workOrder.currentStageIndex}`)
        console.log(`  Total Enabled Stages: ${workOrder.routingVersion.stages.length}`)
        console.log(`  Stage Logs: ${workOrder.woStageLogs.length} entries`)
        console.log(`  Spec Snapshot: ${JSON.stringify(workOrder.specSnapshot, null, 2)}`)
      } else {
        console.log('Work order not found')
      }
      break
    }

    case 'stage-logs': {
      const woNumber = args[1]
      const workOrder = await prisma.workOrder.findUnique({
        where: { number: woNumber },
        include: {
          woStageLogs: {
            orderBy: { createdAt: 'desc' },
            include: {
              routingStage: true,
              station: true,
              user: true,
            },
          },
        },
      })

      if (workOrder) {
        console.log(`Stage logs for WO ${workOrder.number}:`)
        workOrder.woStageLogs.forEach((log) => {
          console.log(`  ${log.event} at ${log.createdAt.toISOString()}`)
          console.log(`    Stage: ${log.routingStage.name} (${log.routingStage.code})`)
          console.log(`    Station: ${log.station.code}`)
          console.log(`    User: ${log.user.email}`)
          if (log.note) console.log(`    Note: ${log.note}`)
          if (log.event === 'COMPLETE') {
            console.log(`    Good Qty: ${log.goodQty}, Scrap Qty: ${log.scrapQty}`)
          }
        })
      } else {
        console.log('Work order not found')
      }
      break
    }

    case 'audit-logs': {
      const modelId = args[1]
      const auditLogs = await prisma.auditLog.findMany({
        where: { modelId },
        orderBy: { createdAt: 'desc' },
        include: {
          actor: true,
        },
      })

      console.log(`Audit logs for ${modelId}:`)
      auditLogs.forEach((log) => {
        console.log(`  ${log.action} at ${log.createdAt.toISOString()}`)
        console.log(`    Actor: ${log.actor?.email || 'System'}`)
        console.log(`    Model: ${log.model}`)
        if (log.before) console.log(`    Before: ${JSON.stringify(log.before)}`)
        if (log.after) console.log(`    After: ${JSON.stringify(log.after)}`)
      })
      break
    }

    case 'department-workorders': {
      const deptId = args[1]
      const workOrders = await prisma.workOrder.findMany({
        where: {
          routingVersion: {
            stages: {
              some: {
                enabled: true,
                workCenter: {
                  departmentId: deptId,
                },
              },
            },
          },
        },
        include: {
          routingVersion: {
            include: {
              stages: {
                where: { enabled: true },
                orderBy: { sequence: 'asc' },
                include: {
                  workCenter: {
                    include: {
                      department: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      console.log(`Work orders in department ${deptId}:`)
      workOrders.forEach((wo) => {
        const enabledStages = wo.routingVersion.stages.filter((s) => s.enabled)
        const currentStage = enabledStages[wo.currentStageIndex]
        if (currentStage && currentStage.workCenter.departmentId === deptId) {
          console.log(`  ${wo.number} - Status: ${wo.status}, Current Stage: ${currentStage.name}`)
        }
      })
      break
    }

    default:
      console.log('Usage: ts-node scripts/assert.ts <command> [args]')
      console.log('Commands:')
      console.log('  work-order-status <wo-number>')
      console.log('  stage-logs <wo-number>')
      console.log('  audit-logs <model-id>')
      console.log('  department-workorders <dept-id>')
  }

  await prisma.$disconnect()
}

main().catch(console.error)
