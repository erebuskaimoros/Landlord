import { createClient } from '@/lib/supabase/server'
import type { Tables, InsertTables, UpdateTables } from '@/types/database'

export type Building = Tables<'buildings'>
export type BuildingInsert = InsertTables<'buildings'>
export type BuildingUpdate = UpdateTables<'buildings'>

export interface BuildingsListParams {
  organizationId: string
  search?: string
  limit?: number
  offset?: number
}

export interface BuildingsListResult {
  buildings: Building[]
  count: number
}

/**
 * Get all buildings for an organization with optional filtering
 */
export async function getBuildings(params: BuildingsListParams): Promise<BuildingsListResult> {
  const supabase = await createClient()
  const { organizationId, search, limit = 50, offset = 0 } = params

  let query = supabase
    .from('buildings')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch buildings: ${error.message}`)
  }

  return {
    buildings: data || [],
    count: count || 0,
  }
}

/**
 * Get a single building by ID
 */
export async function getBuilding(id: string): Promise<Building | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch building: ${error.message}`)
  }

  return data
}

/**
 * Create a new building
 */
export async function createBuilding(building: BuildingInsert): Promise<Building> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('buildings')
    .insert(building as never)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create building: ${error.message}`)
  }

  return data as Building
}

/**
 * Update an existing building
 */
export async function updateBuilding(id: string, updates: BuildingUpdate): Promise<Building> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('buildings')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update building: ${error.message}`)
  }

  return data as Building
}

/**
 * Delete a building
 */
export async function deleteBuilding(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('buildings')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete building: ${error.message}`)
  }
}
