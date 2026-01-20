'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { taskFullSchema, taskUpdateSchema } from '@/lib/validations/task'
import { recurringTaskFullSchema, recurringTaskUpdateSchema } from '@/lib/validations/recurring-task'

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

function parseFormDataForTask(formData: FormData) {
  return {
    title: formData.get('title') as string,
    unit_id: formData.get('unit_id') as string,
    description: formData.get('description') || null,
    status: formData.get('status') || 'open',
    priority: formData.get('priority') || 'medium',
    due_date: formData.get('due_date') || null,
    assigned_contractor_id: formData.get('assigned_contractor_id') || null,
    estimated_cost: formData.get('estimated_cost') || null,
    actual_cost: formData.get('actual_cost') || null,
    notes: formData.get('notes') || null,
  }
}

export async function createTaskAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const rawData = parseFormDataForTask(formData)

  const result = taskFullSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      organization_id: organizationId,
      ...result.data,
    } as never)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  revalidatePath(`/units/${result.data.unit_id}`)
  return { success: true, data }
}

export async function updateTaskAction(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const rawData = parseFormDataForTask(formData)

  const result = taskUpdateSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(result.data as never)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/tasks')
  revalidatePath(`/tasks/${id}`)
  revalidatePath('/dashboard')
  return { success: true, data }
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateTaskStatusAction(
  id: string,
  status: 'open' | 'in_progress' | 'completed' | 'cancelled',
  actualCost?: number
): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const { data: { user } } = await supabase.auth.getUser()

  const updates: Record<string, unknown> = { status }

  if (status === 'completed') {
    updates.completed_at = new Date().toISOString()
    updates.completed_by = user?.id
    if (actualCost !== undefined) {
      updates.actual_cost = actualCost
    }
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updates as never)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/tasks')
  revalidatePath(`/tasks/${id}`)
  revalidatePath('/dashboard')
  return { success: true, data }
}

// ============================================
// Recurring Task Actions
// ============================================

function parseFormDataForRecurringTask(formData: FormData) {
  return {
    title: formData.get('title') as string,
    unit_id: formData.get('unit_id') as string,
    description: formData.get('description') || null,
    priority: formData.get('priority') || 'medium',
    interval_days: formData.get('interval_days') as string,
    next_due_date: formData.get('next_due_date') as string,
    assigned_contractor_id: formData.get('assigned_contractor_id') || null,
    is_active: formData.get('is_active') === 'true',
  }
}

export async function createRecurringTaskAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const rawData = parseFormDataForRecurringTask(formData)

  const result = recurringTaskFullSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  const { data, error } = await supabase
    .from('recurring_tasks')
    .insert({
      organization_id: organizationId,
      ...result.data,
    } as never)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return { success: true, data }
}

export async function updateRecurringTaskAction(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const rawData = parseFormDataForRecurringTask(formData)

  const result = recurringTaskUpdateSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  const { data, error } = await supabase
    .from('recurring_tasks')
    .update(result.data as never)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return { success: true, data }
}

export async function deleteRecurringTaskAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const { error } = await supabase
    .from('recurring_tasks')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleRecurringTaskActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const { data, error } = await supabase
    .from('recurring_tasks')
    .update({ is_active: isActive } as never)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return { success: true, data }
}

export async function generateTaskFromRecurringAction(recurringTaskId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  // Get the recurring task
  const { data: fetchedTask, error: fetchError } = await supabase
    .from('recurring_tasks')
    .select('*')
    .eq('id', recurringTaskId)
    .eq('organization_id', organizationId)
    .single()

  if (fetchError || !fetchedTask) {
    return { success: false, error: 'Recurring task not found' }
  }

  // Type assertion for recurring task
  const recurringTask = fetchedTask as {
    id: string
    organization_id: string
    unit_id: string
    title: string
    description: string | null
    priority: 'low' | 'medium' | 'high' | 'urgent'
    interval_days: number
    next_due_date: string
    assigned_contractor_id: string | null
    is_active: boolean
  }

  if (!recurringTask.is_active) {
    return { success: false, error: 'Recurring task is paused' }
  }

  // Create a new task from the template
  const { data: newTask, error: taskError } = await supabase
    .from('tasks')
    .insert({
      organization_id: organizationId,
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
    return { success: false, error: `Failed to generate task: ${taskError.message}` }
  }

  // Update the recurring task with new next_due_date
  const currentDueDate = new Date(recurringTask.next_due_date)
  const nextDueDate = new Date(currentDueDate)
  nextDueDate.setDate(nextDueDate.getDate() + recurringTask.interval_days)

  await supabase
    .from('recurring_tasks')
    .update({
      next_due_date: nextDueDate.toISOString().split('T')[0],
      last_generated_at: new Date().toISOString(),
    } as never)
    .eq('id', recurringTaskId)

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return { success: true, data: newTask }
}
