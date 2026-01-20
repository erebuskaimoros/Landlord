'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { photoCreateSchema } from '@/lib/validations/photo'

export interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

async function getUserOrganizationId(): Promise<string | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const membershipData = membership as { organization_id: string } | null
  return membershipData?.organization_id || null
}

export async function uploadTaskPhotoAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const { data: { user } } = await supabase.auth.getUser()

  const file = formData.get('file') as File
  const taskId = formData.get('task_id') as string
  const unitId = formData.get('unit_id') as string
  const caption = formData.get('caption') as string || null

  if (!file || !taskId || !unitId) {
    return { success: false, error: 'File, task ID, and unit ID are required' }
  }

  // Generate unique file path with task subfolder
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `${organizationId}/${unitId}/tasks/${taskId}/${fileName}`

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from('unit-photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` }
  }

  // Create photo record - task photos are always maintenance type
  const photoData = {
    unit_id: unitId,
    file_path: filePath,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    event_type: 'maintenance',
    caption,
  }

  const result = photoCreateSchema.safeParse(photoData)
  if (!result.success) {
    // Clean up uploaded file
    await supabase.storage.from('unit-photos').remove([filePath])
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  const { data, error } = await supabase
    .from('photos')
    .insert({
      organization_id: organizationId,
      uploaded_by: user?.id,
      task_id: taskId,
      ...result.data,
    } as never)
    .select()
    .single()

  if (error) {
    // Clean up uploaded file
    await supabase.storage.from('unit-photos').remove([filePath])
    return { success: false, error: error.message }
  }

  // Revalidate both task and unit pages
  revalidatePath(`/tasks/${taskId}`)
  revalidatePath(`/units/${unitId}`)
  return { success: true, data }
}

export async function deleteTaskPhotoAction(id: string, taskId: string, unitId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  // Get photo to get file path
  const { data: photoData } = await supabase
    .from('photos')
    .select('file_path')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  const photo = photoData as { file_path: string } | null

  // Delete from storage
  if (photo?.file_path) {
    await supabase.storage.from('unit-photos').remove([photo.file_path])
  }

  // Delete record
  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Revalidate both task and unit pages
  revalidatePath(`/tasks/${taskId}`)
  revalidatePath(`/units/${unitId}`)
  return { success: true }
}
