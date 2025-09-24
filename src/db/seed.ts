import { PrismaClient, Role, RoutingVersionStatus } from '@prisma/client'
import { hashPassword } from '../lib/auth'
import { backupData } from './backup-data'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed with backup restoration...')

  // Clear existing data
  console.log('Clearing existing data...')
  // Note: Some models may not exist yet on first run, so we handle errors gracefully
  try { await prisma.workOrderNote.deleteMany() } catch {}
  try { await prisma.workOrderAttachment.deleteMany() } catch {}
  await prisma.wOStageLog.deleteMany()
  await prisma.workOrder.deleteMany()
  await prisma.routingStage.deleteMany()
  await prisma.routingVersion.deleteMany()
  await prisma.workInstructionVersion.deleteMany()
  await prisma.station.deleteMany()
  await prisma.workCenter.deleteMany()
  await prisma.user.deleteMany()
  await prisma.department.deleteMany()
  try { await prisma.productModel.deleteMany() } catch {}
  try { await prisma.productTrim.deleteMany() } catch {}

  console.log('Creating departments from backup...')
  for (const dept of backupData.departments) {
    await prisma.department.create({
      data: {
        id: dept.id,
        name: dept.name
      }
    })
  }

  console.log('Creating users from backup...')
  for (const user of backupData.users) {
    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role as any,
        departmentId: user.departmentId
      }
    })
  }

  console.log('Creating work centers from backup...')
  for (const wc of backupData.workCenters) {
    await prisma.workCenter.create({
      data: {
        id: wc.id,
        name: wc.name,
        departmentId: wc.departmentId,
        isActive: wc.isActive
      }
    })
  }

  console.log('Creating stations from backup...')
  for (const station of backupData.stations) {
    await prisma.station.create({
      data: {
        id: station.id,
        code: station.code,
        name: station.name,
        workCenterId: station.workCenterId,
        isActive: station.isActive
      }
    })
  }

  console.log('Creating routing versions from backup...')
  for (const rv of backupData.routingVersions) {
    await prisma.routingVersion.create({
      data: {
        id: rv.id,
        model: rv.model,
        trim: rv.trim,
        featuresJson: rv.featuresJson,
        version: rv.version,
        status: rv.status as any,
        releasedAt: new Date(rv.releasedAt)
      }
    })
  }

  console.log('Creating routing stages from backup...')
  for (const stage of backupData.routingStages) {
    await prisma.routingStage.create({
      data: {
        id: stage.id,
        routingVersionId: stage.routingVersionId,
        sequence: stage.sequence,
        code: stage.code,
        name: stage.name,
        enabled: stage.enabled,
        workCenterId: stage.workCenterId,
        standardStageSeconds: stage.standardStageSeconds
      }
    })
  }

  console.log('Creating work orders from backup...')
  for (const wo of backupData.workOrders) {
    await prisma.workOrder.create({
      data: {
        id: wo.id,
        number: wo.number,
        hullId: wo.hullId,
        productSku: wo.productSku,
        specSnapshot: wo.specSnapshot,
        qty: wo.qty,
        status: wo.status as any,
        routingVersionId: wo.routingVersionId,
        currentStageIndex: wo.currentStageIndex,
        createdAt: new Date(wo.createdAt)
      }
    })
  }

  console.log('Creating stage logs from backup...')
  for (const log of backupData.woStageLogs) {
    await prisma.wOStageLog.create({
      data: {
        id: log.id,
        workOrderId: log.workOrderId,
        routingStageId: log.routingStageId,
        stationId: log.stationId,
        userId: log.userId,
        event: log.event as any,
        goodQty: log.goodQty,
        scrapQty: log.scrapQty,
        note: log.note,
        createdAt: new Date(log.createdAt)
      }
    })
  }

  console.log('Creating product models and trims...')
  const [lx24Model, lx26Model] = await Promise.all([
    prisma.productModel.create({
      data: {
        name: 'LX24',
        description: '24-foot luxury boat model',
        isActive: true
      }
    }),
    prisma.productModel.create({
      data: {
        name: 'LX26',
        description: '26-foot luxury boat model',
        isActive: true
      }
    })
  ])

  await Promise.all([
    prisma.productTrim.create({
      data: {
        productModelId: lx24Model.id,
        name: 'LT',
        description: 'Luxury Touring - High-end touring package with premium features',
        isActive: true
      }
    }),
    prisma.productTrim.create({
      data: {
        productModelId: lx24Model.id,
        name: 'LE',
        description: 'Luxury Edition - Elite package with all premium features and upgrades',
        isActive: true
      }
    }),
    prisma.productTrim.create({
      data: {
        productModelId: lx26Model.id,
        name: 'LT',
        description: 'Luxury Touring - High-end touring package with premium features',
        isActive: true
      }
    }),
    prisma.productTrim.create({
      data: {
        productModelId: lx26Model.id,
        name: 'LE',
        description: 'Luxury Edition - Elite package with all premium features and upgrades',
        isActive: true
      }
    })
  ])

  console.log('Database seed completed successfully with backup data restored and new models/trims added!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })