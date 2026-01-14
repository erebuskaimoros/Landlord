import { createClient } from '@/lib/supabase/server'
import type { Tables, InsertTables, UpdateTables } from '@/types/database'

export type Unit = Tables<'units'>
export type UnitInsert = InsertTables<'units'>
export type UnitUpdate = UpdateTables<'units'>

export interface UnitsListParams {
  organizationId: string
  status?: 'occupied' | 'vacant' | 'sold'
  buildingId?: string
  search?: string
  limit?: number
  offset?: number
}

export interface UnitsListResult {
  units: Unit[]
  count: number
}

/**
 * Get all units for an organization with optional filtering
 */
export async function getUnits(params: UnitsListParams): Promise<UnitsListResult> {
  const supabase = await createClient()
  const { organizationId, status, buildingId, search, limit = 50, offset = 0 } = params

  let query = supabase
    .from('units')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (buildingId) {
    query = query.eq('building_id', buildingId)
  }

  if (search) {
    query = query.or(`address.ilike.%${search}%,city.ilike.%${search}%,unit_number.ilike.%${search}%`)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch units: ${error.message}`)
  }

  return {
    units: data || [],
    count: count || 0,
  }
}

/**
 * Get a single unit by ID
 */
export async function getUnit(id: string): Promise<Unit | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch unit: ${error.message}`)
  }

  return data
}

/**
 * Create a new unit
 */
export async function createUnit(unit: UnitInsert): Promise<Unit> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('units')
    .insert(unit as never)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create unit: ${error.message}`)
  }

  return data as Unit
}

/**
 * Update an existing unit
 */
export async function updateUnit(id: string, updates: UnitUpdate): Promise<Unit> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('units')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update unit: ${error.message}`)
  }

  return data as Unit
}

/**
 * Delete a unit
 */
export async function deleteUnit(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('units')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete unit: ${error.message}`)
  }
}

/**
 * Get unit counts by status for an organization
 */
export async function getUnitStatusCounts(organizationId: string): Promise<Record<string, number>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('units')
    .select('status')
    .eq('organization_id', organizationId)

  if (error) {
    throw new Error(`Failed to fetch unit counts: ${error.message}`)
  }

  const counts: Record<string, number> = {
    occupied: 0,
    vacant: 0,
    sold: 0,
    total: 0,
  }

  const units = (data || []) as { status: 'occupied' | 'vacant' | 'sold' }[]
  for (const unit of units) {
    counts[unit.status]++
    counts.total++
  }

  return counts
}
