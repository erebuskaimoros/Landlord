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
import { getLeases, getLease, createLease, updateLease, deleteLease, getLeaseStatusCounts } from '../leases'

// Helper to set mock response
function setMockResponse(data: unknown, error?: { message: string; code?: string } | null) {
  const response = { data, error: error ?? null, count: Array.isArray(data) ? data.length : null }

  // Update the thenable behavior
  mockQueryBuilder.then = vi.fn((resolve: (value: unknown) => void) =>
    Promise.resolve(response).then(resolve))

  mockQueryBuilder.single.mockResolvedValue(response)
}

describe('Leases Service', () => {
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

  describe('getLeases', () => {
    it('fetches leases for an organization', async () => {
      const mockLeases = [
        { id: '1', rent_amount: 1500, status: 'active', organization_id: 'org-1' },
        { id: '2', rent_amount: 2000, status: 'draft', organization_id: 'org-1' },
      ]
      setMockResponse(mockLeases)

      const result = await getLeases({ organizationId: 'org-1' })

      expect(result.leases).toEqual(mockLeases)
      expect(result.count).toBe(2)
    })

    it('applies status filter when provided', async () => {
      setMockResponse([])

      await getLeases({ organizationId: 'org-1', status: 'active' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'active')
    })

    it('applies unit filter when provided', async () => {
      setMockResponse([])

      await getLeases({ organizationId: 'org-1', unitId: 'unit-1' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('unit_id', 'unit-1')
    })

    it('applies tenant filter when provided', async () => {
      setMockResponse([])

      await getLeases({ organizationId: 'org-1', tenantId: 'tenant-1' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1')
    })

    it('applies pagination with default values', async () => {
      setMockResponse([])

      await getLeases({ organizationId: 'org-1' })

      // Default: limit=50, offset=0, so range should be 0 to 49
      expect(mockQueryBuilder.range).toHaveBeenCalledWith(0, 49)
    })

    it('applies custom pagination', async () => {
      setMockResponse([])

      await getLeases({ organizationId: 'org-1', limit: 10, offset: 20 })

      expect(mockQueryBuilder.range).toHaveBeenCalledWith(20, 29)
    })

    it('throws error when fetch fails', async () => {
      setMockResponse(null, { message: 'Database error' })

      await expect(getLeases({ organizationId: 'org-1' })).rejects.toThrow('Failed to fetch leases')
    })

    it('returns empty array when no data', async () => {
      setMockResponse(null)

      const result = await getLeases({ organizationId: 'org-1' })

      expect(result.leases).toEqual([])
      expect(result.count).toBe(0)
    })
  })

  describe('getLease', () => {
    it('fetches a single lease by ID with relations', async () => {
      const mockLease = { id: '1', rent_amount: 1500, status: 'active', tenant: { first_name: 'John' }, unit: { address: '123 Main' } }
      setMockResponse(mockLease)

      const result = await getLease('1')

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(mockQueryBuilder.single).toHaveBeenCalled()
      expect(result).toEqual(mockLease)
    })

    it('returns null when lease not found (PGRST116)', async () => {
      setMockResponse(null, { code: 'PGRST116', message: 'Not found' })

      const result = await getLease('nonexistent')

      expect(result).toBeNull()
    })

    it('throws error for other database errors', async () => {
      setMockResponse(null, { message: 'Connection failed' })

      await expect(getLease('1')).rejects.toThrow('Failed to fetch lease')
    })
  })

  describe('createLease', () => {
    it('creates a new lease', async () => {
      const newLease = {
        rent_amount: 1500,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        unit_id: 'unit-1',
        tenant_id: 'tenant-1',
        organization_id: 'org-1'
      }
      const createdLease = { id: '3', status: 'draft', ...newLease }
      setMockResponse(createdLease)

      const result = await createLease(newLease)

      expect(mockQueryBuilder.insert).toHaveBeenCalled()
      expect(mockQueryBuilder.single).toHaveBeenCalled()
      expect(result).toEqual(createdLease)
    })

    it('throws error when creation fails', async () => {
      setMockResponse(null, { message: 'Validation error' })

      await expect(createLease({ organization_id: 'org-1' } as never)).rejects.toThrow('Failed to create lease')
    })
  })

  describe('updateLease', () => {
    it('updates an existing lease', async () => {
      const updates = { status: 'active' as const }
      const updatedLease = { id: '1', rent_amount: 1500, status: 'active' }
      setMockResponse(updatedLease)

      const result = await updateLease('1', updates)

      expect(mockQueryBuilder.update).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(updatedLease)
    })

    it('throws error when update fails', async () => {
      setMockResponse(null, { message: 'Not found' })

      await expect(updateLease('1', {})).rejects.toThrow('Failed to update lease')
    })
  })

  describe('deleteLease', () => {
    it('deletes a lease', async () => {
      setMockResponse(null)

      await expect(deleteLease('1')).resolves.not.toThrow()

      expect(mockQueryBuilder.delete).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
    })

    it('throws error when deletion fails', async () => {
      setMockResponse(null, { message: 'Foreign key constraint' })

      await expect(deleteLease('1')).rejects.toThrow('Failed to delete lease')
    })
  })

  describe('getLeaseStatusCounts', () => {
    it('returns counts by status', async () => {
      const mockLeases = [
        { status: 'active' },
        { status: 'active' },
        { status: 'draft' },
        { status: 'expired' },
      ]
      setMockResponse(mockLeases)

      const result = await getLeaseStatusCounts('org-1')

      expect(result).toEqual({
        draft: 1,
        active: 2,
        expired: 1,
        terminated: 0,
        total: 4,
      })
    })

    it('returns zero counts when no leases', async () => {
      setMockResponse([])

      const result = await getLeaseStatusCounts('org-1')

      expect(result).toEqual({
        draft: 0,
        active: 0,
        expired: 0,
        terminated: 0,
        total: 0,
      })
    })

    it('throws error when fetch fails', async () => {
      setMockResponse(null, { message: 'Database error' })

      await expect(getLeaseStatusCounts('org-1')).rejects.toThrow('Failed to fetch lease counts')
    })
  })
})
