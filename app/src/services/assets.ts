import { createClient } from '@/lib/supabase/server'
import type { Tables, InsertTables, UpdateTables } from '@/types/database'

export type Asset = Tables<'assets'>
export type AssetInsert = InsertTables<'assets'>
export type AssetUpdate = UpdateTables<'assets'>

export type AssetWithUnit = Asset & {
  unit: Tables<'units'> | null
}

export interface AssetsListParams {
  organizationId: string
  unitId?: string
  assetType?: string
  condition?: Asset['condition']
  search?: string
  warrantyExpiring?: boolean
  limit?: number
  offset?: number
}

export interface AssetsListResult {
  assets: AssetWithUnit[]
  count: number
}

/**
 * Get all assets for an organization with optional filtering
 */
export async function getAssets(params: AssetsListParams): Promise<AssetsListResult> {
  const supabase = await createClient()
  const {
    organizationId,
    unitId,
    assetType,
    condition,
    search,
    warrantyExpiring,
    limit = 50,
    offset = 0
  } = params

  let query = supabase
    .from('assets')
    .select('*, unit:units(*)', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })

  if (unitId) {
    query = query.eq('unit_id', unitId)
  }

  if (assetType) {
    query = query.eq('asset_type', assetType)
  }

  if (condition) {
    query = query.eq('condition', condition)
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,make.ilike.%${search}%,model.ilike.%${search}%,serial_number.ilike.%${search}%`)
  }

  if (warrantyExpiring) {
    // Get assets with warranty expiring in next 30 days
    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    query = query
      .gte('warranty_expiry', today)
      .lte('warranty_expiry', thirtyDaysFromNow)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch assets: ${error.message}`)
  }

  return {
    assets: (data || []) as AssetWithUnit[],
    count: count || 0,
  }
}

/**
 * Get assets for a specific unit
 */
export async function getAssetsByUnit(unitId: string): Promise<Asset[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('unit_id', unitId)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch assets for unit: ${error.message}`)
  }

  return (data || []) as Asset[]
}

/**
 * Get a single asset by ID
 */
export async function getAsset(id: string): Promise<AssetWithUnit | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('assets')
    .select('*, unit:units(*)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch asset: ${error.message}`)
  }

  return data as AssetWithUnit
}

/**
 * Create a new asset
 */
export async function createAsset(asset: AssetInsert): Promise<Asset> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('assets')
    .insert(asset as never)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create asset: ${error.message}`)
  }

  return data as Asset
}

/**
 * Update an existing asset
 */
export async function updateAsset(id: string, updates: AssetUpdate): Promise<Asset> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('assets')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update asset: ${error.message}`)
  }

  return data as Asset
}

/**
 * Delete an asset
 */
export async function deleteAsset(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete asset: ${error.message}`)
  }
}

/**
 * Get asset counts and stats for dashboard
 */
export async function getAssetStats(organizationId: string): Promise<{
  total: number
  byCondition: Record<string, number>
  warrantyExpiringSoon: number
}> {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [totalResult, warrantyResult] = await Promise.all([
    supabase
      .from('assets')
      .select('condition', { count: 'exact' })
      .eq('organization_id', organizationId),
    supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('warranty_expiry', today)
      .lte('warranty_expiry', thirtyDaysFromNow),
  ])

  // Count by condition
  const byCondition: Record<string, number> = {
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
  }

  if (totalResult.data) {
    const assets = totalResult.data as { condition: string }[]
    for (const asset of assets) {
      const condition = asset.condition
      if (condition in byCondition) {
        byCondition[condition]++
      }
    }
  }

  return {
    total: totalResult.count || 0,
    byCondition,
    warrantyExpiringSoon: warrantyResult.count || 0,
  }
}

/**
 * Get distinct asset types for filtering
 */
export async function getAssetTypes(organizationId: string): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('assets')
    .select('asset_type')
    .eq('organization_id', organizationId)

  if (error) {
    throw new Error(`Failed to fetch asset types: ${error.message}`)
  }

  // Get unique types
  const types = new Set<string>()
  const items = (data || []) as { asset_type: string }[]
  for (const item of items) {
    if (item.asset_type) {
      types.add(item.asset_type)
    }
  }

  return Array.from(types).sort()
}
