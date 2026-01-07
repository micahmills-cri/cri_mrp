'use client'

import { useEffect, useMemo, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'

import { ConfigurationTree } from './ConfigurationTree'
import {
  DependencyType,
  ProductConfigurationComponent,
  ProductConfigurationOption,
  ProductConfigurationSection,
} from './types'

const dependencyTypeLabels: Record<DependencyType, string> = {
  REQUIRES: 'Requires',
  EXCLUDES: 'Excludes',
}

const dependencyTypeOptions = (
  Object.entries(dependencyTypeLabels) as Array<[DependencyType, string]>
).map(([value, label]) => ({ value, label }))

type ProductTrim = {
  id: string
  name: string
  description?: string | null
}

type ProductModel = {
  id: string
  name: string
  description?: string | null
  trims: ProductTrim[]
}

type SectionFormState = {
  code: string
  name: string
  description: string
  sortOrder: string
  isRequired: boolean
}

type ComponentFormState = {
  code: string
  name: string
  description: string
  sortOrder: string
  isRequired: boolean
  allowMultiple: boolean
  defaultOptionId: string
}

type DependencyFormState = {
  dependsOnOptionId: string
  dependencyType: DependencyType
}

type OptionFormState = {
  code: string
  partNumber: string
  name: string
  description: string
  sortOrder: string
  isActive: boolean
  isDefault: boolean
  dependencies: DependencyFormState[]
}

function sortOptions(options: ProductConfigurationOption[]): ProductConfigurationOption[] {
  return [...options]
    .map((option) => ({ ...option }))
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder
      }

      return a.name.localeCompare(b.name)
    })
}

function sortComponents(
  components: ProductConfigurationComponent[]
): ProductConfigurationComponent[] {
  return [...components]
    .map((component) => ({
      ...component,
      options: sortOptions(component.options),
    }))
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder
      }

      return a.name.localeCompare(b.name)
    })
}

function sortSections(sections: ProductConfigurationSection[]): ProductConfigurationSection[] {
  return [...sections]
    .map((section) => ({
      ...section,
      components: sortComponents(section.components),
    }))
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder
      }

      return a.name.localeCompare(b.name)
    })
}

function nextSortOrder(items: { sortOrder: number }[]) {
  if (items.length === 0) {
    return 1
  }

  return Math.max(...items.map((item) => item.sortOrder)) + 1
}

