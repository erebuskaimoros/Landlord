import { createClient } from '@/lib/supabase/server'
import type { Tables, InsertTables, UpdateTables } from '@/types/database'

export type RecurringTask = Tables<'recurring_tasks'>
export type RecurringTaskInsert = InsertTables<'recurring_tasks'>
export type RecurringTaskUpdate = UpdateTables<'recurring_tasks'>

export type RecurringTaskWithRelations = RecurringTask & {
  unit: Tables<'units'> | null
  contractor: Tables<'contractors'> | null
}

export interface RecurringTasksListParams {
  organizationId: string
  unitId?: string
  contractorId?: string
  isActive?: boolean
  search?: string
  limit?: number
  offset?: number
}

export interface RecurringTasksListResult {
  recurringTasks: RecurringTaskWithRelations[]
  count: number
}

/**
 * Get all recurring tasks for an organization with optional filtering
 */
export async function getRecurringTasks(params: RecurringTasksListParams): Promise<RecurringTasksListResult> {
  const supabase = await createClient()
  const {
    organizationId,
    unitId,
    contractorId,
    isActive,
    search,
    limit = 50,
    offset = 0
  } = params

  let query = supabase
    .from('recurring_tasks')
    .select('*, unit:units(*), contractor:contractors(*)', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('next_due_date', { ascending: true })

  if (unitId) {
    query = query.eq('unit_id', unitId)
  }

  if (contractorId) {
    query = query.eq('assigned_contractor_id', contractorId)
  }

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive)
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch recurring tasks: ${error.message}`)
  }

  return {
    recurringTasks: (data || []) as RecurringTaskWithRelations[],
    count: count || 0,
  }
}

/**
 * Get a single recurring task by ID with relations
 */
export async function getRecurringTask(id: string): Promise<RecurringTaskWithRelations | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('recurring_tasks')
    .select('*, unit:units(*), contractor:contractors(*)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch recurring task: ${error.message}`)
  }

  return data as RecurringTaskWithRelations
}

/**
 * Create a new recurring task
 */
export async function createRecurringTask(task: RecurringTaskInsert): Promise<RecurringTask> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('recurring_tasks')
    .insert(task as never)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create recurring task: ${error.message}`)
  }

  return data as RecurringTask
}

/**
 * Update an existing recurring task
 */
export async function updateRecurringTask(id: string, updates: RecurringTaskUpdate): Promise<RecurringTask> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('recurring_tasks')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update recurring task: ${error.message}`)
  }

  return data as RecurringTask
}

/**
 * Delete a recurring task
 */
export async function deleteRecurringTask(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('recurring_tasks')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete recurring task: ${error.message}`)
  }
}

/**
 * Toggle active status for a recurring task
 */
export async function toggleRecurringTaskActive(id: string, isActive: boolean): Promise<RecurringTask> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('recurring_tasks')
    .update({ is_active: isActive } as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to toggle recurring task: ${error.message}`)
  }

  return data as RecurringTask
}

/**
 * Get recurring task counts for dashboard
 */
export async function getRecurringTaskCounts(organizationId: string): Promise<{
  active: number
  paused: number
  total: number
}> {
  const supabase = await createClient()

  const [activeResult, pausedResult] = await Promise.all([
    supabase
      .from('recurring_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true),
    supabase
      .from('recurring_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', false),
  ])

  const active = activeResult.count || 0
  const paused = pausedResult.count || 0

  return {
    active,
    paused,
    total: active + paused,
  }
}

/**
 * Generate a one-time task from a recurring task template
 * This is called when the next_due_date passes
 */
export async function generateTaskFromRecurring(recurringTaskId: string): Promise<Tables<'tasks'>> {
  const supabase = await createClient()

  // Get the recurring task
  const recurringTask = await getRecurringTask(recurringTaskId)
  if (!recurringTask) {
    throw new Error('Recurring task not found')
  }

  if (!recurringTask.is_active) {
    throw new Error('Recurring task is not active')
  }

  // Create a new task from the template
  const { data: newTask, error: taskError } = await supabase
    .from('tasks')
    .insert({
      organization_id: recurringTask.organization_id,
      unit_id: recurringTask.unit_id,
      title: recurringTask.title,
      description: recurringTask.description,
      priority: recurringTask.priority,
      due_date: recurringTask.next_due_date,
      assigned_contractor_id: recurringTask.assigned_contractor_id,
      status: 'open',
    } as never)
    .select()
    .single()

  if (taskError) {
    throw new Error(`Failed to generate task: ${taskError.message}`)
  }

  // Update the recurring task with new next_due_date
  const currentDueDate = new Date(recurringTask.next_due_date)
  const nextDueDate = new Date(currentDueDate)
  nextDueDate.setDate(nextDueDate.getDate() + recurringTask.interval_days)

  const { error: updateError } = await supabase
    .from('recurring_tasks')
    .update({
      next_due_date: nextDueDate.toISOString().split('T')[0],
      last_generated_at: new Date().toISOString(),
    } as never)
    .eq('id', recurringTaskId)

  if (updateError) {
    throw new Error(`Failed to update recurring task: ${updateError.message}`)
  }

  return newTask as Tables<'tasks'>
}
