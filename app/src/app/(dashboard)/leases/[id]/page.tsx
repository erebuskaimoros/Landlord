import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { LeaseDetailClient } from './lease-detail-client'
import { getLeaseDocuments } from '@/services/lease-documents'
import type { LeaseWithRelations } from '@/services/leases'
import type { Tables } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
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

export default async function LeaseDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const organizationId = await getOrganizationId()

  const { data: lease, error } = await supabase
    .from('leases')
    .select('*, tenant:tenants(*), unit:units(*)')
    .eq('id', id)
    .single()

  if (error || !lease) {
    notFound()
  }

  // Fetch units and tenants for edit form
  const { data: unitsData } = await supabase
    .from('units')
    .select('*')
    .eq('organization_id', organizationId!)
    .order('address')

  const units = (unitsData || []) as Tables<'units'>[]

  const { data: tenantsData } = await supabase
    .from('tenants')
    .select('*')
    .eq('organization_id', organizationId!)
    .order('last_name')

  const tenants = (tenantsData || []) as Tables<'tenants'>[]

  // Fetch documents for this lease
  const documents = await getLeaseDocuments(id)

  return (
    <LeaseDetailClient
      lease={lease as LeaseWithRelations}
      units={units}
      tenants={tenants}
      documents={documents}
    />
  )
}
