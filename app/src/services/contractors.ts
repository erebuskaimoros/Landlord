import { createClient } from '@/lib/supabase/server'
import type { Tables, InsertTables, UpdateTables } from '@/types/database'

export type Contractor = Tables<'contractors'>
export type ContractorInsert = InsertTables<'contractors'>
export type ContractorUpdate = UpdateTables<'contractors'>

export interface ContractorsListParams {
  organizationId: string
  search?: string
  serviceType?: string
  limit?: number
  offset?: number
}

export interface ContractorsListResult {
  contractors: Contractor[]
  count: number
}

/**
 * Get all contractors for an organization with optional filtering
 */
export async function getContractors(params: ContractorsListParams): Promise<ContractorsListResult> {
  const supabase = await createClient()
  const { organizationId, search, serviceType, limit = 50, offset = 0 } = params

  let query = supabase
    .from('contractors')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  if (serviceType) {
    query = query.contains('service_types', [serviceType])
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch contractors: ${error.message}`)
  }

  return {
    contractors: (data || []) as Contractor[],
    count: count || 0,
  }
}

/**
 * Get a single contractor by ID
 */
export async function getContractor(id: string): Promise<Contractor | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contractors')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch contractor: ${error.message}`)
  }

  return data as Contractor
}

/**
 * Create a new contractor
 */
export async function createContractor(contractor: ContractorInsert): Promise<Contractor> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contractors')
    .insert(contractor as never)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create contractor: ${error.message}`)
  }

  return data as Contractor
}

/**
 * Update an existing contractor
 */
export async function updateContractor(id: string, updates: ContractorUpdate): Promise<Contractor> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contractors')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update contractor: ${error.message}`)
  }

  return data as Contractor
}

/**
 * Delete a contractor
 */
export async function deleteContractor(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('contractors')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete contractor: ${error.message}`)
  }
}

/**
 * Get contractors by service type for assignment dropdowns
 */
export async function getContractorsByServiceType(
  organizationId: string,
  serviceType: string
): Promise<Contractor[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contractors')
    .select('*')
    .eq('organization_id', organizationId)
    .contains('service_types', [serviceType])
    .order('average_rating', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch contractors by service type: ${error.message}`)
  }

  return (data || []) as Contractor[]
}
