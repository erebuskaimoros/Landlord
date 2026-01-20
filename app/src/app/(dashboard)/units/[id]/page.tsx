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

type TaskWithContractor = Tables<'tasks'> & {
  contractor: Tables<'contractors'> | null
}

type AssetWithUnit = Tables<'assets'>

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

  // Fetch related data in parallel: building (if any), active lease with tenant, photos, tasks, contractors, assets, tenants count
  const [buildingResult, leaseResult, photosResult, tasksResult, contractorsResult, assetsResult, tenantsCountResult] = await Promise.all([
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
    supabase
      .from('photos')
      .select('*')
      .eq('unit_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('*, contractor:contractors(*)')
      .eq('unit_id', id)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false }),
    supabase
      .from('contractors')
      .select('*')
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('assets')
      .select('*')
      .eq('unit_id', id)
      .order('name'),
    supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true }),
  ])

  const building = buildingResult.data as Tables<'buildings'> | null
  const activeLease = leaseResult.data as LeaseWithTenant | null
  const photos = (photosResult.data || []) as Tables<'photos'>[]
  const tasks = (tasksResult.data || []) as TaskWithContractor[]
  const contractors = (contractorsResult.data || []) as Tables<'contractors'>[]
  const assets = (assetsResult.data || []) as AssetWithUnit[]
  const hasTenants = (tenantsCountResult.count ?? 0) > 0

  // Generate signed URLs for photos
  const photoUrls: Record<string, string> = {}
  for (const photo of photos) {
    if (photo.file_path) {
      const { data } = await supabase.storage
        .from('unit-photos')
        .createSignedUrl(photo.file_path, 3600)
      if (data?.signedUrl) {
        photoUrls[photo.id] = data.signedUrl
      }
    }
  }

  return (
    <UnitDetailClient
      unit={typedUnit}
      building={building}
      activeLease={activeLease}
      photos={photos}
      photoUrls={photoUrls}
      tasks={tasks}
      contractors={contractors}
      assets={assets}
      hasTenants={hasTenants}
    />
  )
}
