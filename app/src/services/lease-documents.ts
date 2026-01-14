import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'

export type LeaseDocument = Tables<'lease_documents'>

export interface LeaseDocumentWithUrl extends LeaseDocument {
  url?: string
}

const BUCKET_NAME = 'lease-documents'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]

/**
 * Get all documents for a lease
 */
export async function getLeaseDocuments(leaseId: string): Promise<LeaseDocumentWithUrl[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lease_documents')
    .select('*')
    .eq('lease_id', leaseId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch lease documents: ${error.message}`)
  }

  const documents = (data || []) as LeaseDocument[]

  // Generate signed URLs for each document
  const documentsWithUrls: LeaseDocumentWithUrl[] = []
  for (const doc of documents) {
    const { data: urlData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(doc.file_path, 3600) // 1 hour expiry

    documentsWithUrls.push({
      ...doc,
      url: urlData?.signedUrl,
    })
  }

  return documentsWithUrls
}

/**
 * Upload a document for a lease
 */
export async function uploadLeaseDocument(
  leaseId: string,
  file: File
): Promise<LeaseDocument> {
  const supabase = await createClient()

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 10MB limit')
  }

  // Validate mime type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Allowed types: PDF, DOC, DOCX, PNG, JPG')
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Generate unique file path: leaseId/timestamp-filename
  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const filePath = `${leaseId}/${timestamp}-${sanitizedName}`

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file)

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`)
  }

  // Create database record
  const { data, error } = await supabase
    .from('lease_documents')
    .insert({
      lease_id: leaseId,
      name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
    } as never)
    .select()
    .single()

  if (error) {
    // Try to clean up uploaded file if database insert fails
    await supabase.storage.from(BUCKET_NAME).remove([filePath])
    throw new Error(`Failed to save document record: ${error.message}`)
  }

  return data as LeaseDocument
}

/**
 * Delete a document
 */
export async function deleteLeaseDocument(documentId: string): Promise<void> {
  const supabase = await createClient()

  // Get document to find file path
  const { data: doc, error: fetchError } = await supabase
    .from('lease_documents')
    .select('file_path')
    .eq('id', documentId)
    .single()

  if (fetchError || !doc) {
    throw new Error(`Document not found: ${fetchError?.message || 'Unknown error'}`)
  }

  const docData = doc as { file_path: string }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([docData.file_path])

  if (storageError) {
    throw new Error(`Failed to delete file: ${storageError.message}`)
  }

  // Delete database record
  const { error: dbError } = await supabase
    .from('lease_documents')
    .delete()
    .eq('id', documentId)

  if (dbError) {
    throw new Error(`Failed to delete document record: ${dbError.message}`)
  }
}

/**
 * Get a signed download URL for a document
 */
export async function getDocumentDownloadUrl(filePath: string): Promise<string> {
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 3600) // 1 hour expiry

  if (error || !data?.signedUrl) {
    throw new Error('Failed to generate download URL')
  }

  return data.signedUrl
}

/**
 * Validate file for upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size exceeds 10MB limit' }
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Allowed: PDF, DOC, DOCX, PNG, JPG' }
  }

  return { valid: true }
}
