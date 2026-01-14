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
import { getBuildings, getBuilding, createBuilding, updateBuilding, deleteBuilding } from '../buildings'

// Helper to set mock response
function setMockResponse(data: unknown, error?: { message: string; code?: string } | null) {
  const response = { data, error: error ?? null, count: Array.isArray(data) ? data.length : null }

  // Update the thenable behavior
  mockQueryBuilder.then = vi.fn((resolve: (value: unknown) => void) =>
    Promise.resolve(response).then(resolve))

  mockQueryBuilder.single.mockResolvedValue(response)
}

describe('Buildings Service', () => {
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

  describe('getBuildings', () => {
    it('fetches buildings for an organization', async () => {
      const mockBuildings = [
        { id: '1', name: 'Building A', address: '123 Main St', organization_id: 'org-1' },
        { id: '2', name: 'Building B', address: '456 Oak Ave', organization_id: 'org-1' },
      ]
      setMockResponse(mockBuildings)

      const result = await getBuildings({ organizationId: 'org-1' })

      expect(result.buildings).toEqual(mockBuildings)
      expect(result.count).toBe(2)
    })

    it('applies search filter when provided', async () => {
      setMockResponse([])

      await getBuildings({ organizationId: 'org-1', search: 'Main' })

      expect(mockQueryBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining('Main')
      )
    })

    it('applies pagination with default values', async () => {
      setMockResponse([])

      await getBuildings({ organizationId: 'org-1' })

      // Default: limit=50, offset=0, so range should be 0 to 49
      expect(mockQueryBuilder.range).toHaveBeenCalledWith(0, 49)
    })

    it('applies custom pagination', async () => {
      setMockResponse([])

      await getBuildings({ organizationId: 'org-1', limit: 10, offset: 20 })

      expect(mockQueryBuilder.range).toHaveBeenCalledWith(20, 29)
    })

    it('throws error when fetch fails', async () => {
      setMockResponse(null, { message: 'Database error' })

      await expect(getBuildings({ organizationId: 'org-1' })).rejects.toThrow('Failed to fetch buildings')
    })

    it('returns empty array when no data', async () => {
      setMockResponse(null)

      const result = await getBuildings({ organizationId: 'org-1' })

      expect(result.buildings).toEqual([])
      expect(result.count).toBe(0)
    })
  })

  describe('getBuilding', () => {
    it('fetches a single building by ID', async () => {
      const mockBuilding = { id: '1', name: 'Building A', address: '123 Main St' }
      setMockResponse(mockBuilding)

      const result = await getBuilding('1')

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(mockQueryBuilder.single).toHaveBeenCalled()
      expect(result).toEqual(mockBuilding)
    })

    it('returns null when building not found (PGRST116)', async () => {
      setMockResponse(null, { code: 'PGRST116', message: 'Not found' })

      const result = await getBuilding('nonexistent')

      expect(result).toBeNull()
    })

    it('throws error for other database errors', async () => {
      setMockResponse(null, { message: 'Connection failed' })

      await expect(getBuilding('1')).rejects.toThrow('Failed to fetch building')
    })
  })

  describe('createBuilding', () => {
    it('creates a new building', async () => {
      const newBuilding = { name: 'New Building', address: '789 Elm St', organization_id: 'org-1' }
      const createdBuilding = { id: '3', ...newBuilding }
      setMockResponse(createdBuilding)

      const result = await createBuilding(newBuilding)

      expect(mockQueryBuilder.insert).toHaveBeenCalled()
      expect(mockQueryBuilder.single).toHaveBeenCalled()
      expect(result).toEqual(createdBuilding)
    })

    it('throws error when creation fails', async () => {
      setMockResponse(null, { message: 'Validation error' })

      await expect(createBuilding({ name: '', address: '', organization_id: 'org-1' })).rejects.toThrow('Failed to create building')
    })
  })

  describe('updateBuilding', () => {
    it('updates an existing building', async () => {
      const updates = { name: 'Updated Building' }
      const updatedBuilding = { id: '1', name: 'Updated Building', address: '123 Main St' }
      setMockResponse(updatedBuilding)

      const result = await updateBuilding('1', updates)

      expect(mockQueryBuilder.update).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(updatedBuilding)
    })

    it('throws error when update fails', async () => {
      setMockResponse(null, { message: 'Not found' })

      await expect(updateBuilding('1', {})).rejects.toThrow('Failed to update building')
    })
  })

  describe('deleteBuilding', () => {
    it('deletes a building', async () => {
      setMockResponse(null)

      await expect(deleteBuilding('1')).resolves.not.toThrow()

      expect(mockQueryBuilder.delete).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
    })

    it('throws error when deletion fails', async () => {
      setMockResponse(null, { message: 'Foreign key constraint' })

      await expect(deleteBuilding('1')).rejects.toThrow('Failed to delete building')
    })
  })
})
