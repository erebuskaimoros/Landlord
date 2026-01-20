import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ContractorsClient } from './contractors-client'
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

export default async function ContractorsPage() {
  const supabase = await createClient()
  const organizationId = await getOrganizationId()

  if (!organizationId) {
    redirect('/login')
  }

  // Fetch contractors
  const { data: contractorsData } = await supabase
    .from('contractors')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })

  const contractors = (contractorsData || []) as Tables<'contractors'>[]

  return <ContractorsClient contractors={contractors} />
}
