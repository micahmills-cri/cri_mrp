import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getUserFromRequest } from '../../../../../lib/auth';
import { ObjectStorageService } from '../../../../../lib/objectStorage';
import { ObjectPermission } from '../../../../../lib/objectAcl';

// GET /api/work-orders/[id]/attachments - Get attachments for a work order
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

    const attachments = await prisma.workOrderAttachment.findMany({
      where: { workOrderId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(attachments);
  } catch (error) {
    console.error('Error fetching work order attachments:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/work-orders/[id]/attachments - Create attachment record after file upload
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
    
    const { fileUrl, originalName, fileSize, mimeType } = body;

    if (!fileUrl || !originalName || !fileSize || !mimeType) {
      return NextResponse.json({ 
        message: 'Missing required fields: fileUrl, originalName, fileSize, mimeType' 
      }, { status: 400 });
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

    const objectStorageService = new ObjectStorageService();
    
    // Normalize the file URL and set ACL policy
    const filePath = await objectStorageService.trySetObjectEntityAclPolicy(
      fileUrl,
      {
        owner: user.id,
        visibility: 'private',
        aclRules: [
          {
            group: {
              type: 'DEPARTMENT' as any,
              id: user.departmentId || 'all'
            },
            permission: ObjectPermission.READ
          }
        ]
      }
    );

    // Extract filename from file path
    const filename = filePath.split('/').pop() || originalName;

    const attachment = await prisma.workOrderAttachment.create({
      data: {
        workOrderId,
        userId: user.id,
        filename,
        originalName,
        fileSize: parseInt(fileSize),
        mimeType,
        filePath
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Error creating work order attachment:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}