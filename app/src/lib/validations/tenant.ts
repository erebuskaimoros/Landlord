import { z } from 'zod'

// Tenant create schema - first and last name required
export const tenantCreateSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  email: z.string().email('Invalid email address').max(255).optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
})

// Full schema for later phases with emergency contact
export const tenantFullSchema = tenantCreateSchema.extend({
  emergency_contact_name: z.string().max(200).optional().nullable(),
  emergency_contact_phone: z.string().max(30).optional().nullable(),
  emergency_contact_relationship: z.string().max(100).optional().nullable(),
})

// Update schema (all fields optional)
export const tenantUpdateSchema = tenantFullSchema.partial()

// Types derived from schemas
export type TenantCreateInput = z.infer<typeof tenantCreateSchema>
export type TenantFullInput = z.infer<typeof tenantFullSchema>
export type TenantUpdateInput = z.infer<typeof tenantUpdateSchema>
