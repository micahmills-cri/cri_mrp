 import { PrismaClient, Role, RoutingVersionStatus } from '@prisma/client'
import { hashPassword } from '../lib/auth'
import { backupData } from './backup-data'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed with backup restoration...')

  // Clear existing data in proper dependency order (children first, parents last)
  console.log('Clearing existing data...')
  
  // Delete child records first (respecting foreign key constraints)
  try { await prisma.workOrderNote.deleteMany() } catch {}
  try { await prisma.workOrderAttachment.deleteMany() } catch {}
  try { await prisma.workOrderVersion.deleteMany() } catch {}
  await prisma.wOStageLog.deleteMany()
  
  // Now delete work orders (children removed)
  await prisma.workOrder.deleteMany()
  
  // Delete routing-related tables
  try { await prisma.workInstructionVersion.deleteMany() } catch {}
  await prisma.routingStage.deleteMany()
  await prisma.routingVersion.deleteMany()
  
  // Delete product-related tables (trims before models)
  try { await prisma.productTrim.deleteMany() } catch {}
  try { await prisma.productModel.deleteMany() } catch {}
  
  // Delete station and work center data
  await prisma.station.deleteMany()
  await prisma.workCenter.deleteMany()
  
  // Delete audit logs before users (audit logs reference users)
  try { await prisma.auditLog.deleteMany() } catch {}
  
  // Finally delete users and departments
  await prisma.user.deleteMany()
  await prisma.department.deleteMany()

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

  console.log('Creating product models from backup...')
  for (const model of backupData.productModels) {
    await prisma.productModel.create({
      data: {
        id: model.id,
        name: model.name,
        description: model.description,
        isActive: model.isActive,
        createdAt: new Date(model.createdAt)
      }
    })
  }

  console.log('Creating product trims from backup...')
  for (const trim of backupData.productTrims) {
    await prisma.productTrim.create({
      data: {
        id: trim.id,
        productModelId: trim.productModelId,
        name: trim.name,
        description: trim.description,
        isActive: trim.isActive,
        createdAt: new Date(trim.createdAt)
      }
    })
  }

  console.log('Creating work order notes from backup...')
  for (const note of backupData.workOrderNotes) {
    await prisma.workOrderNote.create({
      data: {
        id: note.id,
        workOrderId: note.workOrderId,
        userId: note.userId,
        departmentId: note.departmentId,
        scope: note.scope,
        content: note.content,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt)
      }
    })
  }

  console.log('Creating work order attachments from backup...')
  for (const attachment of backupData.workOrderAttachments) {
    await prisma.workOrderAttachment.create({
      data: {
        id: attachment.id,
        workOrderId: attachment.workOrderId,
        userId: attachment.userId,
        filename: attachment.filename,
        originalName: attachment.originalName,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        filePath: attachment.filePath,
        createdAt: new Date(attachment.createdAt)
      }
    })
  }

  console.log('Creating work order versions from backup...')
  for (const version of backupData.workOrderVersions) {
    await prisma.workOrderVersion.create({
      data: {
        id: version.id,
        workOrderId: version.workOrderId,
        versionNumber: version.versionNumber,
        snapshotData: version.snapshotData,
        reason: version.reason,
        createdBy: version.createdBy,
        createdAt: new Date(version.createdAt)
      }
    })
  }

  console.log('Creating work instruction versions from backup...')
  for (const instruction of backupData.workInstructionVersions) {
    await prisma.workInstructionVersion.create({
      data: {
        id: instruction.id,
        routingStageId: instruction.routingStageId,
        version: instruction.version,
        contentMd: instruction.contentMd,
        isActive: instruction.isActive,
        createdAt: new Date(instruction.createdAt)
      }
    })
  }

  console.log('Database seed completed successfully with all backup data restored!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })