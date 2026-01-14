import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BuildingDetailClient } from './building-detail-client'
import { getAllocationsMap } from '@/services/building-allocations'
import type { Tables } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BuildingDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch building first
  const { data: building, error } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !building) {
    notFound()
  }

  // Fetch units and allocations in parallel
  const [unitsResult, allocationsMap] = await Promise.all([
    supabase
      .from('units')
      .select('*')
      .eq('building_id', id)
      .order('address', { ascending: true }),
    getAllocationsMap(id),
  ])

  const units = (unitsResult.data || []) as Tables<'units'>[]

  // Convert Map to serializable object for client component
  const allocations: Record<string, number> = {}
  allocationsMap.forEach((value, key) => {
    allocations[key] = value
  })

  return (
    <BuildingDetailClient
      building={building as Tables<'buildings'>}
      units={units}
      allocations={allocations}
    />
  )
}
