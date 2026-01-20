import { z } from 'zod'

// Asset type options
export const assetTypeOptions = [
  'refrigerator',
  'stove',
  'dishwasher',
  'microwave',
  'washer',
  'dryer',
  'hvac',
  'water_heater',
  'garbage_disposal',
  'smoke_detector',
  'carbon_monoxide_detector',
  'thermostat',
  'garage_door_opener',
  'ceiling_fan',
  'light_fixture',
  'plumbing_fixture',
  'electrical_panel',
  'roof',
  'flooring',
  'windows',
  'doors',
  'other',
] as const

export const assetConditionOptions = ['excellent', 'good', 'fair', 'poor'] as const

export const assetTypeSchema = z.enum(assetTypeOptions)
export const assetConditionSchema = z.enum(assetConditionOptions)

// Minimal schema for creating an asset - just name, type, and unit required
export const assetCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  asset_type: z.string().min(1, 'Asset type is required').max(100, 'Asset type too long'),
  unit_id: z.string().uuid('Invalid unit'),
})

// Full schema with all fields
export const assetFullSchema = assetCreateSchema.extend({
  make: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  serial_number: z.string().max(100).optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  purchase_price: z.coerce.number().min(0).max(1000000).optional().nullable(),
  warranty_expiry: z.string().optional().nullable(),
  expected_lifespan_years: z.coerce.number().int().min(1).max(100).optional().nullable(),
  condition: assetConditionSchema.default('good'),
  notes: z.string().max(10000).optional().nullable(),
})

// Update schema (all fields optional)
export const assetUpdateSchema = assetFullSchema.partial()

// Types derived from schemas
export type AssetCreateInput = z.infer<typeof assetCreateSchema>
export type AssetFullInput = z.input<typeof assetFullSchema>
export type AssetFullOutput = z.infer<typeof assetFullSchema>
export type AssetUpdateInput = z.infer<typeof assetUpdateSchema>
export type AssetType = z.infer<typeof assetTypeSchema>
export type AssetCondition = z.infer<typeof assetConditionSchema>

// Helper to format asset type for display
export function formatAssetType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Helper to format condition for display
export function formatCondition(condition: string): string {
  return condition.charAt(0).toUpperCase() + condition.slice(1)
}

// Get condition badge color
export function getConditionColor(condition: string): string {
  switch (condition) {
    case 'excellent':
      return 'bg-green-100 text-green-800'
    case 'good':
      return 'bg-blue-100 text-blue-800'
    case 'fair':
      return 'bg-yellow-100 text-yellow-800'
    case 'poor':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
