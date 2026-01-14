import { createClient } from '@/lib/supabase/server'
import type { Tables, InsertTables, UpdateTables } from '@/types/database'

export type TimelineEvent = Tables<'tenant_timeline_events'>
export type TimelineEventInsert = InsertTables<'tenant_timeline_events'>
export type TimelineEventUpdate = UpdateTables<'tenant_timeline_events'>

export interface TimelineEventsListParams {
  tenantId: string
  limit?: number
  offset?: number
}

export interface TimelineEventsListResult {
  events: TimelineEvent[]
  count: number
}

/**
 * Get all timeline events for a tenant
 */
export async function getTimelineEvents(params: TimelineEventsListParams): Promise<TimelineEventsListResult> {
  const supabase = await createClient()
  const { tenantId, limit = 50, offset = 0 } = params

  const { data, error, count } = await supabase
    .from('tenant_timeline_events')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('event_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Failed to fetch timeline events: ${error.message}`)
  }

  return {
    events: (data || []) as TimelineEvent[],
    count: count || 0,
  }
}

/**
 * Get a single timeline event by ID
 */
export async function getTimelineEvent(id: string): Promise<TimelineEvent | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenant_timeline_events')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch timeline event: ${error.message}`)
  }

  return data as TimelineEvent
}

/**
 * Create a new timeline event
 */
export async function createTimelineEvent(event: TimelineEventInsert): Promise<TimelineEvent> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenant_timeline_events')
    .insert(event as never)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create timeline event: ${error.message}`)
  }

  return data as TimelineEvent
}

/**
 * Update an existing timeline event
 */
export async function updateTimelineEvent(id: string, updates: TimelineEventUpdate): Promise<TimelineEvent> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenant_timeline_events')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update timeline event: ${error.message}`)
  }

  return data as TimelineEvent
}

/**
 * Delete a timeline event
 */
export async function deleteTimelineEvent(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tenant_timeline_events')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete timeline event: ${error.message}`)
  }
}
