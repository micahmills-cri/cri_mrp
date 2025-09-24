import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getUserFromRequest } from '../../../../../lib/auth';

// GET /api/work-orders/[id]/notes - Get notes for a work order
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const workOrderId = params.id;
    
    // Check if work order exists and user has access
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
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
    });

    if (!workOrder) {
      return NextResponse.json({ message: 'Work order not found' }, { status: 404 });
    }

    // Department-based access control for operators only (admin and supervisor have full access)
    if (user.role === 'OPERATOR' && user.departmentId) {
      const enabledStages = workOrder.routingVersion.stages.filter(s => s.enabled).sort((a, b) => a.sequence - b.sequence);
      const currentStage = enabledStages[workOrder.currentStageIndex];
      
      if (!currentStage || currentStage.workCenter.department.id !== user.departmentId) {
        return NextResponse.json({ message: 'Work order not in your department' }, { status: 403 });
      }
    }

    // Role-based access control
    let whereClause: any = { workOrderId };
    
    if (user.role === 'OPERATOR') {
      // Operators can only see notes from their department
      const userDeptId = user.departmentId;
      if (!userDeptId) {
        return NextResponse.json({ message: 'User has no department assigned' }, { status: 403 });
      }
      
      whereClause.OR = [
        { scope: 'GENERAL' },
        { scope: 'DEPARTMENT', departmentId: userDeptId }
      ];
    } else if (user.role === 'SUPERVISOR') {
      // Supervisors can see all GENERAL notes and DEPARTMENT notes from their department only
      const userDeptId = user.departmentId;
      if (!userDeptId) {
        return NextResponse.json({ message: 'Supervisor has no department assigned' }, { status: 403 });
      }
      
      whereClause.OR = [
        { scope: 'GENERAL' },
        { scope: 'DEPARTMENT', departmentId: userDeptId }
      ];
    }
    // ADMIN can see all notes

    const notes = await prisma.workOrderNote.findMany({
      where: whereClause,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching work order notes:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/work-orders/[id]/notes - Create a new note
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const workOrderId = params.id;
    const body = await request.json();
    
    const { content, scope, departmentId } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ message: 'Note content is required' }, { status: 400 });
    }

    // Validate scope
    if (scope && !['GENERAL', 'DEPARTMENT'].includes(scope)) {
      return NextResponse.json({ message: 'Invalid scope' }, { status: 400 });
    }

    // Check if work order exists and user has access
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
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
    });

    if (!workOrder) {
      return NextResponse.json({ message: 'Work order not found' }, { status: 404 });
    }

    // Department-based access control for operators only (admin and supervisor have full access)
    if (user.role === 'OPERATOR' && user.departmentId) {
      const enabledStages = workOrder.routingVersion.stages.filter(s => s.enabled).sort((a, b) => a.sequence - b.sequence);
      const currentStage = enabledStages[workOrder.currentStageIndex];
      
      if (!currentStage || currentStage.workCenter.department.id !== user.departmentId) {
        return NextResponse.json({ message: 'Work order not in your department' }, { status: 403 });
      }
    }

    // Role-based restrictions for creating department-specific notes
    if (scope === 'DEPARTMENT') {
      if (!departmentId) {
        return NextResponse.json({ 
          message: 'Department ID is required for department-scoped notes' 
        }, { status: 400 });
      }
      
      // Operators can only create notes for their own department (admin and supervisor have full access)
      if (user.role === 'OPERATOR' && departmentId !== user.departmentId) {
        return NextResponse.json({ 
          message: 'You can only create department notes for your own department' 
        }, { status: 403 });
      }
    }

    const note = await prisma.workOrderNote.create({
      data: {
        workOrderId,
        userId: user.id,
        content: content.trim(),
        scope: scope || 'GENERAL',
        departmentId: scope === 'DEPARTMENT' ? departmentId : null
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

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Error creating work order note:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}