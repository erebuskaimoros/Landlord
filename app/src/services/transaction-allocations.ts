import { createClient } from '@/lib/supabase/server'

export interface TransactionAllocation {
  id: string
  transaction_id: string
  unit_id: string
  amount: number
  percentage: number | null
  created_at: string
}

export interface TransactionAllocationWithUnit extends TransactionAllocation {
  unit: {
    id: string
    address: string
    unit_number: string | null
  }
}

export interface AllocationInput {
  unit_id: string
  amount: number
  percentage?: number | null
}

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

/**
 * Validate that allocations sum to the transaction amount
 */
export function validateAllocationsSum(
  allocations: AllocationInput[],
  transactionAmount: number
): { valid: boolean; error?: string } {
  if (allocations.length === 0) {
    return { valid: true }
  }

  const total = allocations.reduce((sum, a) => sum + a.amount, 0)

  // Allow for small floating point differences (within 1 cent)
  if (Math.abs(total - transactionAmount) > 0.01) {
    return {
      valid: false,
      error: `Allocations total ($${total.toFixed(2)}) must equal transaction amount ($${transactionAmount.toFixed(2)})`,
    }
  }

  return { valid: true }
}

/**
 * Calculate equal split amounts for units
 */
export function calculateEqualSplit(
  unitIds: string[],
  totalAmount: number
): AllocationInput[] {
  if (unitIds.length === 0) {
    return []
  }

  const baseAmount = Math.floor((totalAmount / unitIds.length) * 100) / 100
  const remainder = totalAmount - baseAmount * unitIds.length

  return unitIds.map((unit_id, index) => {
    // Add remainder to first unit to ensure sum equals total
    const amount = index === 0 ? baseAmount + remainder : baseAmount
    const percentage = (100 / unitIds.length)

    return {
      unit_id,
      amount: Math.round(amount * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
    }
  })
}
