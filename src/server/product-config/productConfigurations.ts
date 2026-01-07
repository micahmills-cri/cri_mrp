import { Prisma, ProductConfigurationDependencyType } from '@prisma/client'
import { prisma } from '@/server/db/client'
import { ZodError, ZodIssueCode, z } from 'zod'

const listInputSchema = z.object({
  modelId: z.string().min(1, 'Product model ID is required'),
  trimId: z.string().min(1).optional(),
})

const sectionInputSchema = z.object({
  id: z.string().min(1).optional(),
  productModelId: z.string().min(1, 'Product model ID is required'),
  productTrimId: z.string().min(1).optional().nullable(),
  code: z.string().min(1, 'Section code is required'),
  name: z.string().min(1, 'Section name is required'),
  description: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  isRequired: z.boolean(),
})

const componentInputSchema = z.object({
  id: z.string().min(1).optional(),
  sectionId: z.string().min(1, 'Section ID is required'),
  code: z.string().min(1, 'Component code is required'),
  name: z.string().min(1, 'Component name is required'),
  description: z.string().optional().nullable(),
  isRequired: z.boolean(),
  allowMultiple: z.boolean(),
  defaultOptionId: z.string().min(1).optional().nullable(),
  sortOrder: z.number().int().default(0),
})

const dependencyInputSchema = z.object({
  dependsOnOptionId: z.string().min(1, 'Dependency option ID is required'),
  dependencyType: z.nativeEnum(ProductConfigurationDependencyType),
})

const optionInputSchema = z.object({
  id: z.string().min(1).optional(),
  componentId: z.string().min(1, 'Component ID is required'),
  code: z.string().min(1, 'Option code is required'),
  partNumber: z.string().optional().nullable(),
  name: z.string().min(1, 'Option name is required'),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().optional().default(false),
  sortOrder: z.number().int().nonnegative().default(0),
  dependencies: z.array(dependencyInputSchema).optional().default([]),
})

function createZodError(path: (string | number)[], message: string) {
  return new ZodError([
    {
      code: ZodIssueCode.custom,
      path,
      message,
    },
  ])
}

