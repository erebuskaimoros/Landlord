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
import { getUnits, getUnit, createUnit, updateUnit, deleteUnit, getUnitStatusCounts } from '../units'

// Helper to set mock response
function setMockResponse(data: unknown, error?: { message: string; code?: string } | null) {
  const response = { data, error: error ?? null, count: Array.isArray(data) ? data.length : null }

  // Update the thenable behavior
  mockQueryBuilder.then = vi.fn((resolve: (value: unknown) => void) =>
    Promise.resolve(response).then(resolve))

  mockQueryBuilder.single.mockResolvedValue(response)
}

describe('Units Service', () => {
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

  describe('getUnits', () => {
    it('fetches units for an organization', async () => {
      const mockUnits = [
        { id: '1', address: '123 Main St', organization_id: 'org-1', status: 'occupied' },
        { id: '2', address: '456 Oak Ave', organization_id: 'org-1', status: 'vacant' },
      ]
      setMockResponse(mockUnits)

      const result = await getUnits({ organizationId: 'org-1' })

      expect(result.units).toEqual(mockUnits)
      expect(result.count).toBe(2)
    })

    it('applies status filter when provided', async () => {
      setMockResponse([])

      await getUnits({ organizationId: 'org-1', status: 'vacant' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'vacant')
    })

    it('applies building filter when provided', async () => {
      setMockResponse([])

      await getUnits({ organizationId: 'org-1', buildingId: 'building-1' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('building_id', 'building-1')
    })

    it('applies search filter when provided', async () => {
      setMockResponse([])

      await getUnits({ organizationId: 'org-1', search: 'Main' })

      expect(mockQueryBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining('Main')
      )
    })

    it('applies pagination with default values', async () => {
      setMockResponse([])

      await getUnits({ organizationId: 'org-1' })

      // Default: limit=50, offset=0, so range should be 0 to 49
      expect(mockQueryBuilder.range).toHaveBeenCalledWith(0, 49)
    })

    it('applies custom pagination', async () => {
      setMockResponse([])

      await getUnits({ organizationId: 'org-1', limit: 10, offset: 20 })

      expect(mockQueryBuilder.range).toHaveBeenCalledWith(20, 29)
    })

    it('throws error when fetch fails', async () => {
      setMockResponse(null, { message: 'Database error' })

      await expect(getUnits({ organizationId: 'org-1' })).rejects.toThrow('Failed to fetch units')
    })

    it('returns empty array when no data', async () => {
      setMockResponse(null)

      const result = await getUnits({ organizationId: 'org-1' })

      expect(result.units).toEqual([])
      expect(result.count).toBe(0)
    })
  })

  describe('getUnit', () => {
    it('fetches a single unit by ID', async () => {
      const mockUnit = { id: '1', address: '123 Main St', status: 'occupied' }
      setMockResponse(mockUnit)

      const result = await getUnit('1')

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(mockQueryBuilder.single).toHaveBeenCalled()
      expect(result).toEqual(mockUnit)
    })

    it('returns null when unit not found (PGRST116)', async () => {
      setMockResponse(null, { code: 'PGRST116', message: 'Not found' })

      const result = await getUnit('nonexistent')

      expect(result).toBeNull()
    })

    it('throws error for other database errors', async () => {
      setMockResponse(null, { message: 'Connection failed' })

      await expect(getUnit('1')).rejects.toThrow('Failed to fetch unit')
    })
  })

  describe('createUnit', () => {
    it('creates a new unit', async () => {
      const newUnit = { address: '789 Elm St', organization_id: 'org-1' }
      const createdUnit = { id: '3', ...newUnit, status: 'vacant' }
      setMockResponse(createdUnit)

      const result = await createUnit(newUnit)

      expect(mockQueryBuilder.insert).toHaveBeenCalled()
      expect(mockQueryBuilder.single).toHaveBeenCalled()
      expect(result).toEqual(createdUnit)
    })

    it('throws error when creation fails', async () => {
      setMockResponse(null, { message: 'Validation error' })

      await expect(createUnit({ address: '', organization_id: 'org-1' })).rejects.toThrow('Failed to create unit')
    })
  })

  describe('updateUnit', () => {
    it('updates an existing unit', async () => {
      const updates = { status: 'sold' as const }
      const updatedUnit = { id: '1', address: '123 Main St', status: 'sold' }
      setMockResponse(updatedUnit)

      const result = await updateUnit('1', updates)

      expect(mockQueryBuilder.update).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(updatedUnit)
    })

    it('throws error when update fails', async () => {
      setMockResponse(null, { message: 'Not found' })

      await expect(updateUnit('1', {})).rejects.toThrow('Failed to update unit')
    })
  })

  describe('deleteUnit', () => {
    it('deletes a unit', async () => {
      setMockResponse(null)

      await expect(deleteUnit('1')).resolves.not.toThrow()

      expect(mockQueryBuilder.delete).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
    })

    it('throws error when deletion fails', async () => {
      setMockResponse(null, { message: 'Foreign key constraint' })

      await expect(deleteUnit('1')).rejects.toThrow('Failed to delete unit')
    })
  })

  describe('getUnitStatusCounts', () => {
    it('returns counts by status', async () => {
      const mockUnits = [
        { status: 'occupied' },
        { status: 'occupied' },
        { status: 'vacant' },
        { status: 'sold' },
      ]
      setMockResponse(mockUnits)

      const result = await getUnitStatusCounts('org-1')

      expect(result).toEqual({
        occupied: 2,
        vacant: 1,
        sold: 1,
        total: 4,
      })
    })

    it('returns zero counts when no units', async () => {
      setMockResponse([])

      const result = await getUnitStatusCounts('org-1')

      expect(result).toEqual({
        occupied: 0,
        vacant: 0,
        sold: 0,
        total: 0,
      })
    })

    it('throws error when fetch fails', async () => {
      setMockResponse(null, { message: 'Database error' })

      await expect(getUnitStatusCounts('org-1')).rejects.toThrow('Failed to fetch unit counts')
    })
  })
})
