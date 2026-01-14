import { z } from 'zod'

/**
 * Single allocation entry schema
 */
export const transactionAllocationSchema = z.object({
  unit_id: z.string().uuid('Invalid unit ID'),
  amount: z.coerce.number().min(0.01, 'Amount must be at least $0.01'),
  percentage: z.coerce.number().min(0).max(100).optional().nullable(),
})

/**
 * Array of allocations schema with sum validation
 */
export const transactionAllocationsSchema = z.array(transactionAllocationSchema)

/**
 * Schema for creating allocations with transaction amount validation
 */
export function createAllocationsSchemaWithTotal(transactionAmount: number) {
  return transactionAllocationsSchema.refine(
    (allocations) => {
      if (allocations.length === 0) return true
      const total = allocations.reduce((sum, a) => sum + a.amount, 0)
      return Math.abs(total - transactionAmount) <= 0.01
    },
    {
      message: `Allocations must sum to the transaction amount ($${transactionAmount.toFixed(2)})`,
    }
  )
}

export type TransactionAllocationInput = z.infer<typeof transactionAllocationSchema>
export type TransactionAllocationsInput = z.infer<typeof transactionAllocationsSchema>
