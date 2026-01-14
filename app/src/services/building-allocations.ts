import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'

export type BuildingUnitAllocation = Tables<'building_unit_allocations'>

export interface AllocationWithUnit extends BuildingUnitAllocation {
  unit: Tables<'units'> | null
}

/**
 * Get all allocations for a building with unit details
 */
export async function getAllocations(buildingId: string): Promise<AllocationWithUnit[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('building_unit_allocations')
    .select('*, unit:units(*)')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch allocations: ${error.message}`)
  }

  return (data || []) as AllocationWithUnit[]
}

/**
 * Get allocations for a building as a map of unit_id -> percentage
 */
export async function getAllocationsMap(buildingId: string): Promise<Map<string, number>> {
  const allocations = await getAllocations(buildingId)
  const map = new Map<string, number>()

  for (const allocation of allocations) {
    map.set(allocation.unit_id, Number(allocation.allocation_percentage))
  }

  return map
}

/**
 * Upsert allocations for a building.
 * Replaces all existing allocations with the new set.
 */
export async function upsertAllocations(
  buildingId: string,
  allocations: { unit_id: string; allocation_percentage: number }[]
): Promise<void> {
  const supabase = await createClient()

  // Delete existing allocations
  const { error: deleteError } = await supabase
    .from('building_unit_allocations')
    .delete()
    .eq('building_id', buildingId)

  if (deleteError) {
    throw new Error(`Failed to clear existing allocations: ${deleteError.message}`)
  }

  // Insert new allocations if any
  if (allocations.length > 0) {
    const toInsert = allocations.map((a) => ({
      building_id: buildingId,
      unit_id: a.unit_id,
      allocation_percentage: a.allocation_percentage,
    }))

    const { error: insertError } = await supabase
      .from('building_unit_allocations')
      .insert(toInsert as never)

    if (insertError) {
      throw new Error(`Failed to save allocations: ${insertError.message}`)
    }
  }
}

/**
 * Validate that allocations sum to 100% (or 0 if empty)
 */
export function validateAllocationsSum(
  allocations: { allocation_percentage: number }[]
): { valid: boolean; total: number; error?: string } {
  if (allocations.length === 0) {
    return { valid: true, total: 0 }
  }

  const total = allocations.reduce((sum, a) => sum + a.allocation_percentage, 0)

  // Allow for small floating point errors
  if (Math.abs(total - 100) < 0.01) {
    return { valid: true, total: 100 }
  }

  return {
    valid: false,
    total,
    error: `Allocations must sum to 100%. Current total: ${total.toFixed(2)}%`,
  }
}
