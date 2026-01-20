'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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

interface CreateRatingInput {
  taskId: string
  contractorId: string
  rating: number
  review: string | null
}

export async function createContractorRatingAction(input: CreateRatingInput): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Validate rating
  if (input.rating < 1 || input.rating > 5) {
    return { success: false, error: 'Rating must be between 1 and 5' }
  }

  // Check if rating already exists for this task
  const { data: existingRating } = await supabase
    .from('contractor_ratings')
    .select('id')
    .eq('task_id', input.taskId)
    .single()

  if (existingRating) {
    return { success: false, error: 'This task has already been rated' }
  }

  // Create rating
  const { data, error } = await supabase
    .from('contractor_ratings')
    .insert({
      organization_id: organizationId,
      contractor_id: input.contractorId,
      task_id: input.taskId,
      rating: input.rating,
      review: input.review,
      rated_by: user?.id,
    } as never)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/tasks')
  revalidatePath(`/tasks/${input.taskId}`)
  revalidatePath('/contractors')
  revalidatePath(`/contractors/${input.contractorId}`)

  return { success: true, data }
}

export async function updateContractorRatingAction(
  id: string,
  input: { rating?: number; review?: string | null }
): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  // Validate rating if provided
  if (input.rating !== undefined && (input.rating < 1 || input.rating > 5)) {
    return { success: false, error: 'Rating must be between 1 and 5' }
  }

  const { data, error } = await supabase
    .from('contractor_ratings')
    .update(input as never)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/tasks')
  revalidatePath('/contractors')

  return { success: true, data }
}

export async function deleteContractorRatingAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const { error } = await supabase
    .from('contractor_ratings')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/tasks')
  revalidatePath('/contractors')

  return { success: true }
}
