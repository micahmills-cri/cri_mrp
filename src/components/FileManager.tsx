'use client'

import { useState } from 'react'
import FileUpload from './FileUpload'
import FileListDisplay from './FileListDisplay'

type FileManagerProps = {
  workOrderId: string
  onError?: (error: string) => void
  onSuccess?: (message: string) => void
}

export default function FileManager({ workOrderId, onError, onSuccess }: FileManagerProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showUpload, setShowUpload] = useState(false)

  // Trigger refresh of file list
  const handleFileUploaded = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
          File Management
        </h3>
        <button
          onClick={() => setShowUpload(!showUpload)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: showUpload ? 'var(--muted)' : 'var(--status-success-accent)',
            color: showUpload ? 'var(--foreground)' : 'var(--status-success-foreground)',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          {showUpload ? 'Hide Upload' : 'Upload Files'}
        </button>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div style={{
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: 'var(--surface-muted)',
          borderRadius: '4px',
          border: '1px solid var(--border-strong)'
        }}>
          <FileUpload
            workOrderId={workOrderId}
            onSuccess={(message) => {
              onSuccess?.(message)
              handleFileUploaded()
            }}
            onError={onError}
            onFileUploaded={handleFileUploaded}
          />
        </div>
      )}

      {/* File List Section */}
      <FileListDisplay
        workOrderId={workOrderId}
        onError={onError}
        onSuccess={onSuccess}
        refreshTrigger={refreshTrigger}
      />
    </div>
  )
}