import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to create mocks that are available to vi.mock
const { mockQueryBuilder, mockStorage, mockSupabase } = vi.hoisted(() => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
    then: vi.fn((resolve: (value: unknown) => void) =>
      Promise.resolve({ data: [], error: null, count: 0 }).then(resolve)),
  }

  const mockStorage = {
    from: vi.fn().mockReturnValue({
      remove: vi.fn().mockResolvedValue({ error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/signed-url' }, error: null }),
    }),
  }

  const mockSupabase = {
    from: vi.fn().mockReturnValue(mockQueryBuilder),
    storage: mockStorage,
  }

  return { mockQueryBuilder, mockStorage, mockSupabase }
})

// Mock the module using factory
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}))

// Import after mocking
import {
  getPhotos,
  getPhotosByUnit,
  getPhotosByUnitGrouped,
  getPhoto,
  createPhoto,
  updatePhoto,
  deletePhoto,
  getPhotoCounts,
  getPhotoUrl,
} from '../photos'

// Helper to set mock response
function setMockResponse(data: unknown, error?: { message: string; code?: string } | null) {
  const response = { data, error: error ?? null, count: Array.isArray(data) ? data.length : null }

  // Update the thenable behavior
  mockQueryBuilder.then = vi.fn((resolve: (value: unknown) => void) =>
    Promise.resolve(response).then(resolve))

  mockQueryBuilder.single.mockResolvedValue(response)
}