export default function ProductConfigurationsPage() {
  const [models, setModels] = useState<ProductModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState('')
  const [selectedTrimId, setSelectedTrimId] = useState('')

  const [sections, setSections] = useState<ProductConfigurationSection[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [sectionsError, setSectionsError] = useState<string | null>(null)

  const [sectionModalOpen, setSectionModalOpen] = useState(false)
  const [sectionForm, setSectionForm] = useState<SectionFormState>({
    code: '',
    name: '',
    description: '',
    sortOrder: '1',
    isRequired: true,
  })
  const [editingSection, setEditingSection] = useState<ProductConfigurationSection | null>(null)
  const [isSavingSection, setIsSavingSection] = useState(false)

  const [componentModalOpen, setComponentModalOpen] = useState(false)
  const [componentForm, setComponentForm] = useState<ComponentFormState>({
    code: '',
    name: '',
    description: '',
    sortOrder: '1',
    isRequired: true,
    allowMultiple: false,
    defaultOptionId: '',
  })
  const [componentContext, setComponentContext] = useState<{
    section: ProductConfigurationSection
    component?: ProductConfigurationComponent
  } | null>(null)
  const [isSavingComponent, setIsSavingComponent] = useState(false)

  const [optionModalOpen, setOptionModalOpen] = useState(false)
  const [optionForm, setOptionForm] = useState<OptionFormState>({
    code: '',
    partNumber: '',
    name: '',
    description: '',
    sortOrder: '1',
    isActive: true,
    isDefault: false,
    dependencies: [],
  })
  const [optionContext, setOptionContext] = useState<{
    section: ProductConfigurationSection
    component: ProductConfigurationComponent
    option?: ProductConfigurationOption
  } | null>(null)
  const [isSavingOption, setIsSavingOption] = useState(false)

  useEffect(() => {
    void loadModels()
  }, [])

  useEffect(() => {
    if (!selectedModelId) {
      setSections([])
      return
    }

    void loadSections(selectedModelId, selectedTrimId || undefined)
  }, [selectedModelId, selectedTrimId])

  useEffect(() => {
    if (!modelsLoading && models.length > 0 && !selectedModelId) {
      setSelectedModelId(models[0].id)
      setSelectedTrimId('')
    }
  }, [models, modelsLoading, selectedModelId])

  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId) ?? null,
    [models, selectedModelId]
  )

  const selectedTrim = useMemo(() => {
    if (!selectedModel || !selectedTrimId) {
      return null
    }

    return selectedModel.trims.find((trim) => trim.id === selectedTrimId) ?? null
  }, [selectedModel, selectedTrimId])

  const optionMap = useMemo(() => {
    const map = new Map<string, ProductConfigurationOption>()
    for (const section of sections) {
      for (const component of section.components) {
        for (const option of component.options) {
          map.set(option.id, option)
        }
      }
    }
    return map
  }, [sections])

  const dependencyOptions = useMemo(
    () =>
      Array.from(optionMap.values()).map((option) => ({
        value: option.id,
        label: `${option.code} — ${option.name}`,
      })),
    [optionMap]
  )

  function resolveOptionLabel(optionId: string) {
    const option = optionMap.get(optionId)
    if (!option) {
      return null
    }

    return `${option.code} — ${option.name}`
  }

  async function loadModels() {
    setModelsLoading(true)
    setModelsError(null)
    try {
      const response = await fetch('/api/product-models', {
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await safeParseError(response)
        setModelsError(error ?? 'Failed to load product models')
        return
      }

      const data = (await response.json()) as ProductModel[]
      setModels(data)
    } catch (error) {
      console.error('Error loading product models:', error)
      setModelsError('Failed to load product models')
    } finally {
      setModelsLoading(false)
    }
  }

  async function loadSections(modelId: string, trimId?: string) {
    setSectionsLoading(true)
    setSectionsError(null)

    try {
      const query = trimId ? `?trimId=${encodeURIComponent(trimId)}` : ''
      const response = await fetch(`/api/product-configurations/${modelId}${query}`, {
        credentials: 'include',
      })

      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        const message = payload.error ?? 'Failed to load configuration data'
        setSectionsError(message)
        setSections([])
        return
      }

      const normalizedSections = sortSections(
        (payload.data as ProductConfigurationSection[]).map((section) => ({
          ...section,
          components: section.components.map((component) => ({
            ...component,
            options: component.options.map((option) => ({
              ...option,
            })),
          })),
        }))
      )

      setSections(normalizedSections)
    } catch (error) {
      console.error('Error loading configuration sections:', error)
      setSectionsError('Failed to load configuration data')
      setSections([])
    } finally {
      setSectionsLoading(false)
    }
  }
  function openCreateSection() {
    if (!selectedModel) {
      return
    }

    setEditingSection(null)
    setSectionForm({
      code: '',
      name: '',
      description: '',
      sortOrder: String(nextSortOrder(sections)),
      isRequired: true,
    })
    setSectionModalOpen(true)
  }

  function openEditSection(section: ProductConfigurationSection) {
    setEditingSection(section)
    setSectionForm({
      code: section.code,
      name: section.name,
      description: section.description ?? '',
      sortOrder: String(section.sortOrder),
      isRequired: section.isRequired,
    })
    setSectionModalOpen(true)
  }

  function closeSectionModal() {
    if (isSavingSection) {
      return
    }

    setSectionModalOpen(false)
    setEditingSection(null)
  }

  async function handleSaveSection() {
    if (!selectedModel) {
      return
    }

    setIsSavingSection(true)
    const previousSections = sections

    const payload = {
      ...(editingSection ? { id: editingSection.id } : {}),
      productModelId: selectedModel.id,
      productTrimId: editingSection?.productTrimId ?? selectedTrim?.id ?? null,
      code: sectionForm.code.trim(),
      name: sectionForm.name.trim(),
      description: sectionForm.description.trim() || null,
      sortOrder: Number(sectionForm.sortOrder) || 0,
      isRequired: sectionForm.isRequired,
    }

    const optimisticId = editingSection?.id ?? `temp-section-${Date.now()}`
    const optimisticSection: ProductConfigurationSection = {
      id: optimisticId,
      productModelId: selectedModel.id,
      productTrimId: payload.productTrimId,
      code: payload.code,
      name: payload.name,
      description: payload.description,
      sortOrder: payload.sortOrder,
      isRequired: payload.isRequired,
      components: editingSection ? editingSection.components : [],
      productModel: {
        id: selectedModel.id,
        name: selectedModel.name,
      },
      productTrim:
        editingSection?.productTrim ??
        (selectedTrim ? { id: selectedTrim.id, name: selectedTrim.name } : null),
    }

    setSections((current) => {
      const updated = editingSection
        ? current.map((section) =>
            section.id === editingSection.id ? { ...section, ...optimisticSection } : section
          )
        : [...current, optimisticSection]

      return sortSections(updated)
    })

    try {
      const response = await fetch('/api/product-configurations/sections', {
        method: editingSection ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? 'Failed to save section')
      }

      const serverSection = result.data as ProductConfigurationSection
      const normalizedSection: ProductConfigurationSection = {
        ...serverSection,
        productModel: {
          id: selectedModel.id,
          name: selectedModel.name,
        },
        productTrim:
          editingSection?.productTrim ??
          (selectedTrim ? { id: selectedTrim.id, name: selectedTrim.name } : null),
      }

      setSections((current) =>
        sortSections(
          current.map((section) =>
            section.id === optimisticId || section.id === serverSection.id
              ? {
                  ...section,
                  ...normalizedSection,
                  components: sortComponents(normalizedSection.components),
                }
              : section
          )
        )
      )

      setSectionModalOpen(false)
      setEditingSection(null)
    } catch (error) {
      console.error('Error saving section:', error)
      setSections(previousSections)
      alert(error instanceof Error ? error.message : 'Failed to save section')
    } finally {
      setIsSavingSection(false)
    }
  }

  function openCreateComponent(section: ProductConfigurationSection) {
    setComponentContext({ section })
    setComponentForm({
      code: '',
      name: '',
      description: '',
      sortOrder: String(nextSortOrder(section.components)),
      isRequired: true,
      allowMultiple: false,
      defaultOptionId: '',
    })
    setComponentModalOpen(true)
  }

  function openEditComponent(
    section: ProductConfigurationSection,
    component: ProductConfigurationComponent
  ) {
    setComponentContext({ section, component })
    setComponentForm({
      code: component.code,
      name: component.name,
      description: component.description ?? '',
      sortOrder: String(component.sortOrder),
      isRequired: component.isRequired,
      allowMultiple: component.allowMultiple,
      defaultOptionId: component.defaultOptionId ?? '',
    })
    setComponentModalOpen(true)
  }

  function closeComponentModal() {
    if (isSavingComponent) {
      return
    }

    setComponentModalOpen(false)
    setComponentContext(null)
  }

  async function handleSaveComponent() {
    if (!componentContext) {
      return
    }

    const { section, component } = componentContext
    setIsSavingComponent(true)
    const previousSections = sections

    const payload = {
      ...(component ? { id: component.id } : {}),
      sectionId: section.id,
      code: componentForm.code.trim(),
      name: componentForm.name.trim(),
      description: componentForm.description.trim() || null,
      isRequired: componentForm.isRequired,
      allowMultiple: componentForm.allowMultiple,
      defaultOptionId: componentForm.defaultOptionId || null,
      sortOrder: Number(componentForm.sortOrder) || 0,
    }

    const optimisticId = component?.id ?? `temp-component-${Date.now()}`
    const optimisticComponent: ProductConfigurationComponent = {
      id: optimisticId,
      sectionId: section.id,
      code: payload.code,
      name: payload.name,
      description: payload.description,
      isRequired: payload.isRequired,
      allowMultiple: payload.allowMultiple,
      defaultOptionId: payload.defaultOptionId,
      sortOrder: payload.sortOrder,
      options: component ? component.options : [],
    }

    setSections((current) =>
      sortSections(
        current.map((currentSection) =>
          currentSection.id === section.id
            ? {
                ...currentSection,
                components: component
                  ? sortComponents(
                      currentSection.components.map((existing) =>
                        existing.id === component.id
                          ? { ...existing, ...optimisticComponent }
                          : existing
                      )
                    )
                  : sortComponents([...currentSection.components, optimisticComponent]),
              }
            : currentSection
        )
      )
    )

    try {
      const response = await fetch('/api/product-configurations/components', {
        method: component ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? 'Failed to save component')
      }

      const serverComponent = result.data as ProductConfigurationComponent
      const normalizedComponent: ProductConfigurationComponent = {
        ...serverComponent,
        options: sortOptions(serverComponent.options),
      }

      setSections((current) =>
        sortSections(
          current.map((currentSection) =>
            currentSection.id === section.id
              ? {
                  ...currentSection,
                  components: sortComponents(
                    currentSection.components.map((existing) =>
                      existing.id === optimisticId || existing.id === serverComponent.id
                        ? { ...existing, ...normalizedComponent }
                        : existing
                    )
                  ),
                }
              : currentSection
          )
        )
      )

      setComponentModalOpen(false)
      setComponentContext(null)
    } catch (error) {
      console.error('Error saving component:', error)
      setSections(previousSections)
      alert(error instanceof Error ? error.message : 'Failed to save component')
    } finally {
      setIsSavingComponent(false)
    }
  }

  function openCreateOption(
    section: ProductConfigurationSection,
    component: ProductConfigurationComponent
  ) {
    setOptionContext({ section, component })
    setOptionForm({
      code: '',
      partNumber: '',
      name: '',
      description: '',
      sortOrder: String(nextSortOrder(component.options)),
      isActive: true,
      isDefault: component.options.length === 0,
      dependencies: [],
    })
    setOptionModalOpen(true)
  }

  function openEditOption(
    section: ProductConfigurationSection,
    component: ProductConfigurationComponent,
    option: ProductConfigurationOption
  ) {
    setOptionContext({ section, component, option })
    setOptionForm({
      code: option.code,
      partNumber: option.partNumber ?? '',
      name: option.name,
      description: option.description ?? '',
      sortOrder: String(option.sortOrder),
      isActive: option.isActive,
      isDefault: option.isDefault,
      dependencies: option.dependencies.map((dependency) => ({
        dependsOnOptionId: dependency.dependsOnOptionId,
        dependencyType: dependency.dependencyType,
      })),
    })
    setOptionModalOpen(true)
  }

  function closeOptionModal() {
    if (isSavingOption) {
      return
    }

    setOptionModalOpen(false)
    setOptionContext(null)
  }
  async function handleSaveOption() {
    if (!optionContext) {
      return
    }

    const { section, component, option } = optionContext
    setIsSavingOption(true)
    const previousSections = sections

    const uniqueDependencies = new Map<string, DependencyFormState>()
    for (const dependency of optionForm.dependencies) {
      if (!dependency.dependsOnOptionId) {
        continue
      }

      if (dependency.dependsOnOptionId === option?.id) {
        continue
      }

      const key = `${dependency.dependsOnOptionId}-${dependency.dependencyType}`
      uniqueDependencies.set(key, dependency)
    }

    const dependencyPayload = Array.from(uniqueDependencies.values()).map((dependency) => ({
      dependsOnOptionId: dependency.dependsOnOptionId,
      dependencyType: dependency.dependencyType,
    }))

    const payload = {
      ...(option ? { id: option.id } : {}),
      componentId: component.id,
      code: optionForm.code.trim(),
      partNumber: optionForm.partNumber.trim() || null,
      name: optionForm.name.trim(),
      description: optionForm.description.trim() || null,
      isActive: optionForm.isActive,
      isDefault: optionForm.isDefault,
      sortOrder: Number(optionForm.sortOrder) || 0,
      dependencies: dependencyPayload,
    }

    const optimisticId = option?.id ?? `temp-option-${Date.now()}`
    const optimisticOption: ProductConfigurationOption = {
      id: optimisticId,
      componentId: component.id,
      code: payload.code,
      partNumber: payload.partNumber,
      name: payload.name,
      description: payload.description,
      isActive: payload.isActive,
      isDefault: payload.isDefault,
      sortOrder: payload.sortOrder,
      dependencies: dependencyPayload.map((dependency, index) => ({
        id: `${optimisticId}-dependency-${index}`,
        optionId: optimisticId,
        dependsOnOptionId: dependency.dependsOnOptionId,
        dependencyType: dependency.dependencyType,
      })),
      dependents: option ? option.dependents : [],
    }

    setSections((current) =>
      sortSections(
        current.map((currentSection) => {
          if (currentSection.id !== section.id) {
            return currentSection
          }

          return {
            ...currentSection,
            components: sortComponents(
              currentSection.components.map((existingComponent) => {
                if (existingComponent.id !== component.id) {
                  return existingComponent
                }

                let updatedOptions = option
                  ? existingComponent.options.map((existingOption) =>
                      existingOption.id === option.id
                        ? { ...existingOption, ...optimisticOption }
                        : existingOption
                    )
                  : [...existingComponent.options, optimisticOption]

                updatedOptions = sortOptions(updatedOptions)

                if (payload.isDefault) {
                  updatedOptions = updatedOptions.map((existingOption) =>
                    existingOption.id === optimisticId
                      ? { ...existingOption, isDefault: true }
                      : { ...existingOption, isDefault: false }
                  )
                } else if (
                  option?.isDefault &&
                  (existingComponent.defaultOptionId === option.id ||
                    existingComponent.defaultOptionId === optimisticId)
                ) {
                  updatedOptions = updatedOptions.map((existingOption) =>
                    existingOption.id === optimisticId
                      ? { ...existingOption, isDefault: false }
                      : existingOption
                  )
                }

                const defaultOptionId = payload.isDefault
                  ? optimisticId
                  : option?.id === existingComponent.defaultOptionId
                    ? null
                    : existingComponent.defaultOptionId

                return {
                  ...existingComponent,
                  defaultOptionId,
                  options: updatedOptions,
                }
              })
            ),
          }
        })
      )
    )

    try {
      const response = await fetch('/api/product-configurations/options', {
        method: option ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? 'Failed to save option')
      }

      const serverOption = result.data as ProductConfigurationOption
      const normalizedOption: ProductConfigurationOption = {
        ...serverOption,
        dependencies: serverOption.dependencies ?? [],
        dependents: serverOption.dependents ?? [],
      }

      setSections((current) =>
        sortSections(
          current.map((currentSection) => {
            if (currentSection.id !== section.id) {
              return currentSection
            }

            return {
              ...currentSection,
              components: sortComponents(
                currentSection.components.map((existingComponent) => {
                  if (existingComponent.id !== component.id) {
                    return existingComponent
                  }

                  let updatedOptions = existingComponent.options.map((existingOption) =>
                    existingOption.id === optimisticId || existingOption.id === serverOption.id
                      ? { ...existingOption, ...normalizedOption }
                      : existingOption
                  )

                  if (!updatedOptions.find((opt) => opt.id === serverOption.id)) {
                    updatedOptions = [...updatedOptions, normalizedOption]
                  }

                  updatedOptions = sortOptions(updatedOptions)

                  if (normalizedOption.isDefault) {
                    updatedOptions = updatedOptions.map((existingOption) =>
                      existingOption.id === normalizedOption.id
                        ? { ...existingOption, isDefault: true }
                        : { ...existingOption, isDefault: false }
                    )
                  } else if (
                    existingComponent.defaultOptionId === normalizedOption.id ||
                    existingComponent.defaultOptionId === optimisticId
                  ) {
                    updatedOptions = updatedOptions.map((existingOption) =>
                      existingOption.id === normalizedOption.id
                        ? { ...existingOption, isDefault: false }
                        : existingOption
                    )
                  }

                  const defaultOptionId = normalizedOption.isDefault
                    ? normalizedOption.id
                    : existingComponent.defaultOptionId === normalizedOption.id ||
                        existingComponent.defaultOptionId === optimisticId
                      ? null
                      : existingComponent.defaultOptionId

                  return {
                    ...existingComponent,
                    defaultOptionId,
                    options: updatedOptions,
                  }
                })
              ),
            }
          })
        )
      )

      setOptionModalOpen(false)
      setOptionContext(null)
    } catch (error) {
      console.error('Error saving option:', error)
      setSections(previousSections)
      alert(error instanceof Error ? error.message : 'Failed to save option')
    } finally {
      setIsSavingOption(false)
    }
  }

  const availableDependencyOptions = useMemo(() => {
    const disallowedId = optionContext?.option?.id
    return dependencyOptions.filter((option) => option.value !== disallowedId)
  }, [dependencyOptions, optionContext?.option?.id])

  return (
    <div className="p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <Card>
          <CardHeader divider>
            <CardTitle>Product Configuration Scope</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Product Model"
                value={selectedModelId}
                onChange={(event) => {
                  setSelectedModelId(event.target.value)
                  setSelectedTrimId('')
                }}
                options={models.map((model) => ({
                  value: model.id,
                  label: model.description ? `${model.name} — ${model.description}` : model.name,
                }))}
                placeholder={modelsLoading ? 'Loading models…' : 'Select a product model'}
                disabled={modelsLoading}
              />

              <Select
                label="Trim"
                value={selectedTrimId}
                onChange={(event) => setSelectedTrimId(event.target.value)}
                disabled={!selectedModel || selectedModel.trims.length === 0}
                options={[
                  { value: '', label: 'Model default (all trims)' },
                  ...((selectedModel?.trims ?? []).map((trim) => ({
                    value: trim.id,
                    label: trim.description ? `${trim.name} — ${trim.description}` : trim.name,
                  })) ?? []),
                ]}
              />
            </div>

            {modelsError && (
              <div className="rounded-md border border-[var(--status-danger-border)] bg-[var(--status-danger-surface)] px-4 py-3 text-sm text-[color:var(--status-danger-foreground)]">
                {modelsError}
              </div>
            )}

            {selectedModel && selectedModel.description && (
              <p className="text-sm text-[color:var(--muted-strong)]">
                {selectedModel.description}
              </p>
            )}
          </CardContent>
        </Card>

        {!selectedModel && (
          <Card>
            <CardContent className="p-6 text-sm text-[color:var(--muted-strong)]">
              Select a product model to browse and edit its configuration.
            </CardContent>
          </Card>
        )}

        {selectedModel && (
          <ConfigurationTree
            sections={sections}
            loading={sectionsLoading}
            error={sectionsError}
            onCreateSection={openCreateSection}
            onEditSection={openEditSection}
            onCreateComponent={openCreateComponent}
            onEditComponent={openEditComponent}
            onCreateOption={openCreateOption}
            onEditOption={openEditOption}
            dependencyTypeLabels={dependencyTypeLabels}
            resolveOptionLabel={resolveOptionLabel}
          />
        )}

        {sectionModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeSectionModal} />
            <div className="flex min-h-full items-center justify-center p-4">
              <Card className="relative w-full max-w-xl">
                <CardHeader divider>
                  <div className="flex items-center justify-between">
                    <CardTitle>{editingSection ? 'Edit Section' : 'Create Section'}</CardTitle>
                    <button
                      type="button"
                      onClick={closeSectionModal}
                      disabled={isSavingSection}
                      className="text-[color:var(--muted-strong)] hover:text-[color:var(--foreground)] disabled:cursor-not-allowed"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault()
                      void handleSaveSection()
                    }}
                  >
                    <Input
                      label="Section Name"
                      value={sectionForm.name}
                      onChange={(event) =>
                        setSectionForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      isRequired
                    />
                    <Input
                      label="Section Code"
                      value={sectionForm.code}
                      onChange={(event) =>
                        setSectionForm((current) => ({
                          ...current,
                          code: event.target.value,
                        }))
                      }
                      isRequired
                    />
                    <Textarea
                      label="Description"
                      value={sectionForm.description}
                      onChange={(event) =>
                        setSectionForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      rows={4}
                    />
                    <Input
                      label="Sort Order"
                      type="number"
                      value={sectionForm.sortOrder}
                      onChange={(event) =>
                        setSectionForm((current) => ({
                          ...current,
                          sortOrder: event.target.value,
                        }))
                      }
                      min={0}
                    />
                    <label className="flex items-center gap-2 text-sm text-[color:var(--foreground)]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[var(--border)]"
                        checked={sectionForm.isRequired}
                        onChange={(event) =>
                          setSectionForm((current) => ({
                            ...current,
                            isRequired: event.target.checked,
                          }))
                        }
                      />
                      <span>Required section</span>
                    </label>
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={closeSectionModal}
                        disabled={isSavingSection}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" loading={isSavingSection}>
                        Save Section
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {componentModalOpen && componentContext && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeComponentModal} />
            <div className="flex min-h-full items-center justify-center p-4">
              <Card className="relative w-full max-w-xl">
                <CardHeader divider>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {componentContext.component ? 'Edit Component' : 'Create Component'}
                    </CardTitle>
                    <button
                      type="button"
                      onClick={closeComponentModal}
                      disabled={isSavingComponent}
                      className="text-[color:var(--muted-strong)] hover:text-[color:var(--foreground)] disabled:cursor-not-allowed"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault()
                      void handleSaveComponent()
                    }}
                  >
                    <Input
                      label="Component Name"
                      value={componentForm.name}
                      onChange={(event) =>
                        setComponentForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      isRequired
                    />
                    <Input
                      label="Component Code"
                      value={componentForm.code}
                      onChange={(event) =>
                        setComponentForm((current) => ({
                          ...current,
                          code: event.target.value,
                        }))
                      }
                      isRequired
                    />
                    <Textarea
                      label="Description"
                      value={componentForm.description}
                      onChange={(event) =>
                        setComponentForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      rows={4}
                    />
                    <Input
                      label="Sort Order"
                      type="number"
                      value={componentForm.sortOrder}
                      onChange={(event) =>
                        setComponentForm((current) => ({
                          ...current,
                          sortOrder: event.target.value,
                        }))
                      }
                      min={0}
                    />
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-2 text-sm text-[color:var(--foreground)]">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-[var(--border)]"
                          checked={componentForm.isRequired}
                          onChange={(event) =>
                            setComponentForm((current) => ({
                              ...current,
                              isRequired: event.target.checked,
                            }))
                          }
                        />
                        <span>Required component</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-[color:var(--foreground)]">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-[var(--border)]"
                          checked={componentForm.allowMultiple}
                          onChange={(event) =>
                            setComponentForm((current) => ({
                              ...current,
                              allowMultiple: event.target.checked,
                            }))
                          }
                        />
                        <span>Allow multiple selections</span>
                      </label>
                    </div>

                    {componentContext.component &&
                      componentContext.component.options.length > 0 && (
                        <Select
                          label="Default Option"
                          value={componentForm.defaultOptionId}
                          onChange={(event) =>
                            setComponentForm((current) => ({
                              ...current,
                              defaultOptionId: event.target.value,
                            }))
                          }
                          options={[
                            { value: '', label: 'No default option' },
                            ...componentContext.component.options.map((option) => ({
                              value: option.id,
                              label: `${option.code} — ${option.name}`,
                            })),
                          ]}
                        />
                      )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={closeComponentModal}
                        disabled={isSavingComponent}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" loading={isSavingComponent}>
                        Save Component
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {optionModalOpen && optionContext && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeOptionModal} />
            <div className="flex min-h-full items-center justify-center p-4">
              <Card className="relative w-full max-w-2xl">
                <CardHeader divider>
                  <div className="flex items-center justify-between">
                    <CardTitle>{optionContext.option ? 'Edit Option' : 'Create Option'}</CardTitle>
                    <button
                      type="button"
                      onClick={closeOptionModal}
                      disabled={isSavingOption}
                      className="text-[color:var(--muted-strong)] hover:text-[color:var(--foreground)] disabled:cursor-not-allowed"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault()
                      void handleSaveOption()
                    }}
                  >
                    <Input
                      label="Option Name"
                      value={optionForm.name}
                      onChange={(event) =>
                        setOptionForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      isRequired
                    />
                    <Input
                      label="Option Code"
                      value={optionForm.code}
                      onChange={(event) =>
                        setOptionForm((current) => ({
                          ...current,
                          code: event.target.value,
                        }))
                      }
                      isRequired
                    />
                    <Input
                      label="Part Number (PN)"
                      value={optionForm.partNumber}
                      onChange={(event) =>
                        setOptionForm((current) => ({
                          ...current,
                          partNumber: event.target.value,
                        }))
                      }
                      placeholder="Optional part number"
                    />
                    <Textarea
                      label="Description"
                      value={optionForm.description}
                      onChange={(event) =>
                        setOptionForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      rows={4}
                    />
                    <Input
                      label="Sort Order"
                      type="number"
                      value={optionForm.sortOrder}
                      onChange={(event) =>
                        setOptionForm((current) => ({
                          ...current,
                          sortOrder: event.target.value,
                        }))
                      }
                      min={0}
                    />
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-2 text-sm text-[color:var(--foreground)]">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-[var(--border)]"
                          checked={optionForm.isActive}
                          onChange={(event) =>
                            setOptionForm((current) => ({
                              ...current,
                              isActive: event.target.checked,
                            }))
                          }
                        />
                        <span>Option is active</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-[color:var(--foreground)]">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-[var(--border)]"
                          checked={optionForm.isDefault}
                          onChange={(event) =>
                            setOptionForm((current) => ({
                              ...current,
                              isDefault: event.target.checked,
                            }))
                          }
                        />
                        <span>Set as default option</span>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[color:var(--muted-strong)]">
                          Dependencies
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setOptionForm((current) => ({
                              ...current,
                              dependencies: [
                                ...current.dependencies,
                                {
                                  dependsOnOptionId: availableDependencyOptions[0]?.value || '',
                                  dependencyType: dependencyTypeOptions[0].value,
                                },
                              ],
                            }))
                          }
                          disabled={availableDependencyOptions.length === 0}
                        >
                          Add Dependency
                        </Button>
                      </div>

                      {optionForm.dependencies.length === 0 ? (
                        <p className="text-xs text-[color:var(--muted-strong)]">
                          No dependencies configured.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {optionForm.dependencies.map((dependency, index) => (
                            <div
                              key={`${dependency.dependsOnOptionId}-${index}`}
                              className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
                            >
                              <Select
                                label="Dependency Type"
                                value={dependency.dependencyType}
                                onChange={(event) =>
                                  setOptionForm((current) => ({
                                    ...current,
                                    dependencies: current.dependencies.map(
                                      (existing, dependencyIndex) =>
                                        dependencyIndex === index
                                          ? {
                                              ...existing,
                                              dependencyType: event.target.value as DependencyType,
                                            }
                                          : existing
                                    ),
                                  }))
                                }
                                options={dependencyTypeOptions}
                              />
                              <div className="flex items-end gap-2">
                                <Select
                                  label="Depends On"
                                  value={dependency.dependsOnOptionId}
                                  onChange={(event) =>
                                    setOptionForm((current) => ({
                                      ...current,
                                      dependencies: current.dependencies.map(
                                        (existing, dependencyIndex) =>
                                          dependencyIndex === index
                                            ? {
                                                ...existing,
                                                dependsOnOptionId: event.target.value,
                                              }
                                            : existing
                                      ),
                                    }))
                                  }
                                  options={availableDependencyOptions}
                                  placeholder={
                                    availableDependencyOptions.length === 0
                                      ? 'No options available'
                                      : 'Select option'
                                  }
                                />
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    setOptionForm((current) => ({
                                      ...current,
                                      dependencies: current.dependencies.filter(
                                        (_, dependencyIndex) => dependencyIndex !== index
                                      ),
                                    }))
                                  }
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={closeOptionModal}
                        disabled={isSavingOption}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" loading={isSavingOption}>
                        Save Option
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

async function safeParseError(response: Response) {
  try {
    const payload = await response.json()

    if (typeof payload.error === 'string') {
      return payload.error
    }

    if (typeof payload.message === 'string') {
      return payload.message
    }
  } catch (error) {
    console.error('Failed to parse error response:', error)
  }

  return null
}
