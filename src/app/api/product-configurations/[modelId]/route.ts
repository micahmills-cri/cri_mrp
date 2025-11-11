import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { ZodError, z } from 'zod'

import { getUserFromRequest } from '@/lib/auth'
import { listProductConfigurationSections } from '@/server/product-config/productConfigurations'

const querySchema = z.object({
  modelId: z.string().min(1, 'Product model ID is required'),
  trimId: z.string().min(1).optional(),
})

export async function GET(request: NextRequest, { params }: { params: { modelId: string } }) {
  const user = getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== Role.ADMIN && user.role !== Role.SUPERVISOR) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const parseResult = querySchema.safeParse({
    modelId: params.modelId,
    trimId: url.searchParams.get('trimId') ?? undefined,
  })

  if (!parseResult.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Invalid query parameters',
        issues: parseResult.error.flatten(),
      },
      { status: 400 }
    )
  }

  try {
    const sections = await listProductConfigurationSections(parseResult.data)
    return NextResponse.json({ ok: true, data: sections })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, error: 'Invalid request', issues: error.flatten() },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
