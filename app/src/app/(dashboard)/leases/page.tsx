import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LeasesClient } from './leases-client'
import type { Tables } from '@/types/database'
import type { LeaseWithRelations } from '@/services/leases'

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

export default async function LeasesPage() {
  const supabase = await createClient()
  const organizationId = await getOrganizationId()

  if (!organizationId) {
    redirect('/login')
  }

  // Fetch leases with relations
  const { data: leasesData } = await supabase
    .from('leases')
    .select('*, tenant:tenants(*), unit:units(*)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  const leases = (leasesData || []) as LeaseWithRelations[]

  // Fetch units and tenants for the form selects
  const { data: unitsData } = await supabase
    .from('units')
    .select('*')
    .eq('organization_id', organizationId)
    .order('address')

  const units = (unitsData || []) as Tables<'units'>[]

  const { data: tenantsData } = await supabase
    .from('tenants')
    .select('*')
    .eq('organization_id', organizationId)
    .order('last_name')

  const tenants = (tenantsData || []) as Tables<'tenants'>[]

  // Calculate counts
  const counts: Record<string, number> = {
    active: 0,
    draft: 0,
    expired: 0,
    terminated: 0,
    total: 0,
  }

  for (const lease of leases) {
    counts[lease.status]++
    counts.total++
  }

  return <LeasesClient leases={leases} units={units} tenants={tenants} counts={counts} />
}
