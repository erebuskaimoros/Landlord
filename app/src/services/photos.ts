import { createClient } from '@/lib/supabase/server'
import type { Tables, InsertTables, UpdateTables } from '@/types/database'

export type Photo = Tables<'photos'>
export type PhotoInsert = InsertTables<'photos'>
export type PhotoUpdate = UpdateTables<'photos'>

export type PhotoWithUnit = Photo & {
  unit: Tables<'units'> | null
}

export interface PhotosListParams {
  organizationId: string
  unitId?: string
  eventType?: Photo['event_type']
  limit?: number
  offset?: number
}

export interface PhotosListResult {
  photos: PhotoWithUnit[]
  count: number
}

/**
 * Get all photos for an organization with optional filtering
 */
export async function getPhotos(params: PhotosListParams): Promise<PhotosListResult> {
  const supabase = await createClient()
  const {
    organizationId,
    unitId,
    eventType,
    limit = 50,
    offset = 0
  } = params

  let query = supabase
    .from('photos')
    .select('*, unit:units(*)', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (unitId) {
    query = query.eq('unit_id', unitId)
  }

  if (eventType) {
    query = query.eq('event_type', eventType)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch photos: ${error.message}`)
  }

  return {
    photos: (data || []) as PhotoWithUnit[],
    count: count || 0,
  }
}

/**
 * Get photos for a specific unit
 */
export async function getPhotosByUnit(unitId: string): Promise<Photo[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('unit_id', unitId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch photos for unit: ${error.message}`)
  }

  return (data || []) as Photo[]
}

/**
 * Get photos for a specific task
 */
export async function getPhotosByTask(taskId: string): Promise<Photo[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch photos for task: ${error.message}`)
  }

  return (data || []) as Photo[]
}

/**
 * Get photos grouped by event type for a unit
 */
export async function getPhotosByUnitGrouped(unitId: string): Promise<Record<string, Photo[]>> {
  const photos = await getPhotosByUnit(unitId)

  const grouped: Record<string, Photo[]> = {
    move_in: [],
    move_out: [],
    maintenance: [],
    inspection: [],
    general: [],
  }

  for (const photo of photos) {
    if (photo.event_type in grouped) {
      grouped[photo.event_type].push(photo)
    }
  }

  return grouped
}

/**
 * Get a single photo by ID
 */
export async function getPhoto(id: string): Promise<PhotoWithUnit | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('photos')
    .select('*, unit:units(*)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch photo: ${error.message}`)
  }

  return data as PhotoWithUnit
}

/**
 * Create a new photo record (after file upload)
 */
export async function createPhoto(photo: PhotoInsert): Promise<Photo> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('photos')
    .insert(photo as never)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create photo: ${error.message}`)
  }

  return data as Photo
}

/**
 * Update a photo record
 */
export async function updatePhoto(id: string, updates: PhotoUpdate): Promise<Photo> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('photos')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update photo: ${error.message}`)
  }

  return data as Photo
}

/**
 * Delete a photo (record and file)
 */
export async function deletePhoto(id: string): Promise<void> {
  const supabase = await createClient()

  // First get the photo to get file path
  const { data: photoData } = await supabase
    .from('photos')
    .select('file_path')
    .eq('id', id)
    .single()

  const photo = photoData as { file_path: string } | null

  // Delete from storage if file exists
  if (photo?.file_path) {
    await supabase.storage.from('unit-photos').remove([photo.file_path])
  }

  // Delete the record
  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete photo: ${error.message}`)
  }
}

/**
 * Get photo counts by event type for a unit
 */
export async function getPhotoCounts(unitId: string): Promise<Record<string, number>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('photos')
    .select('event_type')
    .eq('unit_id', unitId)

  if (error) {
    throw new Error(`Failed to fetch photo counts: ${error.message}`)
  }

  const counts: Record<string, number> = {
    move_in: 0,
    move_out: 0,
    maintenance: 0,
    inspection: 0,
    general: 0,
  }

  const photos = (data || []) as { event_type: string }[]
  for (const photo of photos) {
    if (photo.event_type in counts) {
      counts[photo.event_type]++
    }
  }

  return counts
}

/**
 * Get signed URL for a photo
 */
export async function getPhotoUrl(filePath: string): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from('unit-photos')
    .createSignedUrl(filePath, 3600) // 1 hour expiry

  if (error) {
    console.error('Failed to get signed URL:', error.message)
    return null
  }

  return data.signedUrl
}
