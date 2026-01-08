'use client'

import { useState, useEffect } from 'react'
import clsx from 'clsx'

import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

type ProductModel = {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  trims: ProductTrim[]
}

type ProductTrim = {
  id: string
  productModelId: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
}

type ModelTrimSelectorProps = {
  selectedModelId?: string
  selectedTrimId?: string
  year?: number
  onModelChange?: (modelId: string, model: ProductModel | null) => void
  onTrimChange?: (trimId: string, trim: ProductTrim | null) => void
  onYearChange?: (year: number) => void
  onSkuGenerated?: (sku: string) => void
  onError?: (error: string) => void
  disabled?: boolean
}

export default function ModelTrimSelector({
  selectedModelId = '',
  selectedTrimId = '',
  year = new Date().getFullYear(),
  onModelChange,
  onTrimChange,
  onYearChange,
  onSkuGenerated,
  onError,
  disabled = false,
}: ModelTrimSelectorProps) {
  const [models, setModels] = useState<ProductModel[]>([])
  const [availableTrims, setAvailableTrims] = useState<ProductTrim[]>([])
  const [loading, setLoading] = useState(false)
  const [generatedSku, setGeneratedSku] = useState('')
  const [generating, setGenerating] = useState(false)

  const loadModels = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/product-models', {
        credentials: 'include',
      })

      if (response.ok) {
        const modelsData = await response.json()
        setModels(modelsData)

        if (selectedModelId) {
          const selectedModel = modelsData.find(
            (model: ProductModel) => model.id === selectedModelId
          )
          if (selectedModel) {
            setAvailableTrims(selectedModel.trims)
          }
        }
      } else {
        const error = await response.json()
        onError?.(error.message || 'Failed to load product models')
      }
    } catch (err) {
      onError?.('Network error loading product models')
    } finally {
      setLoading(false)
    }
  }

  const handleModelChange = (modelId: string) => {
    const selectedModel = models.find((model) => model.id === modelId) || null

    if (selectedModel) {
      setAvailableTrims(selectedModel.trims)
    } else {
      setAvailableTrims([])
    }

    if (modelId !== selectedModelId) {
      onTrimChange?.('', null)
    }

    onModelChange?.(modelId, selectedModel)
    setGeneratedSku('')
  }

  const handleTrimChange = (trimId: string) => {
    const selectedTrim = availableTrims.find((trim) => trim.id === trimId) || null
    onTrimChange?.(trimId, selectedTrim)
    setGeneratedSku('')
  }

  const handleYearChange = (newYear: number) => {
    onYearChange?.(newYear)
    setGeneratedSku('')
  }

  const generateSku = async () => {
    if (!selectedModelId || !selectedTrimId) {
      return
    }

    setGenerating(true)
    try {
      const response = await fetch('/api/sku/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productModelId: selectedModelId,
          productTrimId: selectedTrimId,
          year,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setGeneratedSku(data.sku)
        onSkuGenerated?.(data.sku)
      } else {
        const error = await response.json()
        onError?.(error.message || 'Failed to generate SKU')
      }
    } catch (err) {
      onError?.('Network error generating SKU')
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    if (selectedModelId && selectedTrimId && year) {
      void generateSku()
    }
  }, [selectedModelId, selectedTrimId, year])

  useEffect(() => {
    void loadModels()
  }, [])

  const modelOptions = models.map((model) => ({
    value: model.id,
    label: model.description ? `${model.name} — ${model.description}` : model.name,
  }))

  const trimOptions = availableTrims.map((trim) => ({
    value: trim.id,
    label: trim.description ? `${trim.name} — ${trim.description}` : trim.name,
  }))

  return (
    <div className="flex flex-col gap-4 text-[color:var(--foreground)]">
      <Select
        label="Product Model *"
        value={selectedModelId}
        onChange={(event) => handleModelChange(event.target.value)}
        disabled={disabled || loading}
        options={modelOptions}
        placeholder={loading ? 'Loading models…' : 'Select a model'}
      />

      <Select
        label="Product Trim *"
        value={selectedTrimId}
        onChange={(event) => handleTrimChange(event.target.value)}
        disabled={disabled || !selectedModelId || trimOptions.length === 0}
        options={trimOptions}
        placeholder={
          !selectedModelId
            ? 'Select a model first'
            : trimOptions.length === 0
              ? 'No trims available'
              : 'Select a trim'
        }
      />

      <Input
        type="number"
        label="Model Year"
        value={year}
        onChange={(event) =>
          handleYearChange(parseInt(event.target.value, 10) || new Date().getFullYear())
        }
        disabled={disabled}
        min={2020}
        max={2030}
      />

      {(generatedSku || generating) && (
        <div className="space-y-2">
          <span className="block text-sm font-medium text-[color:var(--muted-strong)]">
            Generated SKU
          </span>
          <div
            className={clsx(
              'flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-mono',
              generating
                ? 'border-[var(--border)] bg-[var(--surface-muted)]'
                : 'border-[var(--status-success-border)] bg-[var(--status-success-surface)]'
            )}
          >
            {generating ? (
              <>
                <span>Generating…</span>
                <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--color-primary-600)]" />
              </>
            ) : (
              <>
                <span className="font-semibold text-[color:var(--status-success-foreground)]">
                  {generatedSku}
                </span>
                <span className="text-base text-[color:var(--color-success-600)]">✓</span>
              </>
            )}
          </div>
        </div>
      )}

      {selectedModelId && !selectedTrimId && (
        <div className="rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-surface)] px-3 py-2 text-xs text-[color:var(--status-warning-foreground)]">
          Please select a trim to generate the SKU
        </div>
      )}
    </div>
  )
}
