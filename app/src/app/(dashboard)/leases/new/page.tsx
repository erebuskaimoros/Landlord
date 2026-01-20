import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewLeaseClient } from './new-lease-client'
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

interface PageProps {
  searchParams: Promise<{ unit?: string }>
}

export default async function NewLeasePage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const organizationId = await getOrganizationId()

  if (!organizationId) {
    redirect('/login')
  }

  const params = await searchParams
  const unitId = params.unit

  // Fetch units for the form
  const { data: unitsData } = await supabase
    .from('units')
    .select('*')
    .eq('organization_id', organizationId)
    .order('address')

  const units = (unitsData || []) as Tables<'units'>[]

  // Fetch tenants for the form
  const { data: tenantsData } = await supabase
    .from('tenants')
    .select('*')
    .eq('organization_id', organizationId)
    .order('last_name')

  const tenants = (tenantsData || []) as Tables<'tenants'>[]

  return <NewLeaseClient units={units} tenants={tenants} defaultUnitId={unitId} />
}
