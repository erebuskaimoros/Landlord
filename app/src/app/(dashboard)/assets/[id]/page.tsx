import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { AssetDetailClient } from './asset-detail-client'
import type { Tables } from '@/types/database'

interface AssetPageProps {
  params: Promise<{ id: string }>
}

type MaintenanceLogWithContractor = Tables<'asset_maintenance_logs'> & {
  contractor: Tables<'contractors'> | null
}

async function getOrganizationId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const membershipData = membership as { organization_id: string } | null
  return membershipData?.organization_id || null
}

export default async function AssetPage({ params }: AssetPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const organizationId = await getOrganizationId()

  if (!organizationId) {
    redirect('/login')
  }

  // Fetch asset with unit info
  const { data: assetData, error } = await supabase
    .from('assets')
    .select('*, unit:units(*)')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (error || !assetData) {
    notFound()
  }

  const asset = assetData as Tables<'assets'> & { unit: Tables<'units'> | null }

  // Fetch units, contractors, and maintenance logs in parallel
  const [unitsResult, contractorsResult, maintenanceLogsResult] = await Promise.all([
    supabase
      .from('units')
      .select('*')
      .eq('organization_id', organizationId)
      .neq('status', 'sold')
      .order('address', { ascending: true }),
    supabase
      .from('contractors')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true }),
    supabase
      .from('asset_maintenance_logs')
      .select('*, contractor:contractors(*)')
      .eq('asset_id', id)
      .order('service_date', { ascending: false }),
  ])

  const units = (unitsResult.data || []) as Tables<'units'>[]
  const contractors = (contractorsResult.data || []) as Tables<'contractors'>[]
  const maintenanceLogs = (maintenanceLogsResult.data || []) as MaintenanceLogWithContractor[]

  return (
    <AssetDetailClient
      asset={asset}
      units={units}
      contractors={contractors}
      maintenanceLogs={maintenanceLogs}
    />
  )
}
