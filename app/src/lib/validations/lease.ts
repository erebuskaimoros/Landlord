import { z } from 'zod'

// Lease status enum matching database
export const leaseStatusSchema = z.enum(['draft', 'active', 'expired', 'terminated'])

// Lease create schema - tenant, unit, start date, and rent required
export const leaseCreateSchema = z.object({
  tenant_id: z.string().uuid('Please select a tenant'),
  unit_id: z.string().uuid('Please select a unit'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().nullable(),
  rent_amount: z.number().min(0, 'Rent must be positive').max(100000, 'Rent amount too high'),
  status: leaseStatusSchema,
  notes: z.string().max(10000).optional().nullable(),
})

// Full schema for later phases with security deposit and terms
export const leaseFullSchema = leaseCreateSchema.extend({
  security_deposit: z.number().min(0).max(100000).optional().nullable(),
  deposit_returned_date: z.string().optional().nullable(),
  terms: z.string().max(50000).optional().nullable(),
})

// Update schema (all fields optional)
export const leaseUpdateSchema = leaseFullSchema.partial()

// Types derived from schemas
export type LeaseCreateInput = z.infer<typeof leaseCreateSchema>
export type LeaseFullInput = z.infer<typeof leaseFullSchema>
export type LeaseUpdateInput = z.infer<typeof leaseUpdateSchema>
export type LeaseStatus = z.infer<typeof leaseStatusSchema>
