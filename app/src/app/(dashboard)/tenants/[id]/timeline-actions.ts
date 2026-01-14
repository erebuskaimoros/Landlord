'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { timelineEventCreateSchema, timelineEventUpdateSchema } from '@/lib/validations/timeline-event'

export interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

async function getUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

export async function createTimelineEventAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: 'Not authenticated' }
  }

  const rawData = {
    tenant_id: formData.get('tenant_id'),
    event_type: formData.get('event_type'),
    title: formData.get('title'),
    description: formData.get('description') || null,
    event_date: formData.get('event_date'),
  }

  const result = timelineEventCreateSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  const { data, error } = await supabase
    .from('tenant_timeline_events')
    .insert({
      ...result.data,
      created_by: userId,
    } as never)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/tenants/${result.data.tenant_id}`)
  return { success: true, data }
}

export async function updateTimelineEventAction(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: 'Not authenticated' }
  }

  const rawData = {
    event_type: formData.get('event_type') || undefined,
    title: formData.get('title') || undefined,
    description: formData.get('description') || null,
    event_date: formData.get('event_date') || undefined,
  }

  const result = timelineEventUpdateSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  // Get tenant_id for revalidation
  const { data: existing } = await supabase
    .from('tenant_timeline_events')
    .select('tenant_id')
    .eq('id', id)
    .single()

  const { data, error } = await supabase
    .from('tenant_timeline_events')
    .update(result.data as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  const tenantId = (existing as { tenant_id: string } | null)?.tenant_id
  if (tenantId) {
    revalidatePath(`/tenants/${tenantId}`)
  }
  return { success: true, data }
}

export async function deleteTimelineEventAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Get tenant_id for revalidation before deletion
  const { data: event } = await supabase
    .from('tenant_timeline_events')
    .select('tenant_id')
    .eq('id', id)
    .single()
  const tenantId = (event as { tenant_id: string } | null)?.tenant_id

  const { error } = await supabase
    .from('tenant_timeline_events')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  if (tenantId) {
    revalidatePath(`/tenants/${tenantId}`)
  }
  return { success: true }
}
