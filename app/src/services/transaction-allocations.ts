import { createClient } from '@/lib/supabase/server'

// Re-export shared types and functions for backward compatibility
export {
  type TransactionAllocation,
  type TransactionAllocationWithUnit,
  type AllocationInput,
  validateAllocationsSum,
  calculateEqualSplit,
} from './transaction-allocations-shared'

import type { TransactionAllocationWithUnit, AllocationInput } from './transaction-allocations-shared'

/**
 * Get all allocations for a transaction with unit details
 */
export async function getAllocations(transactionId: string): Promise<TransactionAllocationWithUnit[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transaction_allocations')
    .select(`
      *,
      unit:units(id, address, unit_number)
    `)
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch allocations: ${error.message}`)
  }

  return (data || []) as TransactionAllocationWithUnit[]
}

/**
 * Get allocations as a simple map of unit_id -> amount
 */
export async function getAllocationsMap(transactionId: string): Promise<Map<string, { amount: number; percentage: number | null }>> {
  const allocations = await getAllocations(transactionId)
  const map = new Map<string, { amount: number; percentage: number | null }>()

  for (const allocation of allocations) {
    map.set(allocation.unit_id, {
      amount: allocation.amount,
      percentage: allocation.percentage,
    })
  }

  return map
}

/**
 * Upsert allocations for a transaction
 * This will delete all existing allocations and insert new ones
 */
export async function upsertAllocations(
  transactionId: string,
  allocations: AllocationInput[]
): Promise<void> {
  const supabase = await createClient()

  // Delete existing allocations
  const { error: deleteError } = await supabase
    .from('transaction_allocations')
    .delete()
    .eq('transaction_id', transactionId)

  if (deleteError) {
    throw new Error(`Failed to clear existing allocations: ${deleteError.message}`)
  }

  // If no new allocations, we're done
  if (allocations.length === 0) {
    return
  }

  // Insert new allocations
  const insertData = allocations.map((a) => ({
    transaction_id: transactionId,
    unit_id: a.unit_id,
    amount: a.amount,
    percentage: a.percentage ?? null,
  }))

  const { error: insertError } = await supabase
    .from('transaction_allocations')
    .insert(insertData as never)

  if (insertError) {
    throw new Error(`Failed to save allocations: ${insertError.message}`)
  }
}

