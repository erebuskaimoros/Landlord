import { z } from 'zod'

// Service types enum for contractors
export const serviceTypeOptions = [
  'plumbing',
  'electrical',
  'hvac',
  'appliance_repair',
  'general_maintenance',
  'landscaping',
  'cleaning',
  'painting',
  'roofing',
  'flooring',
  'pest_control',
  'locksmith',
  'other',
] as const

export const serviceTypeSchema = z.enum(serviceTypeOptions)

// Minimal schema for creating a contractor - just name required
export const contractorCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  email: z.string().email('Invalid email').max(255).optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable(),
})

// Full schema with all fields
export const contractorFullSchema = contractorCreateSchema.extend({
  address: z.string().max(500).optional().nullable(),
  service_types: z.array(z.string()).default([]),
  hourly_rate: z.coerce.number().min(0).max(10000).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
})

// Update schema (all fields optional)
export const contractorUpdateSchema = contractorFullSchema.partial()

// Types derived from schemas
export type ContractorCreateInput = z.infer<typeof contractorCreateSchema>
export type ContractorFullInput = z.input<typeof contractorFullSchema>
export type ContractorFullOutput = z.infer<typeof contractorFullSchema>
export type ContractorUpdateInput = z.infer<typeof contractorUpdateSchema>
export type ServiceType = z.infer<typeof serviceTypeSchema>

// Helper to format service type for display
export function formatServiceType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
