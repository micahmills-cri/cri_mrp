'use client'

import { useState, useRef } from 'react'

type FileUploadProps = {
  workOrderId: string
  onSuccess?: (message: string) => void
  onError?: (error: string) => void
  onFileUploaded?: () => void
}

type UploadProgress = {
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

export default function FileUpload({ workOrderId, onSuccess, onError, onFileUploaded }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFiles(files)
    }
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFiles(files)
    }
  }

  // Process selected files
  const handleFiles = async (files: File[]) => {
    // Validate files
    const maxSize = 10 * 1024 * 1024 // 10MB
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        onError?.(`File ${file.name} is too large. Maximum size is 10MB.`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    // Initialize upload progress
    const newUploads: UploadProgress[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading'
    }))
    
    setUploads(prev => [...prev, ...newUploads])

    // Upload each file
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      const uploadIndex = uploads.length + i
      
      try {
        await uploadFile(file, uploadIndex)
      } catch (error) {
        console.error('Error uploading file:', error)
      }
    }
  }

  // Upload single file
  const uploadFile = async (file: File, uploadIndex: number) => {
    try {
      // Step 1: Get presigned URL
      const uploadResponse = await fetch('/api/attachments/upload', {
        method: 'POST',
        credentials: 'include'
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL')
      }

      const { uploadURL } = await uploadResponse.json()

      // Step 2: Upload file to storage
      const uploadRequest = new XMLHttpRequest()
      
      uploadRequest.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setUploads(prev => prev.map((upload, index) => 
            index === uploadIndex ? { ...upload, progress } : upload
          ))
        }
      })

      await new Promise<void>((resolve, reject) => {
        uploadRequest.onload = () => {
          if (uploadRequest.status === 200) {
            resolve()
          } else {
            reject(new Error('Upload failed'))
          }
        }
        
        uploadRequest.onerror = () => reject(new Error('Upload failed'))
        
        uploadRequest.open('PUT', uploadURL)
        uploadRequest.setRequestHeader('Content-Type', file.type)
        uploadRequest.send(file)
      })

      // Step 3: Create attachment record
      const recordResponse = await fetch(`/api/work-orders/${workOrderId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fileUrl: uploadURL.split('?')[0], // Remove query params
          originalName: file.name,
          fileSize: file.size.toString(),
          mimeType: file.type
        })
      })

      if (!recordResponse.ok) {
        const error = await recordResponse.json()
        throw new Error(error.message || 'Failed to create attachment record')
      }

      // Update upload status to completed
      setUploads(prev => prev.map((upload, index) => 
        index === uploadIndex 
          ? { ...upload, status: 'completed', progress: 100 }
          : upload
      ))

      onSuccess?.(`File ${file.name} uploaded successfully`)
      onFileUploaded?.()

    } catch (error) {
      // Update upload status to error
      setUploads(prev => prev.map((upload, index) => 
        index === uploadIndex 
          ? { 
              ...upload, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Upload failed' 
            }
          : upload
      ))

      onError?.(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Clear completed uploads
  const clearCompleted = () => {
    setUploads(prev => prev.filter(upload => upload.status !== 'completed'))
  }

  // Remove upload
  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index))
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1rem' 
      }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
          File Attachments
        </h3>
        {uploads.some(u => u.status === 'completed') && (
          <button
            onClick={clearCompleted}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: 'transparent',
              color: '#6c757d',
              border: '1px solid #ced4da',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Clear Completed
          </button>
        )}
      </div>

      {/* Drop Zone */}
      <div
        onDrag={handleDrag}
        onDragStart={handleDrag}
        onDragEnd={handleDrag}
        onDragOver={handleDrag}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? '#007bff' : '#dee2e6'}`,
          borderRadius: '4px',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: isDragging ? '#e3f2fd' : '#f8f9fa',
          cursor: 'pointer',
          marginBottom: '1rem',
          transition: 'all 0.2s ease'
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
        <div style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.25rem' }}>
          {isDragging ? 'Drop files here' : 'Drop files here or click to browse'}
        </div>
        <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
          Maximum file size: 10MB
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
            Upload Progress
          </h4>
          
          {uploads.map((upload, index) => (
            <div key={index} style={{
              backgroundColor: 'white',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              padding: '0.75rem',
              marginBottom: '0.5rem'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                    {upload.file.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                    {formatFileSize(upload.file.size)}
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {upload.status === 'uploading' && (
                    <span style={{ fontSize: '0.75rem', color: '#007bff' }}>
                      {upload.progress}%
                    </span>
                  )}
                  {upload.status === 'completed' && (
                    <span style={{ fontSize: '0.75rem', color: '#28a745' }}>
                      ✓ Complete
                    </span>
                  )}
                  {upload.status === 'error' && (
                    <span style={{ fontSize: '0.75rem', color: '#dc3545' }}>
                      ✗ Error
                    </span>
                  )}
                  
                  <button
                    onClick={() => removeUpload(index)}
                    style={{
                      padding: '0.125rem',
                      backgroundColor: 'transparent',
                      color: '#6c757d',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              {upload.status === 'uploading' && (
                <div style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${upload.progress}%`,
                    height: '100%',
                    backgroundColor: '#007bff',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              )}
              
              {upload.status === 'error' && upload.error && (
                <div style={{
                  fontSize: '0.75rem',
                  color: '#dc3545',
                  marginTop: '0.25rem'
                }}>
                  {upload.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}