import { z } from 'zod'

// Common service types for asset maintenance
export const serviceTypeOptions = [
  'repair',
  'replacement',
  'inspection',
  'cleaning',
  'calibration',
  'installation',
  'upgrade',
  'preventive_maintenance',
  'emergency_repair',
  'warranty_service',
  'other',
] as const

export const serviceTypeSchema = z.enum(serviceTypeOptions)

// Schema for creating a maintenance log
export const maintenanceLogCreateSchema = z.object({
  asset_id: z.string().uuid('Invalid asset'),
  service_date: z.string().min(1, 'Service date is required'),
  service_type: z.string().min(1, 'Service type is required').max(100),
  description: z.string().max(5000).optional().nullable(),
  cost: z.coerce.number().min(0).max(1000000).optional().nullable(),
  performed_by: z.string().max(255).optional().nullable(),
  contractor_id: z.string().uuid().optional().nullable(),
  task_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
})

// Update schema
export const maintenanceLogUpdateSchema = maintenanceLogCreateSchema.partial()

// Types
export type MaintenanceLogCreateInput = z.input<typeof maintenanceLogCreateSchema>
export type MaintenanceLogUpdateInput = z.input<typeof maintenanceLogUpdateSchema>
export type MaintenanceLogCreateOutput = z.infer<typeof maintenanceLogCreateSchema>
export type ServiceType = z.infer<typeof serviceTypeSchema>

// Helper to format service type for display
export function formatServiceType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
