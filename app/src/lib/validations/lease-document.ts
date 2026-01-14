import { z } from 'zod'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]

/**
 * Schema for validating file uploads (client-side)
 */
export const leaseDocumentFileSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  size: z.number().max(MAX_FILE_SIZE, 'File size must be under 10MB'),
  type: z.string().refine(
    (type) => ALLOWED_MIME_TYPES.includes(type),
    'Invalid file type. Allowed: PDF, DOC, DOCX, PNG, JPG'
  ),
})

/**
 * Schema for lease document database record
 */
export const leaseDocumentSchema = z.object({
  lease_id: z.string().uuid('Invalid lease ID'),
  name: z.string().min(1, 'Document name is required'),
  file_path: z.string().min(1, 'File path is required'),
  file_size: z.number().positive().optional(),
  mime_type: z.string().optional(),
})

export type LeaseDocumentFileInput = z.infer<typeof leaseDocumentFileSchema>
export type LeaseDocumentInput = z.infer<typeof leaseDocumentSchema>
