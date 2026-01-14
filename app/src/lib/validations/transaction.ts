import { z } from 'zod'

// Transaction type enum matching database
export const transactionTypeSchema = z.enum(['income', 'expense'])

// Transaction create schema - type, description, date, and amount required
export const transactionCreateSchema = z.object({
  type: transactionTypeSchema,
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  transaction_date: z.string().min(1, 'Date is required'),
  actual_amount: z.number().min(0, 'Amount must be positive').max(10000000, 'Amount too high'),
  category_id: z.string().uuid().optional().nullable(),
  unit_id: z.string().uuid().optional().nullable(),
  tenant_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
})

// Full schema with expected amount
export const transactionFullSchema = transactionCreateSchema.extend({
  expected_amount: z.number().min(0).max(10000000).optional().nullable(),
})

// Update schema (all fields optional)
export const transactionUpdateSchema = transactionFullSchema.partial()

// Types derived from schemas
export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>
export type TransactionFullInput = z.infer<typeof transactionFullSchema>
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>
export type TransactionType = z.infer<typeof transactionTypeSchema>
