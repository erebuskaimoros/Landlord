import { z } from 'zod'

// Unit status enum matching database
export const unitStatusSchema = z.enum(['occupied', 'vacant', 'sold'])

// Minimal schema for MVP - just address required
export const unitCreateSchema = z.object({
  address: z.string().min(1, 'Address is required').max(500, 'Address too long'),
  unit_number: z.string().max(50).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  zip_code: z.string().max(20).optional().nullable(),
  building_id: z.string().uuid().optional().nullable(),
})

// Full schema for later phases
export const unitFullSchema = unitCreateSchema.extend({
  property_type: z.string().max(50).optional().nullable(),
  bedrooms: z.coerce.number().int().min(0).max(20).optional().nullable(),
  bathrooms: z.coerce.number().min(0).max(20).optional().nullable(),
  square_footage: z.coerce.number().int().min(0).max(100000).optional().nullable(),
  year_built: z.coerce.number().int().min(1800).max(new Date().getFullYear() + 5).optional().nullable(),
  status: unitStatusSchema.default('vacant'),
  listing_description: z.string().max(5000).optional().nullable(),
  rental_price: z.coerce.number().min(0).max(1000000).optional().nullable(),
  pet_policy: z.string().max(1000).optional().nullable(),
  amenities: z.array(z.string()).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  building_id: z.string().uuid().optional().nullable(),
})

// Update schema (all fields optional except you can't change org)
export const unitUpdateSchema = unitFullSchema.partial()

// Types derived from schemas
export type UnitCreateInput = z.infer<typeof unitCreateSchema>
export type UnitFullInput = z.input<typeof unitFullSchema>  // Use input type for forms
export type UnitFullOutput = z.infer<typeof unitFullSchema> // Use output type for validated data
export type UnitUpdateInput = z.infer<typeof unitUpdateSchema>
export type UnitStatus = z.infer<typeof unitStatusSchema>
