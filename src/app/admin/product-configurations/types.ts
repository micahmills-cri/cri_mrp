export type DependencyType = 'REQUIRES' | 'EXCLUDES'

export type ProductConfigurationDependency = {
  id: string
  optionId: string
  dependsOnOptionId: string
  dependencyType: DependencyType
}

export type ProductConfigurationOption = {
  id: string
  componentId: string
  code: string
  partNumber: string | null
  name: string
  description: string | null
  isActive: boolean
  isDefault: boolean
  sortOrder: number
  dependencies: ProductConfigurationDependency[]
  dependents: ProductConfigurationDependency[]
}

export type ProductConfigurationComponent = {
  id: string
  sectionId: string
  code: string
  name: string
  description: string | null
  isRequired: boolean
  allowMultiple: boolean
  defaultOptionId: string | null
  sortOrder: number
  options: ProductConfigurationOption[]
}

export type ProductConfigurationSection = {
  id: string
  productModelId: string
  productTrimId: string | null
  code: string
  name: string
  description: string | null
  sortOrder: number
  isRequired: boolean
  components: ProductConfigurationComponent[]
  productModel?: { id: string; name: string }
  productTrim?: { id: string; name: string } | null
}
