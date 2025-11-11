import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { ZodError } from 'zod'

import { getUserFromRequest } from '@/lib/auth'
import { upsertProductConfigurationOption } from '@/server/product-config/productConfigurations'

async function handleRequest(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== Role.ADMIN) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const option = await upsertProductConfigurationOption(body)
    return NextResponse.json({ ok: true, data: option })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, error: 'Invalid request body', issues: error.flatten() },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return handleRequest(request)
}

export async function PUT(request: NextRequest) {
  return handleRequest(request)
}
