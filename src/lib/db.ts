import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Audit logging middleware
prisma.$use(async (params, next) => {
  const auditableModels = [
    'RoutingVersion',
    'RoutingStage', 
    'WorkOrder',
    'Station',
    'WorkCenter',
    'WOStageLog'
  ]

  if (auditableModels.includes(params.model || '')) {
    let before = null
    let after = null

    // Get the before state for updates and deletes
    if (params.action === 'update' || params.action === 'delete') {
      const key = Object.keys(params.args.where || {})[0]
      const value = Object.values(params.args.where || {})[0]
      
      if (key && value) {
        try {
          before = await (prisma as any)[params.model?.toLowerCase()].findUnique({
            where: { [key]: value }
          })
        } catch (error) {
          console.error('Error fetching before state for audit:', error)
        }
      }
    }

    // Execute the operation
    const result = next(params)

    // Get the after state for creates and updates
    if (params.action === 'create' || params.action === 'update') {
      after = result
    }

    // Create audit log entry (fire and forget)
    const auditData = {
      model: params.model || 'Unknown',
      modelId: (result?.id || before?.id || 'unknown') as string,
      action: params.action,
      before: before ? JSON.parse(JSON.stringify(before)) : null,
      after: after ? JSON.parse(JSON.stringify(after)) : null
    }

    // Don't await to avoid affecting performance
    prisma.auditLog.create({ data: auditData }).catch(error => {
      console.error('Error creating audit log:', error)
    })

    return result
  }

  return next(params)
})