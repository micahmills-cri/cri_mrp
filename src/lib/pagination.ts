export interface PaginationParams {
  cursor?: string
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
  return {
    cursor: searchParams.get('cursor') ?? undefined,
    limit: Math.min(parseInt(searchParams.get('limit') ?? '20'), 100),
  }
}

export function createPaginatedResponse<T extends { id: string }>(
  data: T[],
  limit: number
): PaginatedResponse<T> {
  const hasMore = data.length > limit
  const results = hasMore ? data.slice(0, limit) : data
  const nextCursor = hasMore ? results[results.length - 1].id : null

  return {
    data: results,
    nextCursor,
    hasMore,
  }
}
