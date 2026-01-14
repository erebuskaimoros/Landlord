import { createClient } from '@/lib/supabase/server'
import type { Tables, InsertTables, UpdateTables } from '@/types/database'

export type Lease = Tables<'leases'>
export type LeaseInsert = InsertTables<'leases'>
export type LeaseUpdate = UpdateTables<'leases'>

// Extended lease with related data
export interface LeaseWithRelations extends Lease {
  tenant?: Tables<'tenants'> | null
  unit?: Tables<'units'> | null
}

export interface LeasesListParams {
  organizationId: string
  status?: Lease['status']
  unitId?: string
  tenantId?: string
  search?: string
  limit?: number
  offset?: number
}

export interface LeasesListResult {
  leases: LeaseWithRelations[]
  count: number
}

/**
 * Get all leases for an organization with optional filtering
 */
export async function getLeases(params: LeasesListParams): Promise<LeasesListResult> {
  const supabase = await createClient()
  const { organizationId, status, unitId, tenantId, limit = 50, offset = 0 } = params

  let query = supabase
    .from('leases')
    .select('*, tenant:tenants(*), unit:units(*)', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (unitId) {
    query = query.eq('unit_id', unitId)
  }

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch leases: ${error.message}`)
  }

  return {
    leases: (data || []) as LeaseWithRelations[],
    count: count || 0,
  }
}

/**
 * Get a single lease by ID with relations
 */
export async function getLease(id: string): Promise<LeaseWithRelations | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leases')
    .select('*, tenant:tenants(*), unit:units(*)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch lease: ${error.message}`)
  }

  return data as LeaseWithRelations
}

/**
 * Create a new lease
 */
export async function createLease(lease: LeaseInsert): Promise<Lease> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leases')
    .insert(lease as never)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create lease: ${error.message}`)
  }

  return data as Lease
}

/**
 * Update an existing lease
 */
export async function updateLease(id: string, updates: LeaseUpdate): Promise<Lease> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leases')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update lease: ${error.message}`)
  }

  return data as Lease
}

/**
 * Delete a lease
 */
export async function deleteLease(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leases')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete lease: ${error.message}`)
  }
}

/**
 * Get lease counts by status for an organization
 */
export async function getLeaseStatusCounts(organizationId: string): Promise<Record<string, number>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leases')
    .select('status')
    .eq('organization_id', organizationId)

  if (error) {
    throw new Error(`Failed to fetch lease counts: ${error.message}`)
  }

  const counts: Record<string, number> = {
    draft: 0,
    active: 0,
    expired: 0,
    terminated: 0,
    total: 0,
  }

  const leases = (data || []) as { status: Lease['status'] }[]
  for (const lease of leases) {
    counts[lease.status]++
    counts.total++
  }

  return counts
}
