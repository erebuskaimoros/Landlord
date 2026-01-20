import { z } from 'zod'

// Photo event type options
export const photoEventTypeOptions = [
  'move_in',
  'move_out',
  'maintenance',
  'inspection',
  'general',
] as const

export const photoEventTypeSchema = z.enum(photoEventTypeOptions)

// Schema for creating a photo record
export const photoCreateSchema = z.object({
  unit_id: z.string().uuid('Invalid unit'),
  file_path: z.string().min(1, 'File path is required'),
  file_name: z.string().min(1, 'File name is required').max(255),
  file_size: z.number().optional().nullable(),
  mime_type: z.string().max(100).optional().nullable(),
  event_type: photoEventTypeSchema.default('general'),
  caption: z.string().max(1000).optional().nullable(),
  taken_at: z.string().optional().nullable(),
})

// Schema for updating a photo record
export const photoUpdateSchema = z.object({
  event_type: photoEventTypeSchema.optional(),
  caption: z.string().max(1000).optional().nullable(),
  taken_at: z.string().optional().nullable(),
})

// Types derived from schemas
export type PhotoCreateInput = z.infer<typeof photoCreateSchema>
export type PhotoUpdateInput = z.infer<typeof photoUpdateSchema>
export type PhotoEventType = z.infer<typeof photoEventTypeSchema>

// Helper to format event type for display
export function formatPhotoEventType(type: string): string {
  const labels: Record<string, string> = {
    move_in: 'Move-in',
    move_out: 'Move-out',
    maintenance: 'Maintenance',
    inspection: 'Inspection',
    general: 'General',
  }
  return labels[type] || type
}

// Get event type badge color
export function getEventTypeColor(eventType: string): string {
  switch (eventType) {
    case 'move_in':
      return 'bg-green-100 text-green-800'
    case 'move_out':
      return 'bg-red-100 text-red-800'
    case 'maintenance':
      return 'bg-yellow-100 text-yellow-800'
    case 'inspection':
      return 'bg-blue-100 text-blue-800'
    case 'general':
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Allowed file types
export const ALLOWED_PHOTO_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]

// Max file size (10MB)
export const MAX_PHOTO_SIZE = 10 * 1024 * 1024

export function validatePhotoFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.',
    }
  }

  if (file.size > MAX_PHOTO_SIZE) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB.',
    }
  }

  return { valid: true }
}
