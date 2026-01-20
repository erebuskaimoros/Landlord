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
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
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
  getAssets,
  getAssetsByUnit,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetStats,
  getAssetTypes,
} from '../assets'

// Helper to set mock response
function setMockResponse(data: unknown, error?: { message: string; code?: string } | null) {
  const response = { data, error: error ?? null, count: Array.isArray(data) ? data.length : null }

  // Update the thenable behavior
  mockQueryBuilder.then = vi.fn((resolve: (value: unknown) => void) =>
    Promise.resolve(response).then(resolve))

  mockQueryBuilder.single.mockResolvedValue(response)
}

describe('Assets Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset query builder chain methods
    mockQueryBuilder.select.mockReturnThis()
    mockQueryBuilder.insert.mockReturnThis()
    mockQueryBuilder.update.mockReturnThis()
    mockQueryBuilder.delete.mockReturnThis()
    mockQueryBuilder.eq.mockReturnThis()
    mockQueryBuilder.or.mockReturnThis()
    mockQueryBuilder.gte.mockReturnThis()
    mockQueryBuilder.lte.mockReturnThis()
    mockQueryBuilder.order.mockReturnThis()
    mockQueryBuilder.range.mockReturnThis()
    mockSupabase.from.mockReturnValue(mockQueryBuilder)
  })

  describe('getAssets', () => {
    it('fetches assets for an organization with relations', async () => {
      const mockAssets = [
        { id: '1', name: 'Refrigerator', asset_type: 'refrigerator', unit: { id: 'u1' } },
        { id: '2', name: 'HVAC', asset_type: 'hvac', unit: { id: 'u2' } },
      ]
      setMockResponse(mockAssets)

      const result = await getAssets({ organizationId: 'org-1' })

      expect(result.assets).toEqual(mockAssets)
      expect(result.count).toBe(2)
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        '*, unit:units(*)',
        { count: 'exact' }
      )
    })

    it('applies unit filter when provided', async () => {
      setMockResponse([])

      await getAssets({ organizationId: 'org-1', unitId: 'unit-1' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('unit_id', 'unit-1')
    })

    it('applies asset type filter when provided', async () => {
      setMockResponse([])

      await getAssets({ organizationId: 'org-1', assetType: 'hvac' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('asset_type', 'hvac')
    })

    it('applies condition filter when provided', async () => {
      setMockResponse([])

      await getAssets({ organizationId: 'org-1', condition: 'good' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('condition', 'good')
    })

    it('applies search filter when provided', async () => {
      setMockResponse([])

      await getAssets({ organizationId: 'org-1', search: 'Samsung' })

      expect(mockQueryBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining('Samsung')
      )
    })

    it('applies warranty expiring filter when provided', async () => {
      setMockResponse([])

      await getAssets({ organizationId: 'org-1', warrantyExpiring: true })

      expect(mockQueryBuilder.gte).toHaveBeenCalled()
      expect(mockQueryBuilder.lte).toHaveBeenCalled()
    })

    it('applies pagination with default values', async () => {
      setMockResponse([])

      await getAssets({ organizationId: 'org-1' })

      expect(mockQueryBuilder.range).toHaveBeenCalledWith(0, 49)
    })

    it('throws error when fetch fails', async () => {
      setMockResponse(null, { message: 'Database error' })

      await expect(getAssets({ organizationId: 'org-1' })).rejects.toThrow('Failed to fetch assets')
    })

    it('returns empty array when no data', async () => {
      setMockResponse(null)

      const result = await getAssets({ organizationId: 'org-1' })

      expect(result.assets).toEqual([])
      expect(result.count).toBe(0)
    })
  })

  describe('getAssetsByUnit', () => {
    it('fetches assets for a specific unit', async () => {
      const mockAssets = [
        { id: '1', name: 'Refrigerator', unit_id: 'unit-1' },
        { id: '2', name: 'Stove', unit_id: 'unit-1' },
      ]
      setMockResponse(mockAssets)

      const result = await getAssetsByUnit('unit-1')

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('unit_id', 'unit-1')
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('name', { ascending: true })
      expect(result).toEqual(mockAssets)
    })

    it('throws error when fetch fails', async () => {
      setMockResponse(null, { message: 'Database error' })

      await expect(getAssetsByUnit('unit-1')).rejects.toThrow('Failed to fetch assets for unit')
    })

    it('returns empty array when no assets', async () => {
      setMockResponse(null)

      const result = await getAssetsByUnit('unit-1')

      expect(result).toEqual([])
    })
  })

  describe('getAsset', () => {
    it('fetches a single asset by ID with unit relation', async () => {
      const mockAsset = { id: '1', name: 'Refrigerator', unit: { id: 'u1' } }
      setMockResponse(mockAsset)

      const result = await getAsset('1')

      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*, unit:units(*)')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(mockAsset)
    })

    it('returns null when asset not found (PGRST116)', async () => {
      setMockResponse(null, { code: 'PGRST116', message: 'Not found' })

      const result = await getAsset('nonexistent')

      expect(result).toBeNull()
    })

    it('throws error for other database errors', async () => {
      setMockResponse(null, { message: 'Connection failed' })

      await expect(getAsset('1')).rejects.toThrow('Failed to fetch asset')
    })
  })

  describe('createAsset', () => {
    it('creates a new asset', async () => {
      const newAsset = {
        name: 'New Refrigerator',
        asset_type: 'refrigerator',
        unit_id: 'unit-1',
        organization_id: 'org-1',
      }
      const createdAsset = { id: '3', ...newAsset, condition: 'good' }
      setMockResponse(createdAsset)

      const result = await createAsset(newAsset)

      expect(mockQueryBuilder.insert).toHaveBeenCalled()
      expect(result).toEqual(createdAsset)
    })

    it('throws error when creation fails', async () => {
      setMockResponse(null, { message: 'Validation error' })

      await expect(createAsset({
        name: '',
        asset_type: 'refrigerator',
        unit_id: 'unit-1',
        organization_id: 'org-1',
      })).rejects.toThrow('Failed to create asset')
    })
  })

  describe('updateAsset', () => {
    it('updates an existing asset', async () => {
      const updates = { condition: 'fair' as const }
      const updatedAsset = { id: '1', name: 'Refrigerator', condition: 'fair' }
      setMockResponse(updatedAsset)

      const result = await updateAsset('1', updates)

      expect(mockQueryBuilder.update).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(updatedAsset)
    })

    it('throws error when update fails', async () => {
      setMockResponse(null, { message: 'Not found' })

      await expect(updateAsset('1', {})).rejects.toThrow('Failed to update asset')
    })
  })

  describe('deleteAsset', () => {
    it('deletes an asset', async () => {
      setMockResponse(null)

      await expect(deleteAsset('1')).resolves.not.toThrow()

      expect(mockQueryBuilder.delete).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
    })

    it('throws error when deletion fails', async () => {
      setMockResponse(null, { message: 'Foreign key constraint' })

      await expect(deleteAsset('1')).rejects.toThrow('Failed to delete asset')
    })
  })

  describe('getAssetStats', () => {
    it('returns asset statistics', async () => {
      const mockAssets = [
        { condition: 'excellent' },
        { condition: 'good' },
        { condition: 'good' },
        { condition: 'fair' },
      ]

      let callIndex = 0
      mockQueryBuilder.then = vi.fn((resolve: (value: unknown) => void) => {
        if (callIndex === 0) {
          callIndex++
          return Promise.resolve({ data: mockAssets, error: null, count: 4 }).then(resolve)
        }
        callIndex++
        return Promise.resolve({ data: null, error: null, count: 1 }).then(resolve)
      })

      const result = await getAssetStats('org-1')

      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('byCondition')
      expect(result).toHaveProperty('warrantyExpiringSoon')
    })
  })

  describe('getAssetTypes', () => {
    it('returns unique asset types sorted alphabetically', async () => {
      const mockAssets = [
        { asset_type: 'refrigerator' },
        { asset_type: 'hvac' },
        { asset_type: 'refrigerator' },
        { asset_type: 'stove' },
      ]
      setMockResponse(mockAssets)

      const result = await getAssetTypes('org-1')

      expect(result).toEqual(['hvac', 'refrigerator', 'stove'])
    })

    it('throws error when fetch fails', async () => {
      setMockResponse(null, { message: 'Database error' })

      await expect(getAssetTypes('org-1')).rejects.toThrow('Failed to fetch asset types')
    })

    it('returns empty array when no assets', async () => {
      setMockResponse([])

      const result = await getAssetTypes('org-1')

      expect(result).toEqual([])
    })
  })
})
