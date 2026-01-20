import { createClient } from '@/lib/supabase/server'
import type { Tables, InsertTables, UpdateTables } from '@/types/database'

export type Task = Tables<'tasks'>
export type TaskInsert = InsertTables<'tasks'>
export type TaskUpdate = UpdateTables<'tasks'>

export type TaskWithRelations = Task & {
  unit: Tables<'units'> | null
  contractor: Tables<'contractors'> | null
}

export interface TasksListParams {
  organizationId: string
  unitId?: string
  contractorId?: string
  status?: Task['status']
  priority?: Task['priority']
  search?: string
  overdue?: boolean
  limit?: number
  offset?: number
}

export interface TasksListResult {
  tasks: TaskWithRelations[]
  count: number
}

/**
 * Get all tasks for an organization with optional filtering
 */
export async function getTasks(params: TasksListParams): Promise<TasksListResult> {
  const supabase = await createClient()
  const {
    organizationId,
    unitId,
    contractorId,
    status,
    priority,
    search,
    overdue,
    limit = 50,
    offset = 0
  } = params

  let query = supabase
    .from('tasks')
    .select('*, unit:units(*), contractor:contractors(*)', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (unitId) {
    query = query.eq('unit_id', unitId)
  }

  if (contractorId) {
    query = query.eq('assigned_contractor_id', contractorId)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (priority) {
    query = query.eq('priority', priority)
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  }

  if (overdue) {
    const today = new Date().toISOString().split('T')[0]
    query = query
      .lt('due_date', today)
      .in('status', ['open', 'in_progress'])
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`)
  }

  return {
    tasks: (data || []) as TaskWithRelations[],
    count: count || 0,
  }
}

/**
 * Get a single task by ID with relations
 */
export async function getTask(id: string): Promise<TaskWithRelations | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select('*, unit:units(*), contractor:contractors(*)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch task: ${error.message}`)
  }

  return data as TaskWithRelations
}

/**
 * Create a new task
 */
export async function createTask(task: TaskInsert): Promise<Task> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .insert(task as never)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`)
  }

  return data as Task
}

/**
 * Update an existing task
 */
export async function updateTask(id: string, updates: TaskUpdate): Promise<Task> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update task: ${error.message}`)
  }

  return data as Task
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete task: ${error.message}`)
  }
}

/**
 * Complete a task (update status to completed and set completed_at)
 */
export async function completeTask(id: string, actualCost?: number): Promise<Task> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const updates: TaskUpdate = {
    status: 'completed',
    completed_at: new Date().toISOString(),
    completed_by: user?.id,
  }

  if (actualCost !== undefined) {
    updates.actual_cost = actualCost
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to complete task: ${error.message}`)
  }

  return data as Task
}

/**
 * Get task counts by status for dashboard
 */
export async function getTaskCounts(organizationId: string): Promise<{
  open: number
  in_progress: number
  completed: number
  overdue: number
}> {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  const [openResult, inProgressResult, completedResult, overdueResult] = await Promise.all([
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'open'),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'in_progress'),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'completed'),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('status', ['open', 'in_progress'])
      .lt('due_date', today),
  ])

  return {
    open: openResult.count || 0,
    in_progress: inProgressResult.count || 0,
    completed: completedResult.count || 0,
    overdue: overdueResult.count || 0,
  }
}
