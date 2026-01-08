import { NextRequest, NextResponse } from 'next/server'
import { ObjectStorageService } from '@/server/storage/objectStorage'
import { getUserFromRequest } from '../../../../lib/auth'
import { logger } from '@/lib/logger'

// POST /api/attachments/upload - Get presigned URL for file upload
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const objectStorageService = new ObjectStorageService()
    const uploadURL = await objectStorageService.getObjectEntityUploadURL()

    return NextResponse.json({
      uploadURL,
      method: 'PUT',
    })
  } catch (error) {
    logger.error('Error generating upload URL:', error)
    return NextResponse.json({ message: 'Failed to generate upload URL' }, { status: 500 })
  }
}
