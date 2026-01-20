'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { contractorFullSchema, contractorUpdateSchema } from '@/lib/validations/contractor'

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

function parseFormDataForContractor(formData: FormData) {
  const serviceTypesRaw = formData.get('service_types')
  let serviceTypes: string[] = []
  if (serviceTypesRaw) {
    try {
      serviceTypes = JSON.parse(serviceTypesRaw as string)
    } catch {
      serviceTypes = []
    }
  }

  return {
    name: formData.get('name') as string,
    email: formData.get('email') || null,
    phone: formData.get('phone') || null,
    address: formData.get('address') || null,
    service_types: serviceTypes,
    hourly_rate: formData.get('hourly_rate') || null,
    notes: formData.get('notes') || null,
  }
}

export async function createContractorAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const rawData = parseFormDataForContractor(formData)

  const result = contractorFullSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  // Clean up empty email to null
  const cleanedData = {
    ...result.data,
    email: result.data.email === '' ? null : result.data.email,
  }

  const { data, error } = await supabase
    .from('contractors')
    .insert({
      organization_id: organizationId,
      ...cleanedData,
    } as never)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/contractors')
  return { success: true, data }
}

export async function updateContractorAction(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const rawData = parseFormDataForContractor(formData)

  const result = contractorUpdateSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  // Clean up empty email to null
  const cleanedData = {
    ...result.data,
    email: result.data.email === '' ? null : result.data.email,
  }

  const { data, error } = await supabase
    .from('contractors')
    .update(cleanedData as never)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/contractors')
  revalidatePath(`/contractors/${id}`)
  return { success: true, data }
}

export async function deleteContractorAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const { error } = await supabase
    .from('contractors')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/contractors')
  return { success: true }
}
