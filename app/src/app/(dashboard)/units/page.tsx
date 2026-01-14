import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UnitsClient } from './units-client'
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

export default async function UnitsPage() {
  const supabase = await createClient()
  const organizationId = await getOrganizationId()

  if (!organizationId) {
    redirect('/login')
  }

  // Fetch units and buildings in parallel
  const [unitsResult, buildingsResult] = await Promise.all([
    supabase
      .from('units')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false }),
    supabase
      .from('buildings')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true }),
  ])

  const units = (unitsResult.data || []) as Tables<'units'>[]
  const buildings = (buildingsResult.data || []) as Tables<'buildings'>[]

  // Calculate counts
  const counts: Record<string, number> = {
    occupied: 0,
    vacant: 0,
    sold: 0,
    total: 0,
  }

  for (const unit of units) {
    counts[unit.status]++
    counts.total++
  }

  return <UnitsClient units={units} buildings={buildings} counts={counts} />
}
