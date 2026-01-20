import { createClient } from '@/lib/supabase/server'
import type { Tables, InsertTables, UpdateTables } from '@/types/database'

export type ContractorRating = Tables<'contractor_ratings'>
export type ContractorRatingInsert = InsertTables<'contractor_ratings'>
export type ContractorRatingUpdate = UpdateTables<'contractor_ratings'>

export type ContractorRatingWithDetails = ContractorRating & {
  contractor: Tables<'contractors'> | null
  task: Tables<'tasks'> | null
}

/**
 * Get all ratings for a contractor
 */
export async function getRatingsForContractor(contractorId: string): Promise<ContractorRatingWithDetails[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contractor_ratings')
    .select('*, contractor:contractors(*), task:tasks(*)')
    .eq('contractor_id', contractorId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch ratings: ${error.message}`)
  }

  return (data || []) as ContractorRatingWithDetails[]
}

/**
 * Get rating for a specific task
 */
export async function getRatingForTask(taskId: string): Promise<ContractorRating | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contractor_ratings')
    .select('*')
    .eq('task_id', taskId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch rating: ${error.message}`)
  }

  return data as ContractorRating
}

/**
 * Create a rating for a completed task
 */
export async function createRating(rating: ContractorRatingInsert): Promise<ContractorRating> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contractor_ratings')
    .insert(rating as never)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create rating: ${error.message}`)
  }

  return data as ContractorRating
}

/**
 * Update a rating
 */
export async function updateRating(id: string, updates: ContractorRatingUpdate): Promise<ContractorRating> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contractor_ratings')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update rating: ${error.message}`)
  }

  return data as ContractorRating
}

/**
 * Delete a rating
 */
export async function deleteRating(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('contractor_ratings')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete rating: ${error.message}`)
  }
}

/**
 * Get rating statistics for a contractor
 */
export async function getContractorRatingStats(contractorId: string): Promise<{
  averageRating: number
  totalRatings: number
  distribution: Record<number, number>
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contractor_ratings')
    .select('rating')
    .eq('contractor_id', contractorId)

  if (error) {
    throw new Error(`Failed to fetch rating stats: ${error.message}`)
  }

  const ratings = (data || []) as { rating: number }[]
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let sum = 0

  for (const r of ratings) {
    distribution[r.rating] = (distribution[r.rating] || 0) + 1
    sum += r.rating
  }

  return {
    averageRating: ratings.length > 0 ? sum / ratings.length : 0,
    totalRatings: ratings.length,
    distribution,
  }
}
