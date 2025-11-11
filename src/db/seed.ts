import { PrismaClient, ProductConfigurationDependencyType } from '@prisma/client'
import { backupData } from './backup-data'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed with backup restoration...')

  // Clear existing data in proper dependency order (children first, parents last)
  console.log('Clearing existing data...')

  // Delete child records first (respecting foreign key constraints)
  try {
    await prisma.workOrderNote.deleteMany()
  } catch {}
  try {
    await prisma.workOrderAttachment.deleteMany()
  } catch {}
  try {
    await prisma.workOrderVersion.deleteMany()
  } catch {}
  await prisma.wOStageLog.deleteMany()

  // Now delete work orders (children removed)
  await prisma.workOrder.deleteMany()

  // Delete routing-related tables
  try {
    await prisma.workInstructionVersion.deleteMany()
  } catch {}
  try {
    await prisma.productConfigurationDependency.deleteMany()
  } catch {}
  try {
    await prisma.productConfigurationOption.deleteMany()
  } catch {}
  try {
    await prisma.productConfigurationComponent.deleteMany()
  } catch {}
  try {
    await prisma.productConfigurationSection.deleteMany()
  } catch {}
  await prisma.routingStage.deleteMany()
  await prisma.routingVersion.deleteMany()

  // Delete product-related tables (trims before models)
  try {
    await prisma.productTrim.deleteMany()
  } catch {}
  try {
    await prisma.productModel.deleteMany()
  } catch {}

  // Delete station-related tables (new admin features)
  try {
    await prisma.stationMetrics.deleteMany()
  } catch {}
  try {
    await prisma.stationEquipment.deleteMany()
  } catch {}
  try {
    await prisma.stationMember.deleteMany()
  } catch {}
  try {
    await prisma.payRateHistory.deleteMany()
  } catch {}
  try {
    await prisma.equipment.deleteMany()
  } catch {}

  // Delete station and work center data
  await prisma.station.deleteMany()
  await prisma.workCenter.deleteMany()

  // Delete audit logs before users (audit logs reference users)
  try {
    await prisma.auditLog.deleteMany()
  } catch {}

  // Finally delete users and departments
  await prisma.user.deleteMany()
  await prisma.department.deleteMany()

  console.log('Creating departments from backup...')
  for (const dept of backupData.departments) {
    await prisma.department.create({
      data: {
        id: dept.id,
        name: dept.name,
      },
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
        departmentId: user.departmentId,
        hourlyRate: user.hourlyRate,
        shiftSchedule: user.shiftSchedule,
      },
    })
  }

  console.log('Creating work centers from backup...')
  for (const wc of backupData.workCenters) {
    await prisma.workCenter.create({
      data: {
        id: wc.id,
        name: wc.name,
        departmentId: wc.departmentId,
        isActive: wc.isActive,
      },
    })
  }

  console.log('Creating stations from backup...')
  for (const station of backupData.stations) {
    await prisma.station.create({
      data: {
        id: station.id,
        code: station.code,
        name: station.name,
        description: station.description,
        workCenterId: station.workCenterId,
        defaultPayRate: station.defaultPayRate,
        capacity: station.capacity,
        targetCycleTimeSeconds: station.targetCycleTimeSeconds,
        isActive: station.isActive,
      },
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
        releasedAt: new Date(rv.releasedAt),
      },
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
        standardStageSeconds: stage.standardStageSeconds,
      },
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
        createdAt: new Date(wo.createdAt),
      },
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
        createdAt: new Date(log.createdAt),
      },
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
        createdAt: new Date(model.createdAt),
      },
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
        createdAt: new Date(trim.createdAt),
      },
    })
  }

  console.log('Creating product configuration sections from backup...')
  for (const section of backupData.productConfigurationSections) {
    await prisma.productConfigurationSection.create({
      data: {
        id: section.id,
        productModelId: section.productModelId,
        productTrimId: section.productTrimId,
        code: section.code,
        name: section.name,
        description: section.description,
        sortOrder: section.sortOrder,
        isRequired: section.isRequired,
        createdAt: new Date(section.createdAt),
      },
    })
  }

  const componentDefaultOptionMap = new Map<string, string | null>()

  console.log('Creating product configuration components from backup...')
  for (const component of backupData.productConfigurationComponents) {
    componentDefaultOptionMap.set(component.id, component.defaultOptionId ?? null)
    await prisma.productConfigurationComponent.create({
      data: {
        id: component.id,
        sectionId: component.sectionId,
        code: component.code,
        name: component.name,
        description: component.description,
        isRequired: component.isRequired,
        allowMultiple: component.allowMultiple,
        sortOrder: component.sortOrder,
        createdAt: new Date(component.createdAt),
      },
    })
  }

  console.log('Creating product configuration options from backup...')
  for (const option of backupData.productConfigurationOptions) {
    await prisma.productConfigurationOption.create({
      data: {
        id: option.id,
        componentId: option.componentId,
        code: option.code,
        partNumber: option.partNumber,
        name: option.name,
        description: option.description,
        isActive: option.isActive,
        isDefault: option.isDefault,
        sortOrder: option.sortOrder,
        createdAt: new Date(option.createdAt),
      },
    })
  }

  console.log('Linking default configuration options to components...')
  for (const [componentId, optionId] of componentDefaultOptionMap.entries()) {
    if (optionId) {
      await prisma.productConfigurationComponent.update({
        where: { id: componentId },
        data: { defaultOptionId: optionId },
      })
    }
  }

  console.log('Creating product configuration dependencies from backup...')
  for (const dependency of backupData.productConfigurationDependencies) {
    await prisma.productConfigurationDependency.create({
      data: {
        id: dependency.id,
        optionId: dependency.optionId,
        dependsOnOptionId: dependency.dependsOnOptionId,
        dependencyType: dependency.dependencyType as ProductConfigurationDependencyType,
        createdAt: new Date(dependency.createdAt),
      },
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
        updatedAt: new Date(note.updatedAt),
      },
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
        createdAt: new Date(attachment.createdAt),
      },
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
        createdAt: new Date(version.createdAt),
      },
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
        createdAt: new Date(instruction.createdAt),
      },
    })
  }

  console.log('Creating equipment from backup...')
  for (const equip of backupData.equipment) {
    await prisma.equipment.create({
      data: {
        id: equip.id,
        name: equip.name,
        description: equip.description,
        isActive: equip.isActive,
        createdAt: new Date(equip.createdAt),
      },
    })
  }

  console.log('Creating station equipment assignments from backup...')
  for (const se of backupData.stationEquipment) {
    await prisma.stationEquipment.create({
      data: {
        id: se.id,
        stationId: se.stationId,
        equipmentId: se.equipmentId,
        createdAt: new Date(se.createdAt),
      },
    })
  }

  console.log('Creating station members from backup...')
  for (const sm of backupData.stationMembers) {
    await prisma.stationMember.create({
      data: {
        id: sm.id,
        stationId: sm.stationId,
        userId: sm.userId,
        isActive: sm.isActive,
        createdAt: new Date(sm.createdAt),
      },
    })
  }

  console.log('Creating pay rate history from backup...')
  for (const prh of backupData.payRateHistory) {
    await prisma.payRateHistory.create({
      data: {
        id: prh.id,
        userId: prh.userId,
        oldRate: prh.oldRate,
        newRate: prh.newRate,
        changedBy: prh.changedBy,
        reason: prh.reason,
        createdAt: new Date(prh.createdAt),
      },
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
