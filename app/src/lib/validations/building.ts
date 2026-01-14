import { z } from 'zod'

// Building create schema - name and address required
export const buildingCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  address: z.string().min(1, 'Address is required').max(500, 'Address too long'),
  notes: z.string().max(10000).optional().nullable(),
})

// Update schema (all fields optional)
export const buildingUpdateSchema = buildingCreateSchema.partial()

// Types derived from schemas
export type BuildingCreateInput = z.infer<typeof buildingCreateSchema>
export type BuildingUpdateInput = z.infer<typeof buildingUpdateSchema>
