import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { TenantDetailClient } from './tenant-detail-client'
import type { Tables } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

type LeaseWithUnit = Tables<'leases'> & {
  unit: Tables<'units'> | null
}

export default async function TenantDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch tenant first
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !tenant) {
    notFound()
  }

  // Fetch timeline events and leases in parallel
  const [eventsResult, leasesResult] = await Promise.all([
    supabase
      .from('tenant_timeline_events')
      .select('*')
      .eq('tenant_id', id)
      .order('event_date', { ascending: false }),
    supabase
      .from('leases')
      .select('*, unit:units(*)')
      .eq('tenant_id', id)
      .order('start_date', { ascending: false }),
  ])

  const timelineEvents = (eventsResult.data || []) as Tables<'tenant_timeline_events'>[]
  const leases = (leasesResult.data || []) as LeaseWithUnit[]

  return (
    <TenantDetailClient
      tenant={tenant as Tables<'tenants'>}
      timelineEvents={timelineEvents}
      leases={leases}
    />
  )
}
