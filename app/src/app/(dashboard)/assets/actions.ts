'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { assetFullSchema, assetUpdateSchema } from '@/lib/validations/asset'

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

function parseFormDataForAsset(formData: FormData) {
  return {
    name: formData.get('name') as string,
    asset_type: formData.get('asset_type') as string,
    unit_id: formData.get('unit_id') as string,
    make: formData.get('make') || null,
    model: formData.get('model') || null,
    serial_number: formData.get('serial_number') || null,
    purchase_date: formData.get('purchase_date') || null,
    purchase_price: formData.get('purchase_price') || null,
    warranty_expiry: formData.get('warranty_expiry') || null,
    expected_lifespan_years: formData.get('expected_lifespan_years') || null,
    condition: formData.get('condition') || 'good',
    notes: formData.get('notes') || null,
  }
}

export async function createAssetAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const rawData = parseFormDataForAsset(formData)

  const result = assetFullSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  const { data, error } = await supabase
    .from('assets')
    .insert({
      organization_id: organizationId,
      ...result.data,
    } as never)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/assets')
  revalidatePath('/dashboard')
  revalidatePath(`/units/${result.data.unit_id}`)
  return { success: true, data }
}

export async function updateAssetAction(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const rawData = parseFormDataForAsset(formData)

  const result = assetUpdateSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  const { data, error } = await supabase
    .from('assets')
    .update(result.data as never)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/assets')
  revalidatePath(`/assets/${id}`)
  revalidatePath('/dashboard')
  return { success: true, data }
}

export async function deleteAssetAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/assets')
  revalidatePath('/dashboard')
  return { success: true }
}
