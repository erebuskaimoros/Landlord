/**
 * Shared types and pure functions for transaction allocations
 * This file is safe to import from both client and server components
 */

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
