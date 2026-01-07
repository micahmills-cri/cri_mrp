import { Prisma } from '@prisma/client'

export type ProductConfigurationOptionWithRelations = Prisma.ProductConfigurationOptionGetPayload<{
  include: {
    dependencies: true
    dependents: true
  }
}>

export type ProductConfigurationComponentWithOptions =
  Prisma.ProductConfigurationComponentGetPayload<{
    include: {
      section: true
      options: {
        include: {
          dependencies: true
          dependents: true
        }
      }
    }
  }>

export type ProductConfigurationSectionWithComponents =
  Prisma.ProductConfigurationSectionGetPayload<{
    include: {
      productModel: true
      productTrim: true
      components: {
        include: {
          options: {
            include: {
              dependencies: true
              dependents: true
            }
          }
        }
      }
    }
  }>

export type ProductConfigurationDependencyWithOption =
  Prisma.ProductConfigurationDependencyGetPayload<{
    include: {
      option: true
      dependsOnOption: true
    }
  }>
