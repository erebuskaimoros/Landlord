import { describe, it, expect } from 'vitest'
import {
  photoEventTypeSchema,
  photoEventTypeOptions,
  photoCreateSchema,
  photoUpdateSchema,
  formatPhotoEventType,
  getEventTypeColor,
  validatePhotoFile,
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_SIZE,
} from '../photo'

describe('photoEventTypeSchema', () => {
  it('accepts valid event types', () => {
    for (const type of photoEventTypeOptions) {
      expect(photoEventTypeSchema.safeParse(type).success).toBe(true)
    }
  })

  it('rejects invalid event type', () => {
    expect(photoEventTypeSchema.safeParse('invalid').success).toBe(false)
    expect(photoEventTypeSchema.safeParse('').success).toBe(false)
    expect(photoEventTypeSchema.safeParse(null).success).toBe(false)
  })
})

describe('photoCreateSchema', () => {
  const validUnitId = '550e8400-e29b-41d4-a716-446655440000'

  it('requires unit_id', () => {
    const result = photoCreateSchema.safeParse({
      file_path: 'photos/unit1/photo.jpg',
      file_name: 'photo.jpg',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('unit_id')
    }
  })

  it('requires file_path', () => {
    const result = photoCreateSchema.safeParse({
      unit_id: validUnitId,
      file_name: 'photo.jpg',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('file_path')
    }
  })

  it('requires file_name', () => {
    const result = photoCreateSchema.safeParse({
      unit_id: validUnitId,
      file_path: 'photos/unit1/photo.jpg',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('file_name')
    }
  })

  it('rejects empty file_path', () => {
    const result = photoCreateSchema.safeParse({
      unit_id: validUnitId,
      file_path: '',
      file_name: 'photo.jpg',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty file_name', () => {
    const result = photoCreateSchema.safeParse({
      unit_id: validUnitId,
      file_path: 'photos/unit1/photo.jpg',
      file_name: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid uuid for unit_id', () => {
    const result = photoCreateSchema.safeParse({
      unit_id: 'not-a-uuid',
      file_path: 'photos/unit1/photo.jpg',
      file_name: 'photo.jpg',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid minimal input', () => {
    const result = photoCreateSchema.safeParse({
      unit_id: validUnitId,
      file_path: 'photos/unit1/photo.jpg',
      file_name: 'photo.jpg',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.unit_id).toBe(validUnitId)
      expect(result.data.file_path).toBe('photos/unit1/photo.jpg')
      expect(result.data.file_name).toBe('photo.jpg')
    }
  })

  it('defaults event_type to general', () => {
    const result = photoCreateSchema.safeParse({
      unit_id: validUnitId,
      file_path: 'photos/unit1/photo.jpg',
      file_name: 'photo.jpg',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.event_type).toBe('general')
    }
  })

  it('accepts all optional fields', () => {
    const result = photoCreateSchema.safeParse({
      unit_id: validUnitId,
      file_path: 'photos/unit1/photo.jpg',
      file_name: 'kitchen-photo.jpg',
      file_size: 1024000,
      mime_type: 'image/jpeg',
      event_type: 'move_in',
      caption: 'Kitchen view from entrance',
      taken_at: '2025-01-15T10:30:00Z',
    })
    expect(result.success).toBe(true)
  })

  it('validates file_name length', () => {
    const result = photoCreateSchema.safeParse({
      unit_id: validUnitId,
      file_path: 'photos/unit1/photo.jpg',
      file_name: 'a'.repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it('validates mime_type length', () => {
    const result = photoCreateSchema.safeParse({
      unit_id: validUnitId,
      file_path: 'photos/unit1/photo.jpg',
      file_name: 'photo.jpg',
      mime_type: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('validates caption length', () => {
    const result = photoCreateSchema.safeParse({
      unit_id: validUnitId,
      file_path: 'photos/unit1/photo.jpg',
      file_name: 'photo.jpg',
      caption: 'a'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })

  it('accepts null for optional fields', () => {
    const result = photoCreateSchema.safeParse({
      unit_id: validUnitId,
      file_path: 'photos/unit1/photo.jpg',
      file_name: 'photo.jpg',
      file_size: null,
      mime_type: null,
      caption: null,
      taken_at: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('photoUpdateSchema', () => {
  it('allows empty object', () => {
    const result = photoUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('allows partial updates', () => {
    const result = photoUpdateSchema.safeParse({
      event_type: 'inspection',
      caption: 'Updated caption',
    })
    expect(result.success).toBe(true)
  })

  it('validates event_type', () => {
    expect(
      photoUpdateSchema.safeParse({ event_type: 'invalid' }).success
    ).toBe(false)
  })

  it('validates caption length', () => {
    expect(
      photoUpdateSchema.safeParse({ caption: 'a'.repeat(1001) }).success
    ).toBe(false)
  })
})

describe('formatPhotoEventType', () => {
  it('formats all event types correctly', () => {
    expect(formatPhotoEventType('move_in')).toBe('Move-in')
    expect(formatPhotoEventType('move_out')).toBe('Move-out')
    expect(formatPhotoEventType('maintenance')).toBe('Maintenance')
    expect(formatPhotoEventType('inspection')).toBe('Inspection')
    expect(formatPhotoEventType('general')).toBe('General')
  })

  it('returns input for unknown type', () => {
    expect(formatPhotoEventType('unknown')).toBe('unknown')
  })
})

describe('getEventTypeColor', () => {
  it('returns correct colors for all event types', () => {
    expect(getEventTypeColor('move_in')).toBe('bg-green-100 text-green-800')
    expect(getEventTypeColor('move_out')).toBe('bg-red-100 text-red-800')
    expect(getEventTypeColor('maintenance')).toBe('bg-yellow-100 text-yellow-800')
    expect(getEventTypeColor('inspection')).toBe('bg-blue-100 text-blue-800')
    expect(getEventTypeColor('general')).toBe('bg-gray-100 text-gray-800')
  })

  it('returns default color for unknown type', () => {
    expect(getEventTypeColor('unknown')).toBe('bg-gray-100 text-gray-800')
  })
})

describe('validatePhotoFile', () => {
  it('accepts valid JPEG file', () => {
    const file = new File([''], 'photo.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { value: 1024000 }) // 1MB
    const result = validatePhotoFile(file)
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('accepts valid PNG file', () => {
    const file = new File([''], 'photo.png', { type: 'image/png' })
    Object.defineProperty(file, 'size', { value: 2048000 }) // 2MB
    const result = validatePhotoFile(file)
    expect(result.valid).toBe(true)
  })

  it('accepts valid WebP file', () => {
    const file = new File([''], 'photo.webp', { type: 'image/webp' })
    Object.defineProperty(file, 'size', { value: 512000 }) // 512KB
    const result = validatePhotoFile(file)
    expect(result.valid).toBe(true)
  })

  it('rejects invalid file type', () => {
    const file = new File([''], 'doc.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'size', { value: 1024000 })
    const result = validatePhotoFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid file type')
  })

  it('rejects file that is too large', () => {
    const file = new File([''], 'photo.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { value: MAX_PHOTO_SIZE + 1 })
    const result = validatePhotoFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('File too large')
  })

  it('accepts file at exact max size', () => {
    const file = new File([''], 'photo.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { value: MAX_PHOTO_SIZE })
    const result = validatePhotoFile(file)
    expect(result.valid).toBe(true)
  })
})

describe('constants', () => {
  it('ALLOWED_PHOTO_TYPES contains expected types', () => {
    expect(ALLOWED_PHOTO_TYPES).toContain('image/jpeg')
    expect(ALLOWED_PHOTO_TYPES).toContain('image/png')
    expect(ALLOWED_PHOTO_TYPES).toContain('image/webp')
    expect(ALLOWED_PHOTO_TYPES).toContain('image/heic')
    expect(ALLOWED_PHOTO_TYPES).toContain('image/heif')
  })

  it('MAX_PHOTO_SIZE is 10MB', () => {
    expect(MAX_PHOTO_SIZE).toBe(10 * 1024 * 1024)
  })
})
