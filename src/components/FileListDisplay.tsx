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
}

export default function FileListDisplay({ 
  workOrderId, 
  onError, 
  onSuccess,
  refreshTrigger 
}: FileListDisplayProps) {
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [loading, setLoading] = useState(false)
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

  // Download file
  const downloadFile = async (attachment: FileAttachment) => {
    try {
      const response = await fetch(`/api/attachments/${attachment.id}/download`, {
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
        <button
          onClick={loadAttachments}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'transparent',
            color: '#007bff',
            border: '1px solid #007bff',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem'
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
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
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '0.875rem'
          }}
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: '0.5rem',
            border: '1px solid #ced4da',
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

      {/* Bulk Actions */}
      {filteredAttachments.length > 0 && (
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
              color: '#6c757d',
              border: '1px solid #ced4da',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            {selectedFiles.size === filteredAttachments.length ? 'Deselect All' : 'Select All'}
          </button>
          {selectedFiles.size > 0 && (
            <>
              <span style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                {selectedFiles.size} selected
              </span>
              <button
                onClick={bulkDelete}
                style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
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
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
          Loading attachments...
        </div>
      ) : filteredAttachments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
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
              backgroundColor: 'white',
              border: selectedFiles.has(attachment.id) ? '2px solid #007bff' : '1px solid #dee2e6',
              borderRadius: '4px',
              padding: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}>
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selectedFiles.has(attachment.id)}
                onChange={() => toggleFileSelection(attachment.id)}
                style={{ cursor: 'pointer' }}
              />
              
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
                <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>
                  {attachment.originalName}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                  {formatFileSize(attachment.fileSize)} • {formatDate(attachment.createdAt)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                  Uploaded by: {attachment.user.email}
                </div>
              </div>
              
              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    downloadFile(attachment)
                  }}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  Download
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteAttachment(attachment.id, attachment.originalName)
                  }}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}