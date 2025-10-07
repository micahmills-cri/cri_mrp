import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { getUserFromRequest } from '../../../../lib/auth';
import { ObjectStorageService, ObjectNotFoundError } from '@/server/storage/objectStorage';
import { ObjectPermission } from '@/server/storage/objectAcl';

// GET /api/attachments/[id] - Download attachment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const attachmentId = params.id;

    // Find the attachment and work order for access control
    const attachment = await prisma.workOrderAttachment.findUnique({
      where: { id: attachmentId },
      include: {
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
        },
        user: true
      }
    });

    if (!attachment) {
      return NextResponse.json({ message: 'Attachment not found' }, { status: 404 });
    }

    // Department-based access control for operators only (admin and supervisor have full access)
    if (user.role === 'OPERATOR' && user.departmentId) {
      const enabledStages = attachment.workOrder.routingVersion.stages.filter(s => s.enabled).sort((a, b) => a.sequence - b.sequence);
      const currentStage = enabledStages[attachment.workOrder.currentStageIndex];
      
      if (!currentStage || currentStage.workCenter.department.id !== user.departmentId) {
        return NextResponse.json({ message: 'Work order not in your department' }, { status: 403 });
      }
    }

    const objectStorageService = new ObjectStorageService();
    
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(attachment.filePath);
      
      // Check object-level permissions
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: user.id,
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        return NextResponse.json({ message: 'Access denied to file' }, { status: 403 });
      }

      const { stream, metadata } = await objectStorageService.getObjectStream(objectFile);
      
      // Create a response with proper headers for file download
      const response = new NextResponse(stream as any, {
        status: 200,
        headers: {
          'Content-Type': attachment.mimeType,
          'Content-Length': attachment.fileSize.toString(),
          'Content-Disposition': `attachment; filename="${attachment.originalName}"`,
          'Cache-Control': 'private, max-age=3600'
        }
      });

      return response;
    } catch (error) {
      console.error('Error downloading file:', error);
      if (error instanceof ObjectNotFoundError) {
        return NextResponse.json({ message: 'File not found in storage' }, { status: 404 });
      }
      return NextResponse.json({ message: 'Error downloading file' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in attachment download:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/attachments/[id] - Delete attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const attachmentId = params.id;

    // Find the attachment and work order for access control
    const attachment = await prisma.workOrderAttachment.findUnique({
      where: { id: attachmentId },
      include: {
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
        },
        user: true
      }
    });

    if (!attachment) {
      return NextResponse.json({ message: 'Attachment not found' }, { status: 404 });
    }

    // Department-based access control for operators only (admin and supervisor have full access)
    if (user.role === 'OPERATOR' && user.departmentId) {
      const enabledStages = attachment.workOrder.routingVersion.stages.filter(s => s.enabled).sort((a, b) => a.sequence - b.sequence);
      const currentStage = enabledStages[attachment.workOrder.currentStageIndex];
      
      if (!currentStage || currentStage.workCenter.department.id !== user.departmentId) {
        return NextResponse.json({ message: 'Work order not in your department' }, { status: 403 });
      }
    }

    // Permission check: users can delete their own attachments, supervisors can delete any in their department
    if (user.role === 'OPERATOR') {
      if (attachment.userId !== user.id) {
        return NextResponse.json({ 
          message: 'You can only delete your own attachments' 
        }, { status: 403 });
      }
    }
    // SUPERVISOR and ADMIN can delete any attachment from accessible work orders

    // Delete from database first
    await prisma.workOrderAttachment.delete({
      where: { id: attachmentId }
    });

    // Note: We don't delete from object storage to maintain data integrity
    // The file will remain in storage but be inaccessible through the application

    return NextResponse.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}