'use client'

import { useState, useEffect, useRef } from 'react'

type Note = {
  id: string
  workOrderId: string
  userId: string
  departmentId?: string
  scope: 'GENERAL' | 'DEPARTMENT'
  content: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    email: string
    role: string
  }
  department?: {
    id: string
    name: string
  }
}

type Department = {
  id: string
  name: string
}

type NotesTimelineProps = {
  workOrderId: string
  onError?: (error: string) => void
  onSuccess?: (message: string) => void
  onNotesChange?: (count: number) => void
}

export default function NotesTimeline({ workOrderId, onError, onSuccess, onNotesChange }: NotesTimelineProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddNote, setShowAddNote] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [noteScope, setNoteScope] = useState<string>('GENERAL')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('')
  const [departments, setDepartments] = useState<Department[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterScope, setFilterScope] = useState<string>('ALL')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load departments
  const loadDepartments = async () => {
    try {
      const response = await fetch('/api/departments', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setDepartments(data.departments || [])
      } else {
        console.error('Failed to load departments')
      }
    } catch (err) {
      console.error('Network error loading departments')
    }
  }

  // Load notes
  const loadNotes = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/work-orders/${workOrderId}/notes`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const notesData = await response.json()
        setNotes(notesData)
        onNotesChange?.(notesData.length)
      } else {
        const error = await response.json()
        onError?.(error.message || 'Failed to load notes')
      }
    } catch (err) {
      onError?.('Network error loading notes')
    } finally {
      setLoading(false)
    }
  }

  // Create note
  const createNote = async () => {
    if (!newNote.trim()) return
    
    setSubmitting(true)
    try {
      const requestBody: any = {
        content: newNote.trim(),
        scope: noteScope === 'GENERAL' ? 'GENERAL' : 'DEPARTMENT'
      }
      
      // If it's a department note, include the department ID
      if (noteScope !== 'GENERAL') {
        requestBody.departmentId = noteScope // noteScope now contains the department ID
      }
      
      const response = await fetch(`/api/work-orders/${workOrderId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      })
      
      if (response.ok) {
        const note = await response.json()
        setNotes(prev => {
          const newNotes = [note, ...prev]
          onNotesChange?.(newNotes.length)
          return newNotes
        })
        setNewNote('')
        setShowAddNote(false)
        setNoteScope('GENERAL')
        onSuccess?.('Note added successfully')
      } else {
        const error = await response.json()
        onError?.(error.message || 'Failed to create note')
      }
    } catch (err) {
      onError?.('Network error creating note')
    } finally {
      setSubmitting(false)
    }
  }

  // Update note
  const updateNote = async (noteId: string, content: string) => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: content.trim() })
      })
      
      if (response.ok) {
        const updatedNote = await response.json()
        setNotes(prev => prev.map(note => note.id === noteId ? updatedNote : note))
        setEditingNote(null)
        setEditContent('')
        onSuccess?.('Note updated successfully')
      } else {
        const error = await response.json()
        onError?.(error.message || 'Failed to update note')
      }
    } catch (err) {
      onError?.('Network error updating note')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete note
  const deleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return
    
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (response.ok) {
        setNotes(prev => {
          const newNotes = prev.filter(note => note.id !== noteId)
          onNotesChange?.(newNotes.length)
          return newNotes
        })
        onSuccess?.('Note deleted successfully')
      } else {
        const error = await response.json()
        onError?.(error.message || 'Failed to delete note')
      }
    } catch (err) {
      onError?.('Network error deleting note')
    }
  }

  // Start editing
  const startEdit = (note: Note) => {
    setEditingNote(note.id)
    setEditContent(note.content)
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditingNote(null)
    setEditContent('')
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffHours < 1) {
      return 'Just now'
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  // Filter notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.user.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    let matchesScope = false
    if (filterScope === 'ALL') {
      matchesScope = true
    } else if (filterScope === 'GENERAL') {
      matchesScope = note.scope === 'GENERAL'
    } else {
      // Department-specific filter
      matchesScope = note.scope === 'DEPARTMENT' && note.departmentId === filterScope
    }
    
    return matchesSearch && matchesScope
  })

  // Setup auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        loadNotes()
      }, 10000) // Refresh every 10 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRefresh, workOrderId])

  // Load departments and notes on mount
  useEffect(() => {
    loadDepartments()
    loadNotes()
  }, [workOrderId])

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
          Notes Timeline ({filteredNotes.length})
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button
            onClick={() => setShowAddNote(!showAddNote)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--status-info-accent)',
              color: 'var(--status-info-foreground)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            {showAddNote ? 'Cancel' : 'Add Note'}
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
          placeholder="Search notes..."
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
          value={filterScope}
          onChange={(e) => setFilterScope(e.target.value)}
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
          <option value="ALL">All Notes</option>
          <option value="GENERAL">General Notes</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>{dept.name} Notes</option>
          ))}
        </select>
      </div>

      {/* Add Note Form */}
      {showAddNote && (
        <div style={{
          backgroundColor: 'var(--surface-muted)',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem',
          border: '1px solid var(--border-strong)'
        }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <select
              value={noteScope}
              onChange={(e) => setNoteScope(e.target.value)}
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: 'var(--surface)',
                color: 'var(--foreground)',
                border: '1px solid var(--border-strong)',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            >
              <option value="GENERAL">General Note</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name} Note</option>
              ))}
            </select>
          </div>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Enter your note..."
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '0.5rem',
              backgroundColor: 'var(--surface)',
              color: 'var(--foreground)',
              border: '1px solid var(--border-strong)',
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            marginTop: '0.5rem',
            justifyContent: 'flex-end' 
          }}>
            <button
              onClick={() => setShowAddNote(false)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'transparent',
                color: 'var(--muted)',
                border: '1px solid var(--border-strong)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Cancel
            </button>
            <button
              onClick={createNote}
              disabled={submitting || !newNote.trim()}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: submitting ? 'var(--muted)' : 'var(--status-success-accent)',
                color: submitting ? 'var(--foreground)' : 'var(--status-success-foreground)',
                border: 'none',
                borderRadius: '4px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem'
              }}
            >
              {submitting ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
          Loading notes...
        </div>
      ) : filteredNotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
          {searchQuery || filterScope !== 'ALL' 
            ? 'No notes match your filters.' 
            : 'No notes yet. Add the first note to get started.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredNotes.map((note, index) => (
            <div key={note.id} style={{
              position: 'relative',
              paddingLeft: '2rem'
            }}>
              {/* Timeline line */}
              {index < filteredNotes.length - 1 && (
                <div style={{
                  position: 'absolute',
                  left: '0.5rem',
                  top: '2rem',
                  width: '2px',
                  height: 'calc(100% + 1rem)',
                  backgroundColor: 'var(--border-strong)'
                }} />
              )}
              
              {/* Timeline dot */}
              <div style={{
                position: 'absolute',
                left: '0',
                top: '0.75rem',
                width: '1rem',
                height: '1rem',
                borderRadius: '50%',
                backgroundColor: note.scope === 'DEPARTMENT' ? 'var(--status-warning-accent)' : 'var(--status-info-accent)',
                border: '2px solid var(--surface)',
                boxShadow: '0 0 0 2px var(--border-strong)'
              }} />
              
              {/* Note card */}
              <div style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: '4px',
                padding: '0.75rem'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      color: note.user.role === 'ADMIN' ? 'var(--status-danger-accent)' : 
                             note.user.role === 'SUPERVISOR' ? 'var(--status-warning-accent)' : 'var(--status-success-accent)'
                    }}>
                      {note.user.email}
                    </span>
                    {note.scope === 'DEPARTMENT' && note.department && (
                      <span style={{
                        fontSize: '0.75rem',
                        backgroundColor: 'var(--status-warning-surface)',
                        color: 'var(--status-warning-foreground)',
                        padding: '0.125rem 0.25rem',
                        borderRadius: '2px'
                      }}>
                        {note.department.name}
                      </span>
                    )}
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--muted)'
                    }}>
                      {formatDate(note.createdAt)}
                    </span>
                  </div>
                  
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      onClick={() => startEdit(note)}
                      style={{
                        padding: '0.125rem 0.25rem',
                        fontSize: '0.75rem',
                        backgroundColor: 'transparent',
                        color: 'var(--status-info-accent)',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      style={{
                        padding: '0.125rem 0.25rem',
                        fontSize: '0.75rem',
                        backgroundColor: 'transparent',
                        color: 'var(--status-danger-accent)',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                {/* Note content */}
                {editingNote === note.id ? (
                  <div>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '60px',
                        padding: '0.5rem',
                        backgroundColor: 'var(--surface)',
                        color: 'var(--foreground)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        fontFamily: 'inherit',
                        resize: 'vertical'
                      }}
                    />
                    <div style={{ 
                      display: 'flex', 
                      gap: '0.5rem', 
                      marginTop: '0.5rem',
                      justifyContent: 'flex-end'
                    }}>
                      <button
                        onClick={cancelEdit}
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
                        Cancel
                      </button>
                      <button
                        onClick={() => updateNote(note.id, editContent)}
                        disabled={submitting || !editContent.trim()}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: submitting ? 'var(--muted)' : 'var(--status-success-accent)',
                          color: submitting ? 'var(--foreground)' : 'var(--status-success-foreground)',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: submitting ? 'not-allowed' : 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        {submitting ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    fontSize: '0.875rem',
                    lineHeight: '1.4',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {note.content}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}