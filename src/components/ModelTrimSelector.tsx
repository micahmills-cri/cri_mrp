'use client'

import { useState, useEffect } from 'react'

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
  disabled = false
}: ModelTrimSelectorProps) {
  const [models, setModels] = useState<ProductModel[]>([])
  const [availableTrims, setAvailableTrims] = useState<ProductTrim[]>([])
  const [loading, setLoading] = useState(false)
  const [generatedSku, setGeneratedSku] = useState('')
  const [generating, setGenerating] = useState(false)

  // Load product models
  const loadModels = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/product-models', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const modelsData = await response.json()
        setModels(modelsData)
        
        // If a model is pre-selected, update available trims
        if (selectedModelId) {
          const selectedModel = modelsData.find((m: ProductModel) => m.id === selectedModelId)
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

  // Handle model selection change
  const handleModelChange = (modelId: string) => {
    const selectedModel = models.find(m => m.id === modelId) || null
    
    // Update available trims
    if (selectedModel) {
      setAvailableTrims(selectedModel.trims)
    } else {
      setAvailableTrims([])
    }
    
    // Clear trim selection if model changes
    if (modelId !== selectedModelId) {
      onTrimChange?.('', null)
    }
    
    onModelChange?.(modelId, selectedModel)
    
    // Clear generated SKU when model changes
    setGeneratedSku('')
  }

  // Handle trim selection change
  const handleTrimChange = (trimId: string) => {
    const selectedTrim = availableTrims.find(t => t.id === trimId) || null
    onTrimChange?.(trimId, selectedTrim)
    
    // Clear generated SKU when trim changes
    setGeneratedSku('')
  }

  // Handle year change
  const handleYearChange = (newYear: number) => {
    onYearChange?.(newYear)
    
    // Clear generated SKU when year changes
    setGeneratedSku('')
  }

  // Generate SKU
  const generateSku = async () => {
    if (!selectedModelId || !selectedTrimId) return
    
    setGenerating(true)
    try {
      const response = await fetch('/api/sku/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productModelId: selectedModelId,
          productTrimId: selectedTrimId,
          year
        })
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

  // Auto-generate SKU when all fields are selected
  useEffect(() => {
    if (selectedModelId && selectedTrimId && year) {
      generateSku()
    }
  }, [selectedModelId, selectedTrimId, year])

  // Load models on mount
  useEffect(() => {
    loadModels()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Model Selection */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '0.25rem',
          color: '#374151'
        }}>
          Product Model *
        </label>
        <select
          value={selectedModelId}
          onChange={(e) => handleModelChange(e.target.value)}
          disabled={disabled || loading}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '0.875rem',
            backgroundColor: disabled ? '#f8f9fa' : 'white',
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
        >
          <option value="">
            {loading ? 'Loading models...' : 'Select a model'}
          </option>
          {models.map(model => (
            <option key={model.id} value={model.id}>
              {model.name} - {model.description}
            </option>
          ))}
        </select>
      </div>

      {/* Trim Selection */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '0.25rem',
          color: '#374151'
        }}>
          Product Trim *
        </label>
        <select
          value={selectedTrimId}
          onChange={(e) => handleTrimChange(e.target.value)}
          disabled={disabled || !selectedModelId || availableTrims.length === 0}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '0.875rem',
            backgroundColor: disabled || !selectedModelId ? '#f8f9fa' : 'white',
            cursor: disabled || !selectedModelId ? 'not-allowed' : 'pointer'
          }}
        >
          <option value="">
            {!selectedModelId 
              ? 'Select a model first' 
              : availableTrims.length === 0 
                ? 'No trims available' 
                : 'Select a trim'}
          </option>
          {availableTrims.map(trim => (
            <option key={trim.id} value={trim.id}>
              {trim.name} - {trim.description}
            </option>
          ))}
        </select>
      </div>

      {/* Year Selection */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '0.25rem',
          color: '#374151'
        }}>
          Model Year
        </label>
        <input
          type="number"
          value={year}
          onChange={(e) => handleYearChange(parseInt(e.target.value) || new Date().getFullYear())}
          disabled={disabled}
          min={2020}
          max={2030}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '0.875rem',
            backgroundColor: disabled ? '#f8f9fa' : 'white'
          }}
        />
      </div>

      {/* Generated SKU Display */}
      {(generatedSku || generating) && (
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            marginBottom: '0.25rem',
            color: '#374151'
          }}>
            Generated SKU
          </label>
          <div style={{
            padding: '0.5rem',
            backgroundColor: generating ? '#f8f9fa' : '#e8f5e9',
            border: `1px solid ${generating ? '#ced4da' : '#28a745'}`,
            borderRadius: '4px',
            fontSize: '0.875rem',
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {generating ? (
              <>
                <span>Generating...</span>
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid #ced4da',
                  borderTop: '2px solid #007bff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              </>
            ) : (
              <>
                <span style={{ color: '#155724', fontWeight: '500' }}>
                  {generatedSku}
                </span>
                <span style={{ color: '#28a745', fontSize: '1rem' }}>✓</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Validation Message */}
      {selectedModelId && !selectedTrimId && (
        <div style={{
          fontSize: '0.75rem',
          color: '#856404',
          backgroundColor: '#fff3cd',
          padding: '0.5rem',
          borderRadius: '4px',
          border: '1px solid #ffeaa7'
        }}>
          Please select a trim to generate the SKU
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}