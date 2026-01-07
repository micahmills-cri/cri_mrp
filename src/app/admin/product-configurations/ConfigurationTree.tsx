'use client'

import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

import {
  ProductConfigurationComponent,
  ProductConfigurationOption,
  ProductConfigurationSection,
  DependencyType,
} from './types'

const badgeStyles: Record<string, string> = {
  required: 'bg-green-100 text-green-800',
  optional: 'bg-gray-100 text-gray-800',
  default: 'bg-blue-100 text-blue-800',
  inactive: 'bg-gray-200 text-gray-700',
  active: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-800',
}

type ConfigurationTreeProps = {
  sections: ProductConfigurationSection[]
  loading: boolean
  error?: string | null
  onCreateSection: () => void
  onEditSection: (section: ProductConfigurationSection) => void
  onCreateComponent: (section: ProductConfigurationSection) => void
  onEditComponent: (
    section: ProductConfigurationSection,
    component: ProductConfigurationComponent
  ) => void
  onCreateOption: (
    section: ProductConfigurationSection,
    component: ProductConfigurationComponent
  ) => void
  onEditOption: (
    section: ProductConfigurationSection,
    component: ProductConfigurationComponent,
    option: ProductConfigurationOption
  ) => void
  dependencyTypeLabels: Record<DependencyType, string>
  resolveOptionLabel: (optionId: string) => string | null
}

export function ConfigurationTree({
  sections,
  loading,
  error,
  onCreateSection,
  onEditSection,
  onCreateComponent,
  onEditComponent,
  onCreateOption,
  onEditOption,
  dependencyTypeLabels,
  resolveOptionLabel,
}: ConfigurationTreeProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--foreground)]">
            Configuration Hierarchy
          </h2>
          <p className="text-sm text-[color:var(--muted-strong)]">
            Manage sections, components, and options for the selected product model.
          </p>
        </div>
        <Button onClick={onCreateSection}>Add Section</Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-6 text-sm text-[color:var(--muted-strong)]">
            Loading configuration…
          </CardContent>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <CardContent className="p-6 text-sm text-[color:var(--status-danger-foreground)]">
            {error}
          </CardContent>
        </Card>
      )}

      {!loading && !error && sections.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-[color:var(--muted-strong)]">
            No configuration sections found. Create a section to get started.
          </CardContent>
        </Card>
      )}

      {sections.map((section) => (
        <Card key={section.id} className="border-[var(--border)]">
          <CardHeader divider>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                  <span>{section.name}</span>
                  <span className="rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-strong)]">
                    {section.code}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyles[section.isRequired ? 'required' : 'optional']}`}
                  >
                    {section.isRequired ? 'Required' : 'Optional'}
                  </span>
                </CardTitle>
                <div className="flex flex-wrap gap-3 text-xs text-[color:var(--muted-strong)]">
                  <span>Sort Order: {section.sortOrder}</span>
                  {section.productTrim ? (
                    <span>Trim: {section.productTrim.name}</span>
                  ) : (
                    <span>Model-wide section</span>
                  )}
                </div>
                {section.description && (
                  <p className="text-sm text-[color:var(--muted-strong)]">{section.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => onEditSection(section)}>
                  Edit Section
                </Button>
                <Button size="sm" onClick={() => onCreateComponent(section)}>
                  Add Component
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {section.components.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-[color:var(--muted-strong)]">
                No components in this section yet. Add one to begin defining options.
              </div>
            ) : (
              section.components.map((component) => (
                <div
                  key={component.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[color:var(--foreground)]">
                        <span className="text-base font-semibold">{component.name}</span>
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-strong)]">
                          {component.code}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyles[component.isRequired ? 'required' : 'optional']}`}
                        >
                          {component.isRequired ? 'Required' : 'Optional'}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${component.allowMultiple ? badgeStyles.warning : badgeStyles.optional}`}
                        >
                          {component.allowMultiple ? 'Allows Multiple' : 'Single Select'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-[color:var(--muted-strong)]">
                        <span>Sort Order: {component.sortOrder}</span>
                        <span>
                          Default Option:{' '}
                          {component.defaultOptionId
                            ? resolveOptionLabel(component.defaultOptionId) ||
                              component.defaultOptionId
                            : 'None'}
                        </span>
                      </div>
                      {component.description && (
                        <p className="text-sm text-[color:var(--muted-strong)]">
                          {component.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onEditComponent(section, component)}
                      >
                        Edit Component
                      </Button>
                      <Button size="sm" onClick={() => onCreateOption(section, component)}>
                        Add Option
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    {component.options.length === 0 ? (
                      <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[color:var(--muted-strong)]">
                        No options have been configured for this component.
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-[var(--border)] text-left text-sm">
                        <thead className="bg-[var(--surface)] text-xs uppercase tracking-wide text-[color:var(--muted-strong)]">
                          <tr>
                            <th className="px-4 py-3 font-medium">Option</th>
                            <th className="px-4 py-3 font-medium">Code</th>
                            <th className="px-4 py-3 font-medium">Part Number</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Dependencies</th>
                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {component.options.map((option) => (
                            <tr key={option.id} className="bg-[var(--surface)]">
                              <td className="px-4 py-3 align-top">
                                <div className="space-y-1">
                                  <div className="font-medium text-[color:var(--foreground)]">
                                    {option.name}
                                  </div>
                                  {option.description && (
                                    <p className="text-xs text-[color:var(--muted-strong)]">
                                      {option.description}
                                    </p>
                                  )}
                                  <p className="text-xs text-[color:var(--muted)]">
                                    Sort Order: {option.sortOrder}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-[color:var(--muted-strong)]">
                                {option.code}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-[color:var(--muted-strong)]">
                                {option.partNumber || '—'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyles[option.isActive ? 'active' : 'inactive']}`}
                                  >
                                    {option.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                  {option.isDefault && (
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyles.default}`}
                                    >
                                      Default
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {option.dependencies.length === 0 ? (
                                  <span className="text-xs text-[color:var(--muted-strong)]">
                                    None
                                  </span>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {option.dependencies.map((dependency) => {
                                      const label =
                                        resolveOptionLabel(dependency.dependsOnOptionId) ||
                                        dependency.dependsOnOptionId

                                      return (
                                        <span
                                          key={dependency.id}
                                          className="rounded-full bg-[var(--muted-weak)] px-2 py-0.5 text-xs text-[color:var(--muted-strong)]"
                                        >
                                          {dependencyTypeLabels[dependency.dependencyType]}: {label}
                                        </span>
                                      )
                                    })}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => onEditOption(section, component, option)}
                                >
                                  Edit
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
