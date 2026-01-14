'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { buildingCreateSchema, buildingUpdateSchema } from '@/lib/validations/building'
import { buildingAllocationsSchema } from '@/lib/validations/building-allocation'
import { upsertAllocations, validateAllocationsSum } from '@/services/building-allocations'

export interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

async function getUserOrganizationId(): Promise<string | null> {
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

export async function createBuildingAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const rawData = {
    name: formData.get('name'),
    address: formData.get('address'),
    notes: formData.get('notes') || null,
  }

  const result = buildingCreateSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  const { data, error } = await supabase
    .from('buildings')
    .insert({
      organization_id: organizationId,
      ...result.data,
    } as never)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/buildings')
  return { success: true, data }
}

export async function updateBuildingAction(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const rawData = {
    name: formData.get('name') || undefined,
    address: formData.get('address') || undefined,
    notes: formData.get('notes') || null,
  }

  const result = buildingUpdateSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  const { data, error } = await supabase
    .from('buildings')
    .update(result.data as never)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/buildings')
  revalidatePath(`/buildings/${id}`)
  return { success: true, data }
}

export async function deleteBuildingAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const { error } = await supabase
    .from('buildings')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/buildings')
  return { success: true }
}

export async function saveAllocationsAction(
  buildingId: string,
  allocations: { unit_id: string; allocation_percentage: number }[]
): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  // Validate the building belongs to the organization
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id')
    .eq('id', buildingId)
    .eq('organization_id', organizationId)
    .single()

  if (buildingError || !building) {
    return { success: false, error: 'Building not found' }
  }

  // Validate allocations sum
  const validation = validateAllocationsSum(allocations)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  // Validate schema
  const schemaResult = buildingAllocationsSchema.safeParse(allocations)
  if (!schemaResult.success) {
    return { success: false, error: schemaResult.error.issues[0]?.message || 'Validation failed' }
  }

  try {
    await upsertAllocations(buildingId, allocations)
    revalidatePath(`/buildings/${buildingId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save allocations' }
  }
}
