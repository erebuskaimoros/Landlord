import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TenantsClient } from './tenants-client'
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

export default async function TenantsPage() {
  const supabase = await createClient()
  const organizationId = await getOrganizationId()

  if (!organizationId) {
    redirect('/login')
  }

  // Fetch tenants
  const { data: tenantsData } = await supabase
    .from('tenants')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  const tenants = (tenantsData || []) as Tables<'tenants'>[]

  return <TenantsClient tenants={tenants} />
}
