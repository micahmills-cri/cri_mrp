import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { getUserFromRequest } from '../../../../lib/auth';

// POST /api/sku/generate - Generate SKU in format YEAR-MODEL-TRIM
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productModelId, productTrimId, year } = body;

    if (!productModelId || !productTrimId) {
      return NextResponse.json({ 
        message: 'productModelId and productTrimId are required' 
      }, { status: 400 });
    }

    // Fetch the model and trim names
    const [model, trim] = await Promise.all([
      prisma.productModel.findUnique({
        where: { id: productModelId, isActive: true },
        select: { name: true }
      }),
      prisma.productTrim.findUnique({
        where: { id: productTrimId, isActive: true },
        select: { name: true }
      })
    ]);

    if (!model) {
      return NextResponse.json({ message: 'Product model not found' }, { status: 404 });
    }

    if (!trim) {
      return NextResponse.json({ message: 'Product trim not found' }, { status: 404 });
    }

    // Verify the trim belongs to the model
    const trimBelongsToModel = await prisma.productTrim.findFirst({
      where: {
        id: productTrimId,
        productModelId: productModelId,
        isActive: true
      }
    });

    if (!trimBelongsToModel) {
      return NextResponse.json({ 
        message: 'Selected trim does not belong to the selected model' 
      }, { status: 400 });
    }

    // Use provided year or current year
    const skuYear = year || new Date().getFullYear();
    
    // Generate SKU: YEAR-MODEL-TRIM
    const sku = `${skuYear}-${model.name}-${trim.name}`;

    return NextResponse.json({ 
      sku,
      year: skuYear,
      model: model.name,
      trim: trim.name
    });
  } catch (error) {
    console.error('Error generating SKU:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}