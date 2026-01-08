import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'
import { getUserFromRequest } from '../../../../../lib/auth'
import { logger } from '@/lib/logger'

// GET /api/product-models/[id]/trims - Get trims for a specific product model
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const modelId = params.id

    // Verify the product model exists and is active
    const model = await prisma.productModel.findUnique({
      where: {
        id: modelId,
        isActive: true,
      },
    })

    if (!model) {
      return NextResponse.json({ message: 'Product model not found' }, { status: 404 })
    }

    const trims = await prisma.productTrim.findMany({
      where: {
        productModelId: modelId,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(trims)
  } catch (error) {
    logger.error('Error fetching product trims:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
