import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'
import { getUserFromRequest } from '../../../../lib/auth'
import { z } from 'zod'
import { Role, RoutingVersionStatus } from '@prisma/client'

const cloneRoutingSchema = z.object({
  sourceRoutingVersionId: z.string().optional(),
  model: z.string().min(1),
  trim: z.string().optional(),
  features: z.any().optional(),
  stages: z.array(z.object({
    id: z.string().optional(), // For existing stages
    code: z.string(),
    name: z.string(),
    sequence: z.number().int().min(1),
    enabled: z.boolean(),
    workCenterId: z.string(),
    standardStageSeconds: z.number().int().min(0)
  }))
})

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is supervisor or admin
    if (user.role !== Role.SUPERVISOR && user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden - Supervisor or Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const data = cloneRoutingSchema.parse(body)

    // Create new routing version
    const routingVersion = await prisma.routingVersion.create({
      data: {
        model: data.model,
        trim: data.trim,
        featuresJson: data.features,
        status: RoutingVersionStatus.DRAFT,
        version: 1, // Will be incremented if needed
        stages: {
          create: data.stages.map(stage => ({
            code: stage.code,
            name: stage.name,
            sequence: stage.sequence,
            enabled: stage.enabled,
            workCenterId: stage.workCenterId,
            standardStageSeconds: stage.standardStageSeconds
          }))
        }
      },
      include: {
        stages: {
          orderBy: { sequence: 'asc' },
          include: {
            workCenter: true
          }
        }
      }
    })

    // If source routing version provided, copy work instructions
    if (data.sourceRoutingVersionId) {
      const sourceStages = await prisma.routingStage.findMany({
        where: { routingVersionId: data.sourceRoutingVersionId },
        include: {
          workInstructionVersions: {
            where: { isActive: true }
          }
        }
      })

      // Copy work instructions to new stages
      for (const newStage of routingVersion.stages) {
        const sourceStage = sourceStages.find(s => s.code === newStage.code)
        if (sourceStage && sourceStage.workInstructionVersions.length > 0) {
          await prisma.workInstructionVersion.createMany({
            data: sourceStage.workInstructionVersions.map(wi => ({
              routingStageId: newStage.id,
              version: wi.version,
              contentMd: wi.contentMd,
              isActive: wi.isActive
            }))
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      routingVersion: {
        id: routingVersion.id,
        model: routingVersion.model,
        trim: routingVersion.trim,
        version: routingVersion.version,
        status: routingVersion.status,
        stages: routingVersion.stages.map(s => ({
          id: s.id,
          code: s.code,
          name: s.name,
          sequence: s.sequence,
          enabled: s.enabled,
          workCenterId: s.workCenterId,
          workCenterName: s.workCenter.name,
          standardStageSeconds: s.standardStageSeconds
        }))
      }
    })
  } catch (error) {
    console.error('Clone routing version error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}