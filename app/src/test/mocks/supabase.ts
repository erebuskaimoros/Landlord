import { vi } from 'vitest'

/**
 * Mock query builder that chains like Supabase
 */
export function createMockQueryBuilder(options?: { data?: unknown; error?: Error | null; count?: number | null }) {
  const mockData = { data: options?.data ?? null, error: options?.error ?? null, count: options?.count ?? null }

  const queryBuilder: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(mockData),
    single: vi.fn().mockResolvedValue(mockData),
    // For terminal methods, return the promise directly
    then: (resolve: (value: unknown) => void) => Promise.resolve(mockData).then(resolve),
  }

  // Make the builder itself thenable (for await support)
  Object.defineProperty(queryBuilder, 'then', {
    value: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) =>
      Promise.resolve(mockData).then(resolve).catch(reject),
  })

  return queryBuilder
}

/**
 * Create a mock Supabase client
 */
export function createMockSupabase(options?: {
  data?: unknown
  error?: Error | null
  count?: number | null
  user?: { id: string; email: string } | null
}) {
  const queryBuilder = createMockQueryBuilder(options)

  return {
    from: vi.fn().mockReturnValue(queryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: options?.data, error: options?.error }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options?.user ?? { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: options?.user ? { user: options.user } : null },
        error: null,
      }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/signed-url' }, error: null }),
      }),
    },
    _queryBuilder: queryBuilder,
  }
}

/**
 * Helper to set mock response data
 */
export function setMockResponse(
  queryBuilder: ReturnType<typeof createMockQueryBuilder>,
  data: unknown,
  error?: Error | null
) {
  const response = { data, error: error ?? null, count: Array.isArray(data) ? data.length : null }

  // Update the thenable behavior
  Object.defineProperty(queryBuilder, 'then', {
    value: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) =>
      Promise.resolve(response).then(resolve).catch(reject),
  })

  // Also update single/maybeSingle
  ;(queryBuilder.single as ReturnType<typeof vi.fn>).mockResolvedValue(response)
  ;(queryBuilder.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue(response)

  return response
}
