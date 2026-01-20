import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AssetsClient } from './assets-client'
import type { Tables } from '@/types/database'

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

export default async function AssetsPage() {
  const supabase = await createClient()
  const organizationId = await getOrganizationId()

  if (!organizationId) {
    redirect('/login')
  }

  // Fetch assets with unit info
  const { data: assetsData } = await supabase
    .from('assets')
    .select('*, unit:units(*)')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })

  const assets = (assetsData || []) as (Tables<'assets'> & { unit: Tables<'units'> | null })[]

  // Fetch units for the form
  const { data: unitsData } = await supabase
    .from('units')
    .select('*')
    .eq('organization_id', organizationId)
    .neq('status', 'sold')
    .order('address', { ascending: true })

  const units = (unitsData || []) as Tables<'units'>[]

  // Calculate stats
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const byCondition: Record<string, number> = {
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
  }

  let warrantyExpiringSoon = 0

  for (const asset of assets) {
    if (asset.condition in byCondition) {
      byCondition[asset.condition]++
    }
    if (asset.warranty_expiry && asset.warranty_expiry >= today && asset.warranty_expiry <= thirtyDaysFromNow) {
      warrantyExpiringSoon++
    }
  }

  const stats = {
    total: assets.length,
    byCondition,
    warrantyExpiringSoon,
  }

  return <AssetsClient assets={assets} units={units} stats={stats} />
}
