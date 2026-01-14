import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { UnitDetailClient } from './unit-detail-client'
import type { Tables } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

type LeaseWithTenant = Tables<'leases'> & {
  tenant: Tables<'tenants'> | null
}

export default async function UnitDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch unit first
  const { data: unit, error } = await supabase
    .from('units')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !unit) {
    notFound()
  }

  const typedUnit = unit as Tables<'units'>

  // Fetch related data in parallel: building (if any), active lease with tenant
  const [buildingResult, leaseResult] = await Promise.all([
    typedUnit.building_id
      ? supabase.from('buildings').select('*').eq('id', typedUnit.building_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('leases')
      .select('*, tenant:tenants(*)')
      .eq('unit_id', id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(),
  ])

  const building = buildingResult.data as Tables<'buildings'> | null
  const activeLease = leaseResult.data as LeaseWithTenant | null

  return (
    <UnitDetailClient
      unit={typedUnit}
      building={building}
      activeLease={activeLease}
    />
  )
}
