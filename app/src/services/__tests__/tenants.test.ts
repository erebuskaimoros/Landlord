import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to create mocks that are available to vi.mock
const { mockQueryBuilder, mockSupabase } = vi.hoisted(() => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
    then: vi.fn((resolve: (value: unknown) => void) =>
      Promise.resolve({ data: [], error: null, count: 0 }).then(resolve)),
  }

  const mockSupabase = {
    from: vi.fn().mockReturnValue(mockQueryBuilder),
  }

  return { mockQueryBuilder, mockSupabase }
})

// Mock the module using factory
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}))

// Import after mocking
import { getTenants, getTenant, createTenant, updateTenant, deleteTenant } from '../tenants'

// Helper to set mock response
function setMockResponse(data: unknown, error?: { message: string; code?: string } | null) {
  const response = { data, error: error ?? null, count: Array.isArray(data) ? data.length : null }

  // Update the thenable behavior
  mockQueryBuilder.then = vi.fn((resolve: (value: unknown) => void) =>
    Promise.resolve(response).then(resolve))

  mockQueryBuilder.single.mockResolvedValue(response)
}

describe('Tenants Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset query builder chain methods
    mockQueryBuilder.select.mockReturnThis()
    mockQueryBuilder.insert.mockReturnThis()
    mockQueryBuilder.update.mockReturnThis()
    mockQueryBuilder.delete.mockReturnThis()
    mockQueryBuilder.eq.mockReturnThis()
    mockQueryBuilder.or.mockReturnThis()
    mockQueryBuilder.order.mockReturnThis()
    mockQueryBuilder.range.mockReturnThis()
    mockSupabase.from.mockReturnValue(mockQueryBuilder)
  })

  describe('getTenants', () => {
    it('fetches tenants for an organization', async () => {
      const mockTenants = [
        { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', organization_id: 'org-1' },
        { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', organization_id: 'org-1' },
      ]
      setMockResponse(mockTenants)

      const result = await getTenants({ organizationId: 'org-1' })

      expect(result.tenants).toEqual(mockTenants)
      expect(result.count).toBe(2)
    })

    it('applies search filter when provided', async () => {
      setMockResponse([])

      await getTenants({ organizationId: 'org-1', search: 'John' })

      expect(mockQueryBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining('John')
      )
    })

    it('applies pagination with default values', async () => {
      setMockResponse([])

      await getTenants({ organizationId: 'org-1' })

      // Default: limit=50, offset=0, so range should be 0 to 49
      expect(mockQueryBuilder.range).toHaveBeenCalledWith(0, 49)
    })

    it('applies custom pagination', async () => {
      setMockResponse([])

      await getTenants({ organizationId: 'org-1', limit: 10, offset: 20 })

      expect(mockQueryBuilder.range).toHaveBeenCalledWith(20, 29)
    })

    it('throws error when fetch fails', async () => {
      setMockResponse(null, { message: 'Database error' })

      await expect(getTenants({ organizationId: 'org-1' })).rejects.toThrow('Failed to fetch tenants')
    })

    it('returns empty array when no data', async () => {
      setMockResponse(null)

      const result = await getTenants({ organizationId: 'org-1' })

      expect(result.tenants).toEqual([])
      expect(result.count).toBe(0)
    })
  })

  describe('getTenant', () => {
    it('fetches a single tenant by ID', async () => {
      const mockTenant = { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' }
      setMockResponse(mockTenant)

      const result = await getTenant('1')

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(mockQueryBuilder.single).toHaveBeenCalled()
      expect(result).toEqual(mockTenant)
    })

    it('returns null when tenant not found (PGRST116)', async () => {
      setMockResponse(null, { code: 'PGRST116', message: 'Not found' })

      const result = await getTenant('nonexistent')

      expect(result).toBeNull()
    })

    it('throws error for other database errors', async () => {
      setMockResponse(null, { message: 'Connection failed' })

      await expect(getTenant('1')).rejects.toThrow('Failed to fetch tenant')
    })
  })

  describe('createTenant', () => {
    it('creates a new tenant', async () => {
      const newTenant = { first_name: 'Bob', last_name: 'Wilson', email: 'bob@example.com', organization_id: 'org-1' }
      const createdTenant = { id: '3', ...newTenant }
      setMockResponse(createdTenant)

      const result = await createTenant(newTenant)

      expect(mockQueryBuilder.insert).toHaveBeenCalled()
      expect(mockQueryBuilder.single).toHaveBeenCalled()
      expect(result).toEqual(createdTenant)
    })

    it('throws error when creation fails', async () => {
      setMockResponse(null, { message: 'Validation error' })

      await expect(createTenant({ first_name: '', last_name: '', organization_id: 'org-1' })).rejects.toThrow('Failed to create tenant')
    })
  })

  describe('updateTenant', () => {
    it('updates an existing tenant', async () => {
      const updates = { email: 'newemail@example.com' }
      const updatedTenant = { id: '1', first_name: 'John', last_name: 'Doe', email: 'newemail@example.com' }
      setMockResponse(updatedTenant)

      const result = await updateTenant('1', updates)

      expect(mockQueryBuilder.update).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(updatedTenant)
    })

    it('throws error when update fails', async () => {
      setMockResponse(null, { message: 'Not found' })

      await expect(updateTenant('1', {})).rejects.toThrow('Failed to update tenant')
    })
  })

  describe('deleteTenant', () => {
    it('deletes a tenant', async () => {
      setMockResponse(null)

      await expect(deleteTenant('1')).resolves.not.toThrow()

      expect(mockQueryBuilder.delete).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
    })

    it('throws error when deletion fails', async () => {
      setMockResponse(null, { message: 'Foreign key constraint' })

      await expect(deleteTenant('1')).rejects.toThrow('Failed to delete tenant')
    })
  })
})
