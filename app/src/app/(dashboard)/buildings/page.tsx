import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BuildingsClient } from './buildings-client'
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

export default async function BuildingsPage() {
  const supabase = await createClient()
  const organizationId = await getOrganizationId()

  if (!organizationId) {
    redirect('/login')
  }

  // Fetch buildings
  const { data: buildingsData } = await supabase
    .from('buildings')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  const buildings = (buildingsData || []) as Tables<'buildings'>[]

  return <BuildingsClient buildings={buildings} />
}