export async function listProductConfigurationSections(input: {
  modelId: string
  trimId?: string
}) {
  const params = listInputSchema.parse(input)

  return prisma.productConfigurationSection.findMany({
    where: {
      productModelId: params.modelId,
      productTrimId: params.trimId ?? undefined,
    },
    include: {
      productModel: true,
      productTrim: true,
      components: {
        include: {
          options: {
            include: {
              dependencies: true,
              dependents: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })
}

export async function upsertProductConfigurationSection(input: z.input<typeof sectionInputSchema>) {
  const data = sectionInputSchema.parse(input)

  const payload = {
    productModelId: data.productModelId,
    productTrimId: data.productTrimId ?? null,
    code: data.code,
    name: data.name,
    description: data.description ?? null,
    sortOrder: data.sortOrder,
    isRequired: data.isRequired,
  }

  if (data.id) {
    return prisma.productConfigurationSection.update({
      where: { id: data.id },
      data: payload,
      include: {
        components: {
          include: { options: true },
        },
      },
    })
  }

  return prisma.productConfigurationSection.create({
    data: payload,
    include: {
      components: {
        include: { options: true },
      },
    },
  })
}

export async function upsertProductConfigurationComponent(
  input: z.input<typeof componentInputSchema>
) {
  const data = componentInputSchema.parse(input)
  const payload = {
    sectionId: data.sectionId,
    code: data.code,
    name: data.name,
    description: data.description ?? null,
    isRequired: data.isRequired,
    allowMultiple: data.allowMultiple,
    defaultOptionId: data.defaultOptionId ?? null,
    sortOrder: data.sortOrder,
  }

  if (payload.defaultOptionId) {
    if (!data.id) {
      throw createZodError(
        ['defaultOptionId'],
        'Component ID is required when setting a default option'
      )
    }

    const option = await prisma.productConfigurationOption.findUnique({
      where: { id: payload.defaultOptionId },
      select: { componentId: true },
    })

    if (!option || option.componentId !== data.id) {
      throw createZodError(['defaultOptionId'], 'Default option does not belong to this component')
    }
  }

  if (data.id) {
    const component = await prisma.productConfigurationComponent.update({
      where: { id: data.id },
      data: payload,
      include: {
        options: {
          include: {
            dependencies: true,
            dependents: true,
          },
        },
      },
    })

    return component
  }

  return prisma.productConfigurationComponent.create({
    data: payload,
    include: {
      options: {
        include: {
          dependencies: true,
          dependents: true,
        },
      },
    },
  })
}

async function ensureDependencyOptionsExist(optionIds: string[]) {
  if (optionIds.length === 0) {
    return
  }

  const options = await prisma.productConfigurationOption.findMany({
    where: { id: { in: optionIds } },
    select: { id: true },
  })

  const missing = optionIds.filter((id) => !options.find((option) => option.id === id))

  if (missing.length > 0) {
    throw createZodError(['dependencies'], `Unknown dependency option IDs: ${missing.join(', ')}`)
  }
}

export async function upsertProductConfigurationOption(input: z.input<typeof optionInputSchema>) {
  const data = optionInputSchema.parse(input)

  const dependencyIds = data.dependencies.map((dependency) => dependency.dependsOnOptionId)
  if (data.id && dependencyIds.includes(data.id)) {
    throw createZodError(['dependencies'], 'Option cannot depend on itself')
  }

  await ensureDependencyOptionsExist(dependencyIds)

  const payload = {
    componentId: data.componentId,
    code: data.code,
    partNumber: data.partNumber ?? null,
    name: data.name,
    description: data.description ?? null,
    isActive: data.isActive,
    isDefault: data.isDefault ?? false,
    sortOrder: data.sortOrder,
  }

  if (data.id) {
    const result = await prisma.$transaction(async (tx) => {
      const option = await tx.productConfigurationOption.update({
        where: { id: data.id },
        data: payload,
        include: {
          dependencies: true,
          dependents: true,
        },
      })

      await tx.productConfigurationDependency.deleteMany({
        where: { optionId: option.id },
      })

      if (data.dependencies.length > 0) {
        await tx.productConfigurationDependency.createMany({
          data: data.dependencies.map((dependency) => ({
            optionId: option.id,
            dependsOnOptionId: dependency.dependsOnOptionId,
            dependencyType: dependency.dependencyType,
          })),
        })
      }

      await updateComponentDefaultOption(tx, option.componentId, option.id, data.isDefault ?? false)

      return option
    })

    return result
  }

  const result = await prisma.$transaction(async (tx) => {
    const option = await tx.productConfigurationOption.create({
      data: payload,
      include: {
        dependencies: true,
        dependents: true,
      },
    })

    if (data.dependencies.length > 0) {
      await tx.productConfigurationDependency.createMany({
        data: data.dependencies.map((dependency) => ({
          optionId: option.id,
          dependsOnOptionId: dependency.dependsOnOptionId,
          dependencyType: dependency.dependencyType,
        })),
      })
    }

    await updateComponentDefaultOption(tx, option.componentId, option.id, data.isDefault ?? false)

    return option
  })

  return result
}

async function updateComponentDefaultOption(
  tx: Prisma.TransactionClient,
  componentId: string,
  optionId: string,
  isDefault: boolean
) {
  if (isDefault) {
    await tx.productConfigurationOption.updateMany({
      where: {
        componentId,
        id: { not: optionId },
      },
      data: { isDefault: false },
    })

    await tx.productConfigurationComponent.update({
      where: { id: componentId },
      data: { defaultOptionId: optionId },
    })
  } else {
    await tx.productConfigurationComponent.updateMany({
      where: {
        id: componentId,
        defaultOptionId: optionId,
      },
      data: { defaultOptionId: null },
    })
  }
}

export type ListProductConfigurationSectionsInput = z.input<typeof listInputSchema>
export type UpsertProductConfigurationSectionInput = z.input<typeof sectionInputSchema>
export type UpsertProductConfigurationComponentInput = z.input<typeof componentInputSchema>
export type UpsertProductConfigurationOptionInput = z.input<typeof optionInputSchema>
