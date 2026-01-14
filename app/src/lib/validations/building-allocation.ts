import { z } from 'zod'

export const allocationEntrySchema = z.object({
  unit_id: z.string().uuid('Invalid unit ID'),
  allocation_percentage: z
    .number()
    .min(0, 'Percentage must be at least 0')
    .max(100, 'Percentage cannot exceed 100'),
})

export const buildingAllocationsSchema = z
  .array(allocationEntrySchema)
  .refine(
    (allocations) => {
      if (allocations.length === 0) return true
      const total = allocations.reduce((sum, a) => sum + a.allocation_percentage, 0)
      return Math.abs(total - 100) < 0.01
    },
    { message: 'Allocation percentages must sum to 100%' }
  )

export type AllocationEntry = z.infer<typeof allocationEntrySchema>
export type BuildingAllocations = z.infer<typeof buildingAllocationsSchema>
