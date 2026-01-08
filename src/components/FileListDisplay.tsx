'use client'

import { useState, useEffect } from 'react'
import {
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  TableCellsIcon,
  PresentationChartBarIcon
} from '@heroicons/react/24/solid'

type FileAttachment = {
  id: string
  workOrderId: string
  userId: string
  fileUrl: string
  originalName: string
  fileSize: string
  mimeType?: string
  createdAt: string
  user: {
    id: string
    email: string
    role: string
  }
}

type FileListDisplayProps = {
  workOrderId: string
  onError?: (error: string) => void
  onSuccess?: (message: string) => void
  refreshTrigger?: number // Used to trigger refresh from parent
  readOnly?: boolean // When true, hides delete buttons and selection
}

export default function FileListDisplay({ 
  workOrderId, 
  onError, 
  onSuccess,
  refreshTrigger,
  readOnly = false
}: FileListDisplayProps) {
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  // Load attachments
  const loadAttachments = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/work-orders/${workOrderId}/attachments`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setAttachments(data)
      } else {
        const error = await response.json()
        onError?.(error.message || 'Failed to load attachments')
      }
    } catch (err) {
      onError?.('Network error loading attachments')
    } finally {
      setLoading(false)
    }
  }

  // Delete attachment
  const deleteAttachment = async (attachmentId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) return
    
    try {
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (response.ok) {
        setAttachments(prev => prev.filter(att => att.id !== attachmentId))
        setSelectedFiles(prev => {
          const newSet = new Set(prev)
          newSet.delete(attachmentId)
          return newSet
        })
        onSuccess?.(`File ${fileName} deleted successfully`)
      } else {
        const error = await response.json()
        onError?.(error.message || 'Failed to delete attachment')
      }
    } catch (err) {
      onError?.('Network error deleting attachment')
    }
  }

  // Upload file
  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/work-orders/${workOrderId}/attachments`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      if (response.ok) {
        const newAttachment = await response.json()
        setAttachments(prev => [newAttachment, ...prev])
        onSuccess?.(`File ${file.name} uploaded successfully`)
      } else {
        const error = await response.json()
        onError?.(error.message || 'Failed to upload file')
      }
    } catch (err) {
      onError?.('Network error uploading file')
    } finally {
      setUploading(false)
    }
  }

  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      uploadFile(files[0])
      event.target.value = '' // Reset input for repeat uploads
    }
  }

  // Bulk delete
  const bulkDelete = async () => {
    if (selectedFiles.size === 0) return
    
    const fileNames = attachments
      .filter(att => selectedFiles.has(att.id))
      .map(att => att.originalName)
      .join(', ')
    
    if (!confirm(`Delete ${selectedFiles.size} file(s):\n${fileNames}?`)) return
    
    const deletePromises = Array.from(selectedFiles).map(id => 
      fetch(`/api/attachments/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
    )
    
    try {
      const results = await Promise.allSettled(deletePromises)
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      
      if (successful > 0) {
        setAttachments(prev => prev.filter(att => !selectedFiles.has(att.id)))
        setSelectedFiles(new Set())
        onSuccess?.(`Successfully deleted ${successful} file(s)`)
      }
      
      if (failed > 0) {
        onError?.(`Failed to delete ${failed} file(s)`)
      }
    } catch (err) {
      onError?.('Error during bulk delete operation')
    }
  }

  // State for image lightbox
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null)

  // Check if file can be viewed inline
  const canViewInline = (mimeType?: string) => {
    if (!mimeType) return false
    return mimeType.startsWith('image/') || mimeType === 'application/pdf'
  }

  // Check if file is an image
  const isImage = (mimeType?: string) => {
    if (!mimeType) return false
    return mimeType.startsWith('image/')
  }

  // View file inline
  const viewFile = async (attachment: FileAttachment) => {
    const viewUrl = `/api/attachments/${attachment.id}?inline=true`
    
    if (isImage(attachment.mimeType)) {
      setLightboxImage({ url: viewUrl, name: attachment.originalName })
    } else {
      window.open(viewUrl, '_blank')
    }
  }

  // Download file
  const downloadFile = async (attachment: FileAttachment) => {
    try {
      const response = await fetch(`/api/attachments/${attachment.id}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = attachment.originalName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        onSuccess?.(`Downloaded ${attachment.originalName}`)
      } else {
        const error = await response.json()
        onError?.(error.message || 'Failed to download file')
      }
    } catch (err) {
      onError?.('Network error downloading file')
    }
  }

  // Toggle file selection
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      return newSet
    })
  }

  // Select all/none
  const selectAll = () => {
    if (selectedFiles.size === filteredAttachments.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(filteredAttachments.map(att => att.id)))
    }
  }

  // Format file size
  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes)
    if (size === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(size) / Math.log(k))
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Get file icon
  const getFileIcon = (mimeType?: string) => {
    const iconClass = "h-6 w-6"
    
    if (!mimeType) return <DocumentIcon className={iconClass} />
    if (mimeType.startsWith('image/')) return <PhotoIcon className={iconClass} />
    if (mimeType.startsWith('video/')) return <VideoCameraIcon className={iconClass} />
    if (mimeType.startsWith('audio/')) return <MusicalNoteIcon className={iconClass} />
    if (mimeType.includes('pdf')) return <DocumentTextIcon className={iconClass} />
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <ArchiveBoxIcon className={iconClass} />
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return <TableCellsIcon className={iconClass} />
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <PresentationChartBarIcon className={iconClass} />
    if (mimeType.includes('document') || mimeType.includes('word')) return <DocumentIcon className={iconClass} />
    if (mimeType.includes('text/')) return <DocumentTextIcon className={iconClass} />
    return <DocumentIcon className={iconClass} />
  }

  // Filter attachments
  const filteredAttachments = attachments.filter(att => {
    const matchesSearch = att.originalName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || 
      (filterType === 'images' && att.mimeType?.startsWith('image/')) ||
      (filterType === 'documents' && (att.mimeType?.includes('pdf') || att.mimeType?.includes('document') || att.mimeType?.includes('word'))) ||
      (filterType === 'other' && !att.mimeType?.startsWith('image/') && !att.mimeType?.includes('pdf') && !att.mimeType?.includes('document') && !att.mimeType?.includes('word'))
    
    return matchesSearch && matchesType
  })

  // Load attachments on mount and when refreshTrigger changes
  useEffect(() => {
    loadAttachments()
  }, [workOrderId, refreshTrigger])

  // Handle ESC key to close lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxImage) {
        setLightboxImage(null)
      }
    }
    
    if (lightboxImage) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [lightboxImage])

  return (
    <div style={{ padding: '1rem' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
          Attachments ({filteredAttachments.length})
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!readOnly && (
            <label style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--status-success-accent)',
              color: 'var(--status-success-foreground)',
              border: 'none',
              borderRadius: '4px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              {uploading ? 'Uploading...' : 'Add File'}
              <input
                type="file"
                onChange={handleFileChange}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
          )}
          <button
            onClick={loadAttachments}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              color: 'var(--status-info-accent)',
              border: '1px solid var(--status-info-accent)',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem'
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1rem',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '0.5rem',
            backgroundColor: 'var(--surface)',
            color: 'var(--foreground)',
            border: '1px solid var(--border-strong)',
            borderRadius: '4px',
            fontSize: '0.875rem'
          }}
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: '0.5rem',
            backgroundColor: 'var(--surface)',
            color: 'var(--foreground)',
            border: '1px solid var(--border-strong)',
            borderRadius: '4px',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Files</option>
          <option value="images">Images</option>
          <option value="documents">Documents</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Bulk Actions - hidden in readOnly mode */}
      {!readOnly && filteredAttachments.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1rem',
          alignItems: 'center'
        }}>
          <button
            onClick={selectAll}
            style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: 'transparent',
              color: 'var(--muted)',
              border: '1px solid var(--border-strong)',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            {selectedFiles.size === filteredAttachments.length ? 'Deselect All' : 'Select All'}
          </button>
          {selectedFiles.size > 0 && (
            <>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                {selectedFiles.size} selected
              </span>
              <button
                onClick={bulkDelete}
                style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: 'var(--status-danger-accent)',
                  color: 'var(--status-danger-foreground)',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
              >
                Delete Selected
              </button>
            </>
          )}
        </div>
      )}

      {/* File List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
          Loading attachments...
        </div>
      ) : filteredAttachments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
          {searchQuery || filterType !== 'all' 
            ? 'No files match your filters.' 
            : 'No files attached yet.'}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: '0.5rem'
        }}>
          {filteredAttachments.map(attachment => (
            <div key={attachment.id} style={{
              backgroundColor: 'var(--surface)',
              border: !readOnly && selectedFiles.has(attachment.id) ? '2px solid var(--status-info-accent)' : '1px solid var(--border-strong)',
              borderRadius: '4px',
              padding: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: readOnly ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}>
              {/* Checkbox - hidden in readOnly mode */}
              {!readOnly && (
                <input
                  type="checkbox"
                  checked={selectedFiles.has(attachment.id)}
                  onChange={() => toggleFileSelection(attachment.id)}
                  style={{ cursor: 'pointer' }}
                />
              )}
              
              {/* File Icon */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                color: 'var(--muted)'
              }}>
                {getFileIcon(attachment.mimeType)}
              </div>
              
              {/* File Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', fontSize: '0.875rem', color: 'var(--foreground)' }}>
                  {attachment.originalName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {formatFileSize(attachment.fileSize)} • {formatDate(attachment.createdAt)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Uploaded by: {attachment.user.email}
                </div>
              </div>
              
              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {canViewInline(attachment.mimeType) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      viewFile(attachment)
                    }}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: 'var(--status-success-accent)',
                      color: 'var(--status-success-foreground)',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    View
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    downloadFile(attachment)
                  }}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'var(--status-info-accent)',
                    color: 'var(--status-info-foreground)',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  Download
                </button>
                {!readOnly && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteAttachment(attachment.id, attachment.originalName)
                    }}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: 'var(--status-danger-accent)',
                      color: 'var(--status-danger-foreground)',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer',
            padding: '2rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              marginBottom: '1rem',
              color: 'white'
            }}>
              <span style={{ fontSize: '1rem', fontWeight: '500' }}>
                {lightboxImage.name}
              </span>
              <button
                onClick={() => setLightboxImage(null)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Close (ESC)
              </button>
            </div>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name}
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(90vh - 4rem)',
                objectFit: 'contain',
                borderRadius: '4px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}