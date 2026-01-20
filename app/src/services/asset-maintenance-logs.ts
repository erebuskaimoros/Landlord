import { createClient } from '@/lib/supabase/server'
import type { Tables, InsertTables, UpdateTables } from '@/types/database'

export type AssetMaintenanceLog = Tables<'asset_maintenance_logs'>
export type AssetMaintenanceLogInsert = InsertTables<'asset_maintenance_logs'>
export type AssetMaintenanceLogUpdate = UpdateTables<'asset_maintenance_logs'>

export type AssetMaintenanceLogWithDetails = AssetMaintenanceLog & {
  asset: Tables<'assets'> | null
  contractor: Tables<'contractors'> | null
  task: Tables<'tasks'> | null
}

export interface MaintenanceLogsListParams {
  organizationId: string
  assetId?: string
  contractorId?: string
  serviceType?: string
  limit?: number
  offset?: number
}

export interface MaintenanceLogsListResult {
  logs: AssetMaintenanceLogWithDetails[]
  count: number
}

/**
 * Get all maintenance logs with optional filtering
 */
export async function getMaintenanceLogs(
  params: MaintenanceLogsListParams
): Promise<MaintenanceLogsListResult> {
  const supabase = await createClient()
  const {
    organizationId,
    assetId,
    contractorId,
    serviceType,
    limit = 50,
    offset = 0,
  } = params

  let query = supabase
    .from('asset_maintenance_logs')
    .select('*, asset:assets(*), contractor:contractors(*), task:tasks(*)', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('service_date', { ascending: false })

  if (assetId) {
    query = query.eq('asset_id', assetId)
  }

  if (contractorId) {
    query = query.eq('contractor_id', contractorId)
  }

  if (serviceType) {
    query = query.eq('service_type', serviceType)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch maintenance logs: ${error.message}`)
  }

  return {
    logs: (data || []) as AssetMaintenanceLogWithDetails[],
    count: count || 0,
  }
}

/**
 * Get maintenance logs for a specific asset
 */
export async function getMaintenanceLogsForAsset(assetId: string): Promise<AssetMaintenanceLogWithDetails[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('asset_maintenance_logs')
    .select('*, asset:assets(*), contractor:contractors(*), task:tasks(*)')
    .eq('asset_id', assetId)
    .order('service_date', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch maintenance logs: ${error.message}`)
  }

  return (data || []) as AssetMaintenanceLogWithDetails[]
}

/**
 * Get a single maintenance log by ID
 */
export async function getMaintenanceLog(id: string): Promise<AssetMaintenanceLogWithDetails | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('asset_maintenance_logs')
    .select('*, asset:assets(*), contractor:contractors(*), task:tasks(*)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch maintenance log: ${error.message}`)
  }

  return data as AssetMaintenanceLogWithDetails
}

/**
 * Create a new maintenance log
 */
export async function createMaintenanceLog(log: AssetMaintenanceLogInsert): Promise<AssetMaintenanceLog> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('asset_maintenance_logs')
    .insert(log as never)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create maintenance log: ${error.message}`)
  }

  return data as AssetMaintenanceLog
}

/**
 * Update a maintenance log
 */
export async function updateMaintenanceLog(
  id: string,
  updates: AssetMaintenanceLogUpdate
): Promise<AssetMaintenanceLog> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('asset_maintenance_logs')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update maintenance log: ${error.message}`)
  }

  return data as AssetMaintenanceLog
}

/**
 * Delete a maintenance log
 */
export async function deleteMaintenanceLog(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('asset_maintenance_logs')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete maintenance log: ${error.message}`)
  }
}

/**
 * Get distinct service types for filtering
 */
export async function getServiceTypes(organizationId: string): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('asset_maintenance_logs')
    .select('service_type')
    .eq('organization_id', organizationId)

  if (error) {
    throw new Error(`Failed to fetch service types: ${error.message}`)
  }

  const types = new Set<string>()
  const items = (data || []) as { service_type: string }[]
  for (const item of items) {
    if (item.service_type) {
      types.add(item.service_type)
    }
  }

  return Array.from(types).sort()
}

/**
 * Get maintenance cost totals for an asset
 */
export async function getAssetMaintenanceCosts(assetId: string): Promise<{
  totalCost: number
  logCount: number
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('asset_maintenance_logs')
    .select('cost')
    .eq('asset_id', assetId)

  if (error) {
    throw new Error(`Failed to fetch maintenance costs: ${error.message}`)
  }

  let totalCost = 0
  const logs = (data || []) as { cost: number | null }[]
  for (const log of logs) {
    if (log.cost) {
      totalCost += log.cost
    }
  }

  return {
    totalCost,
    logCount: data?.length || 0,
  }
}
