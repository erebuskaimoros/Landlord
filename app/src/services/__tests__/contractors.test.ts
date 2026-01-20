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
    contains: vi.fn().mockReturnThis(),
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
import {
  getContractors,
  getContractor,
  createContractor,
  updateContractor,
  deleteContractor,
  getContractorsByServiceType,
} from '../contractors'

// Helper to set mock response
function setMockResponse(data: unknown, error?: { message: string; code?: string } | null) {
  const response = { data, error: error ?? null, count: Array.isArray(data) ? data.length : null }

  // Update the thenable behavior
  mockQueryBuilder.then = vi.fn((resolve: (value: unknown) => void) =>
    Promise.resolve(response).then(resolve))

  mockQueryBuilder.single.mockResolvedValue(response)
}

describe('Contractors Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset query builder chain methods
    mockQueryBuilder.select.mockReturnThis()
    mockQueryBuilder.insert.mockReturnThis()
    mockQueryBuilder.update.mockReturnThis()
    mockQueryBuilder.delete.mockReturnThis()
    mockQueryBuilder.eq.mockReturnThis()
    mockQueryBuilder.or.mockReturnThis()
    mockQueryBuilder.contains.mockReturnThis()
    mockQueryBuilder.order.mockReturnThis()
    mockQueryBuilder.range.mockReturnThis()
    mockSupabase.from.mockReturnValue(mockQueryBuilder)
  })

  describe('getContractors', () => {
    it('fetches contractors for an organization', async () => {
      const mockContractors = [
        { id: '1', name: 'ABC Plumbing', organization_id: 'org-1', service_types: ['plumbing'] },
        { id: '2', name: 'XYZ Electric', organization_id: 'org-1', service_types: ['electrical'] },
      ]
      setMockResponse(mockContractors)

      const result = await getContractors({ organizationId: 'org-1' })

      expect(result.contractors).toEqual(mockContractors)
      expect(result.count).toBe(2)
    })

    it('applies search filter when provided', async () => {
      setMockResponse([])

      await getContractors({ organizationId: 'org-1', search: 'plumb' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(mockQueryBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining('plumb')
      )
    })

    it('applies service type filter when provided', async () => {
      setMockResponse([])

      await getContractors({ organizationId: 'org-1', serviceType: 'plumbing' })

      expect(mockQueryBuilder.contains).toHaveBeenCalledWith('service_types', ['plumbing'])
    })

    it('applies pagination with default values', async () => {
      setMockResponse([])

      await getContractors({ organizationId: 'org-1' })

      // Default: limit=50, offset=0, so range should be 0 to 49
      expect(mockQueryBuilder.range).toHaveBeenCalledWith(0, 49)
    })

    it('applies custom pagination', async () => {
      setMockResponse([])

      await getContractors({ organizationId: 'org-1', limit: 10, offset: 20 })

      expect(mockQueryBuilder.range).toHaveBeenCalledWith(20, 29)
    })

    it('throws error when fetch fails', async () => {
      setMockResponse(null, { message: 'Database error' })

      await expect(getContractors({ organizationId: 'org-1' })).rejects.toThrow('Failed to fetch contractors')
    })

    it('returns empty array when no data', async () => {
      setMockResponse(null)

      const result = await getContractors({ organizationId: 'org-1' })

      expect(result.contractors).toEqual([])
      expect(result.count).toBe(0)
    })
  })

  describe('getContractor', () => {
    it('fetches a single contractor by ID', async () => {
      const mockContractor = { id: '1', name: 'ABC Plumbing', service_types: ['plumbing'] }
      setMockResponse(mockContractor)

      const result = await getContractor('1')

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(mockQueryBuilder.single).toHaveBeenCalled()
      expect(result).toEqual(mockContractor)
    })

    it('returns null when contractor not found (PGRST116)', async () => {
      setMockResponse(null, { code: 'PGRST116', message: 'Not found' })

      const result = await getContractor('nonexistent')

      expect(result).toBeNull()
    })

    it('throws error for other database errors', async () => {
      setMockResponse(null, { message: 'Connection failed' })

      await expect(getContractor('1')).rejects.toThrow('Failed to fetch contractor')
    })
  })

  describe('createContractor', () => {
    it('creates a new contractor', async () => {
      const newContractor = { name: 'New Contractor', organization_id: 'org-1' }
      const createdContractor = { id: '3', ...newContractor, service_types: [] }
      setMockResponse(createdContractor)

      const result = await createContractor(newContractor)

      expect(mockQueryBuilder.insert).toHaveBeenCalled()
      expect(mockQueryBuilder.single).toHaveBeenCalled()
      expect(result).toEqual(createdContractor)
    })

    it('throws error when creation fails', async () => {
      setMockResponse(null, { message: 'Validation error' })

      await expect(createContractor({ name: '', organization_id: 'org-1' })).rejects.toThrow('Failed to create contractor')
    })
  })

  describe('updateContractor', () => {
    it('updates an existing contractor', async () => {
      const updates = { hourly_rate: 100 }
      const updatedContractor = { id: '1', name: 'ABC Plumbing', hourly_rate: 100 }
      setMockResponse(updatedContractor)

      const result = await updateContractor('1', updates)

      expect(mockQueryBuilder.update).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(updatedContractor)
    })

    it('throws error when update fails', async () => {
      setMockResponse(null, { message: 'Not found' })

      await expect(updateContractor('1', {})).rejects.toThrow('Failed to update contractor')
    })
  })

  describe('deleteContractor', () => {
    it('deletes a contractor', async () => {
      setMockResponse(null)

      await expect(deleteContractor('1')).resolves.not.toThrow()

      expect(mockQueryBuilder.delete).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
    })

    it('throws error when deletion fails', async () => {
      setMockResponse(null, { message: 'Foreign key constraint' })

      await expect(deleteContractor('1')).rejects.toThrow('Failed to delete contractor')
    })
  })

  describe('getContractorsByServiceType', () => {
    it('fetches contractors by service type sorted by rating', async () => {
      const mockContractors = [
        { id: '1', name: 'Best Plumber', service_types: ['plumbing'], average_rating: 4.8 },
        { id: '2', name: 'Good Plumber', service_types: ['plumbing'], average_rating: 4.2 },
      ]
      setMockResponse(mockContractors)

      const result = await getContractorsByServiceType('org-1', 'plumbing')

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(mockQueryBuilder.contains).toHaveBeenCalledWith('service_types', ['plumbing'])
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('average_rating', { ascending: false })
      expect(result).toEqual(mockContractors)
    })

    it('throws error when fetch fails', async () => {
      setMockResponse(null, { message: 'Database error' })

      await expect(getContractorsByServiceType('org-1', 'plumbing')).rejects.toThrow('Failed to fetch contractors by service type')
    })

    it('returns empty array when no contractors found', async () => {
      setMockResponse(null)

      const result = await getContractorsByServiceType('org-1', 'rare_service')

      expect(result).toEqual([])
    })
  })
})
