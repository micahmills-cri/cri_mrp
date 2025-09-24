import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { getUserFromRequest } from '../../../lib/auth';

// GET /api/product-models - Get all active product models with their trims
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const models = await prisma.productModel.findMany({
      where: {
        isActive: true
      },
      include: {
        trims: {
          where: {
            isActive: true
          },
          orderBy: {
            name: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(models);
  } catch (error) {
    console.error('Error fetching product models:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}