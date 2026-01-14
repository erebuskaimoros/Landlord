import { createClient } from '@/lib/supabase/server'
import type { Tables, InsertTables, UpdateTables } from '@/types/database'

export type Tenant = Tables<'tenants'>
export type TenantInsert = InsertTables<'tenants'>
export type TenantUpdate = UpdateTables<'tenants'>

export interface TenantsListParams {
  organizationId: string
  search?: string
  limit?: number
  offset?: number
}

export interface TenantsListResult {
  tenants: Tenant[]
  count: number
}

/**
 * Get all tenants for an organization with optional filtering
 */
export async function getTenants(params: TenantsListParams): Promise<TenantsListResult> {
  const supabase = await createClient()
  const { organizationId, search, limit = 50, offset = 0 } = params

  let query = supabase
    .from('tenants')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch tenants: ${error.message}`)
  }

  return {
    tenants: data || [],
    count: count || 0,
  }
}

/**
 * Get a single tenant by ID
 */
export async function getTenant(id: string): Promise<Tenant | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch tenant: ${error.message}`)
  }

  return data
}

/**
 * Create a new tenant
 */
export async function createTenant(tenant: TenantInsert): Promise<Tenant> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenants')
    .insert(tenant as never)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create tenant: ${error.message}`)
  }

  return data as Tenant
}

/**
 * Update an existing tenant
 */
export async function updateTenant(id: string, updates: TenantUpdate): Promise<Tenant> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenants')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update tenant: ${error.message}`)
  }

  return data as Tenant
}

/**
 * Delete a tenant
 */
export async function deleteTenant(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete tenant: ${error.message}`)
  }
}
