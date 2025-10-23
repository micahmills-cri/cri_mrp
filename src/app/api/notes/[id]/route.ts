import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { getUserFromRequest } from '../../../../lib/auth';

// PUT /api/notes/[id] - Update an existing note
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const noteId = params.id;
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ message: 'Note content is required' }, { status: 400 });
    }

    // Find the existing note and work order for department validation
    const existingNote = await prisma.workOrderNote.findUnique({
      where: { id: noteId },
      include: {
        user: true,
        workOrder: {
          include: {
            routingVersion: {
              include: {
                stages: {
                  include: {
                    workCenter: {
                      include: {
                        department: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!existingNote) {
      return NextResponse.json({ message: 'Note not found' }, { status: 404 });
    }

    // Department-based access control for operators only (admin and supervisor have full access)
    if (user.role === 'OPERATOR' && user.departmentId) {
      const enabledStages = existingNote.workOrder.routingVersion.stages.filter(s => s.enabled).sort((a, b) => a.sequence - b.sequence);
      const currentStage = enabledStages[existingNote.workOrder.currentStageIndex];
      
      if (!currentStage || currentStage.workCenter.department.id !== user.departmentId) {
        return NextResponse.json({ message: 'Work order not in your department' }, { status: 403 });
      }
    }

    // Permission check: operators can only edit their own notes, admin and supervisor have broader permissions
    if (user.role === 'OPERATOR') {
      // First check: Can only edit own notes
      if (existingNote.userId !== user.userId) {
        return NextResponse.json({ 
          message: 'You can only edit your own notes' 
        }, { status: 403 });
      }
      
      // Second check: For department-scoped notes, must be from same department
      if (existingNote.scope === 'DEPARTMENT' && existingNote.departmentId !== user.departmentId) {
        return NextResponse.json({ 
          message: 'You can only edit department notes from your own department' 
        }, { status: 403 });
      }
    }

    const updatedNote = await prisma.workOrderNote.update({
      where: { id: noteId },
      data: {
        content: content.trim()
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/[id] - Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const noteId = params.id;

    // Find the existing note and work order for department validation
    const existingNote = await prisma.workOrderNote.findUnique({
      where: { id: noteId },
      include: {
        user: true,
        workOrder: {
          include: {
            routingVersion: {
              include: {
                stages: {
                  include: {
                    workCenter: {
                      include: {
                        department: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!existingNote) {
      return NextResponse.json({ message: 'Note not found' }, { status: 404 });
    }

    // Department-based access control for operators only (admin and supervisor have full access)
    if (user.role === 'OPERATOR' && user.departmentId) {
      const enabledStages = existingNote.workOrder.routingVersion.stages.filter(s => s.enabled).sort((a, b) => a.sequence - b.sequence);
      const currentStage = enabledStages[existingNote.workOrder.currentStageIndex];
      
      if (!currentStage || currentStage.workCenter.department.id !== user.departmentId) {
        return NextResponse.json({ message: 'Work order not in your department' }, { status: 403 });
      }
    }

    // Permission check: users can only delete their own notes, unless they're admin or supervisor
    // For department-scoped notes, also check department membership
    if (user.role === 'OPERATOR') {
      // Operators can only delete their own notes
      if (existingNote.userId !== user.userId) {
        return NextResponse.json({ 
          message: 'You can only delete your own notes' 
        }, { status: 403 });
      }
      
      // Additional check for department-scoped notes
      if (existingNote.scope === 'DEPARTMENT' && existingNote.departmentId !== user.departmentId) {
        return NextResponse.json({ 
          message: 'You can only delete department notes from your own department' 
        }, { status: 403 });
      }
    } else if (user.role === 'SUPERVISOR') {
      // Supervisors can delete their own notes or any notes from their department
      const isOwnNote = existingNote.userId === user.userId;
      const isDeptNote = existingNote.scope === 'DEPARTMENT' && existingNote.departmentId === user.departmentId;
      const isGeneralNote = existingNote.scope === 'GENERAL';
      
      if (!isOwnNote && !isDeptNote && !isGeneralNote) {
        return NextResponse.json({ 
          message: 'You can only delete your own notes or notes from your department' 
        }, { status: 403 });
      }
      
      // Even own notes must be from same department if they're department-scoped
      if (existingNote.scope === 'DEPARTMENT' && existingNote.departmentId !== user.departmentId) {
        return NextResponse.json({ 
          message: 'You can only delete department notes from your own department' 
        }, { status: 403 });
      }
    }
    // ADMIN can delete any note

    await prisma.workOrderNote.delete({
      where: { id: noteId }
    });

    return NextResponse.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}