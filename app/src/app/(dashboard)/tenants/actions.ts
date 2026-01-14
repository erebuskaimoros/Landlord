'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { tenantFullSchema, tenantUpdateSchema } from '@/lib/validations/tenant'

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

function parseFormDataForTenant(formData: FormData) {
  return {
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    email: formData.get('email') || null,
    phone: formData.get('phone') || null,
    emergency_contact_name: formData.get('emergency_contact_name') || null,
    emergency_contact_phone: formData.get('emergency_contact_phone') || null,
    emergency_contact_relationship: formData.get('emergency_contact_relationship') || null,
    notes: formData.get('notes') || null,
  }
}

export async function createTenantAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const rawData = parseFormDataForTenant(formData)

  const result = tenantFullSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  // Clean up empty email to null
  const cleanedData = {
    ...result.data,
    email: result.data.email === '' ? null : result.data.email,
  }

  const { data, error } = await supabase
    .from('tenants')
    .insert({
      organization_id: organizationId,
      ...cleanedData,
    } as never)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/tenants')
  return { success: true, data }
}

export async function updateTenantAction(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const rawData = parseFormDataForTenant(formData)

  const result = tenantUpdateSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  // Clean up empty email to null
  const cleanedData = {
    ...result.data,
    email: result.data.email === '' ? null : result.data.email,
  }

  const { data, error } = await supabase
    .from('tenants')
    .update(cleanedData as never)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/tenants')
  revalidatePath(`/tenants/${id}`)
  return { success: true, data }
}

export async function deleteTenantAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/tenants')
  return { success: true }
}
