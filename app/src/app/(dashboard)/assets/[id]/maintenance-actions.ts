'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { maintenanceLogCreateSchema } from '@/lib/validations/asset-maintenance-log'

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

function parseFormData(formData: FormData) {
  return {
    asset_id: formData.get('asset_id') as string,
    service_date: formData.get('service_date') as string,
    service_type: formData.get('service_type') as string,
    description: formData.get('description') || null,
    cost: formData.get('cost') ? parseFloat(formData.get('cost') as string) : null,
    performed_by: formData.get('performed_by') || null,
    contractor_id: formData.get('contractor_id') || null,
    notes: formData.get('notes') || null,
  }
}

export async function createMaintenanceLogAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const rawData = parseFormData(formData)

  const result = maintenanceLogCreateSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  const { data, error } = await supabase
    .from('asset_maintenance_logs')
    .insert({
      organization_id: organizationId,
      ...result.data,
    } as never)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/assets/${result.data.asset_id}`)
  return { success: true, data }
}

export async function updateMaintenanceLogAction(
  id: string,
  assetId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const rawData = parseFormData(formData)

  const result = maintenanceLogCreateSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  const { data, error } = await supabase
    .from('asset_maintenance_logs')
    .update(result.data as never)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/assets/${assetId}`)
  return { success: true, data }
}

export async function deleteMaintenanceLogAction(id: string, assetId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const { error } = await supabase
    .from('asset_maintenance_logs')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/assets/${assetId}`)
  return { success: true }
}
