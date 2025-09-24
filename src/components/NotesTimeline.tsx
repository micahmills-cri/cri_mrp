'use client'

import { useState, useEffect } from 'react'

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

type NotesTimelineProps = {
  workOrderId: string
  onError?: (error: string) => void
  onSuccess?: (message: string) => void
}

export default function NotesTimeline({ workOrderId, onError, onSuccess }: NotesTimelineProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddNote, setShowAddNote] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [noteScope, setNoteScope] = useState<'GENERAL' | 'DEPARTMENT'>('GENERAL')
  const [submitting, setSubmitting] = useState(false)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

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
      const response = await fetch(`/api/work-orders/${workOrderId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: newNote.trim(),
          scope: noteScope
        })
      })
      
      if (response.ok) {
        const note = await response.json()
        setNotes(prev => [note, ...prev])
        setNewNote('')
        setShowAddNote(false)
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
        setNotes(prev => prev.filter(note => note.id !== noteId))
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

  // Load notes on mount
  useEffect(() => {
    loadNotes()
  }, [workOrderId])

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1rem' 
      }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
          Notes Timeline
        </h3>
        <button
          onClick={() => setShowAddNote(!showAddNote)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          {showAddNote ? 'Cancel' : 'Add Note'}
        </button>
      </div>

      {/* Add Note Form */}
      {showAddNote && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <select
              value={noteScope}
              onChange={(e) => setNoteScope(e.target.value as 'GENERAL' | 'DEPARTMENT')}
              style={{
                padding: '0.25rem 0.5rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            >
              <option value="GENERAL">General Note</option>
              <option value="DEPARTMENT">Department Note</option>
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
              border: '1px solid #ced4da',
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
                color: '#6c757d',
                border: '1px solid #ced4da',
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
                backgroundColor: submitting ? '#6c757d' : '#28a745',
                color: 'white',
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
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
          Loading notes...
        </div>
      ) : notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
          No notes yet. Add the first note to get started.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notes.map((note, index) => (
            <div key={note.id} style={{
              position: 'relative',
              paddingLeft: '2rem'
            }}>
              {/* Timeline line */}
              {index < notes.length - 1 && (
                <div style={{
                  position: 'absolute',
                  left: '0.5rem',
                  top: '2rem',
                  width: '2px',
                  height: 'calc(100% + 1rem)',
                  backgroundColor: '#dee2e6'
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
                backgroundColor: note.scope === 'DEPARTMENT' ? '#ffc107' : '#007bff',
                border: '2px solid white',
                boxShadow: '0 0 0 2px #dee2e6'
              }} />
              
              {/* Note card */}
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #dee2e6',
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
                      color: note.user.role === 'ADMIN' ? '#dc3545' : 
                             note.user.role === 'SUPERVISOR' ? '#fd7e14' : '#28a745'
                    }}>
                      {note.user.email}
                    </span>
                    {note.scope === 'DEPARTMENT' && note.department && (
                      <span style={{
                        fontSize: '0.75rem',
                        backgroundColor: '#fff3cd',
                        color: '#856404',
                        padding: '0.125rem 0.25rem',
                        borderRadius: '2px'
                      }}>
                        {note.department.name}
                      </span>
                    )}
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#6c757d'
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
                        color: '#007bff',
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
                        color: '#dc3545',
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
                        border: '1px solid #ced4da',
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
                          color: '#6c757d',
                          border: '1px solid #ced4da',
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
                          backgroundColor: submitting ? '#6c757d' : '#28a745',
                          color: 'white',
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