describe('Photos Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset query builder chain methods
    mockQueryBuilder.select.mockReturnThis()
    mockQueryBuilder.insert.mockReturnThis()
    mockQueryBuilder.update.mockReturnThis()
    mockQueryBuilder.delete.mockReturnThis()
    mockQueryBuilder.eq.mockReturnThis()
    mockQueryBuilder.order.mockReturnThis()
    mockQueryBuilder.range.mockReturnThis()
    mockSupabase.from.mockReturnValue(mockQueryBuilder)
  })

  describe('getPhotos', () => {
    it('fetches photos for an organization with relations', async () => {
      const mockPhotos = [
        { id: '1', file_name: 'photo1.jpg', event_type: 'move_in', unit: { id: 'u1' } },
        { id: '2', file_name: 'photo2.jpg', event_type: 'inspection', unit: { id: 'u2' } },
      ]
      setMockResponse(mockPhotos)

      const result = await getPhotos({ organizationId: 'org-1' })

      expect(result.photos).toEqual(mockPhotos)
      expect(result.count).toBe(2)
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        '*, unit:units(*)',
        { count: 'exact' }
      )
    })

    it('applies unit filter when provided', async () => {
      setMockResponse([])

      await getPhotos({ organizationId: 'org-1', unitId: 'unit-1' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('unit_id', 'unit-1')
    })

    it('applies event type filter when provided', async () => {
      setMockResponse([])

      await getPhotos({ organizationId: 'org-1', eventType: 'move_in' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('event_type', 'move_in')
    })

    it('applies pagination with default values', async () => {
      setMockResponse([])

      await getPhotos({ organizationId: 'org-1' })

      expect(mockQueryBuilder.range).toHaveBeenCalledWith(0, 49)
    })

    it('orders by created_at descending', async () => {
      setMockResponse([])

      await getPhotos({ organizationId: 'org-1' })

      expect(mockQueryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('throws error when fetch fails', async () => {
      setMockResponse(null, { message: 'Database error' })

      await expect(getPhotos({ organizationId: 'org-1' })).rejects.toThrow('Failed to fetch photos')
    })

    it('returns empty array when no data', async () => {
      setMockResponse(null)

      const result = await getPhotos({ organizationId: 'org-1' })

      expect(result.photos).toEqual([])
      expect(result.count).toBe(0)
    })
  })

  describe('getPhotosByUnit', () => {
    it('fetches photos for a specific unit', async () => {
      const mockPhotos = [
        { id: '1', file_name: 'photo1.jpg', unit_id: 'unit-1' },
        { id: '2', file_name: 'photo2.jpg', unit_id: 'unit-1' },
      ]
      setMockResponse(mockPhotos)

      const result = await getPhotosByUnit('unit-1')

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('unit_id', 'unit-1')
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toEqual(mockPhotos)
    })

    it('throws error when fetch fails', async () => {
      setMockResponse(null, { message: 'Database error' })

      await expect(getPhotosByUnit('unit-1')).rejects.toThrow('Failed to fetch photos for unit')
    })

    it('returns empty array when no photos', async () => {
      setMockResponse(null)

      const result = await getPhotosByUnit('unit-1')

      expect(result).toEqual([])
    })
  })

  describe('getPhotosByUnitGrouped', () => {
    it('groups photos by event type', async () => {
      const mockPhotos = [
        { id: '1', event_type: 'move_in', file_name: 'photo1.jpg' },
        { id: '2', event_type: 'move_in', file_name: 'photo2.jpg' },
        { id: '3', event_type: 'inspection', file_name: 'photo3.jpg' },
        { id: '4', event_type: 'general', file_name: 'photo4.jpg' },
      ]
      setMockResponse(mockPhotos)

      const result = await getPhotosByUnitGrouped('unit-1')

      expect(result.move_in).toHaveLength(2)
      expect(result.inspection).toHaveLength(1)
      expect(result.general).toHaveLength(1)
      expect(result.move_out).toHaveLength(0)
      expect(result.maintenance).toHaveLength(0)
    })

    it('returns empty arrays for all event types when no photos', async () => {
      setMockResponse([])

      const result = await getPhotosByUnitGrouped('unit-1')

      expect(result.move_in).toEqual([])
      expect(result.move_out).toEqual([])
      expect(result.maintenance).toEqual([])
      expect(result.inspection).toEqual([])
      expect(result.general).toEqual([])
    })
  })

  describe('getPhoto', () => {
    it('fetches a single photo by ID with unit relation', async () => {
      const mockPhoto = { id: '1', file_name: 'photo.jpg', unit: { id: 'u1' } }
      setMockResponse(mockPhoto)

      const result = await getPhoto('1')

      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*, unit:units(*)')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(mockPhoto)
    })

    it('returns null when photo not found (PGRST116)', async () => {
      setMockResponse(null, { code: 'PGRST116', message: 'Not found' })

      const result = await getPhoto('nonexistent')

      expect(result).toBeNull()
    })

    it('throws error for other database errors', async () => {
      setMockResponse(null, { message: 'Connection failed' })

      await expect(getPhoto('1')).rejects.toThrow('Failed to fetch photo')
    })
  })

  describe('createPhoto', () => {
    it('creates a new photo record', async () => {
      const newPhoto = {
        unit_id: 'unit-1',
        organization_id: 'org-1',
        file_path: 'photos/unit-1/photo.jpg',
        file_name: 'photo.jpg',
      }
      const createdPhoto = { id: '3', ...newPhoto, event_type: 'general' }
      setMockResponse(createdPhoto)

      const result = await createPhoto(newPhoto)

      expect(mockQueryBuilder.insert).toHaveBeenCalled()
      expect(result).toEqual(createdPhoto)
    })

    it('throws error when creation fails', async () => {
      setMockResponse(null, { message: 'Validation error' })

      await expect(createPhoto({
        unit_id: 'unit-1',
        organization_id: 'org-1',
        file_path: '',
        file_name: '',
      })).rejects.toThrow('Failed to create photo')
    })
  })

  describe('updatePhoto', () => {
    it('updates a photo record', async () => {
      const updates = { event_type: 'inspection' as const, caption: 'Updated caption' }
      const updatedPhoto = { id: '1', file_name: 'photo.jpg', ...updates }
      setMockResponse(updatedPhoto)

      const result = await updatePhoto('1', updates)

      expect(mockQueryBuilder.update).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(updatedPhoto)
    })

    it('throws error when update fails', async () => {
      setMockResponse(null, { message: 'Not found' })

      await expect(updatePhoto('1', {})).rejects.toThrow('Failed to update photo')
    })
  })

  describe('deletePhoto', () => {
    it('deletes photo file from storage and record from database', async () => {
      // First query returns the photo with file_path
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { file_path: 'photos/unit-1/photo.jpg' },
        error: null,
      })

      // Second query deletes the record
      setMockResponse(null)

      await expect(deletePhoto('1')).resolves.not.toThrow()

      expect(mockStorage.from).toHaveBeenCalledWith('unit-photos')
    })

    it('deletes record even if no file exists', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: null,
      })
      setMockResponse(null)

      await expect(deletePhoto('1')).resolves.not.toThrow()
    })

    it('throws error when deletion fails', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { file_path: 'photos/unit-1/photo.jpg' },
        error: null,
      })
      setMockResponse(null, { message: 'Foreign key constraint' })

      await expect(deletePhoto('1')).rejects.toThrow('Failed to delete photo')
    })
  })

  describe('getPhotoCounts', () => {
    it('returns counts by event type', async () => {
      const mockPhotos = [
        { event_type: 'move_in' },
        { event_type: 'move_in' },
        { event_type: 'inspection' },
        { event_type: 'general' },
        { event_type: 'general' },
        { event_type: 'general' },
      ]
      setMockResponse(mockPhotos)

      const result = await getPhotoCounts('unit-1')

      expect(result.move_in).toBe(2)
      expect(result.inspection).toBe(1)
      expect(result.general).toBe(3)
      expect(result.move_out).toBe(0)
      expect(result.maintenance).toBe(0)
    })

    it('returns zero counts when no photos', async () => {
      setMockResponse([])

      const result = await getPhotoCounts('unit-1')

      expect(result).toEqual({
        move_in: 0,
        move_out: 0,
        maintenance: 0,
        inspection: 0,
        general: 0,
      })
    })

    it('throws error when fetch fails', async () => {
      setMockResponse(null, { message: 'Database error' })

      await expect(getPhotoCounts('unit-1')).rejects.toThrow('Failed to fetch photo counts')
    })
  })

  describe('getPhotoUrl', () => {
    it('returns signed URL for photo', async () => {
      const result = await getPhotoUrl('photos/unit-1/photo.jpg')

      expect(mockStorage.from).toHaveBeenCalledWith('unit-photos')
      expect(result).toBe('https://example.com/signed-url')
    })

    it('returns null when creating signed URL fails', async () => {
      mockStorage.from.mockReturnValueOnce({
        createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
      })

      const result = await getPhotoUrl('invalid-path')

      expect(result).toBeNull()
    })
  })
})
