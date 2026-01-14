'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { unitFullSchema, unitUpdateSchema } from '@/lib/validations/unit'

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

function parseFormDataForUnit(formData: FormData) {
  const buildingIdRaw = formData.get('building_id')
  const bedroomsRaw = formData.get('bedrooms')
  const bathroomsRaw = formData.get('bathrooms')
  const sqftRaw = formData.get('square_footage')
  const yearBuiltRaw = formData.get('year_built')
  const rentalPriceRaw = formData.get('rental_price')
  const amenitiesRaw = formData.get('amenities')

  return {
    address: formData.get('address') as string,
    unit_number: formData.get('unit_number') || null,
    city: formData.get('city') || null,
    state: formData.get('state') || null,
    zip_code: formData.get('zip_code') || null,
    building_id: buildingIdRaw === '' ? null : buildingIdRaw || null,
    property_type: formData.get('property_type') || null,
    bedrooms: bedroomsRaw ? parseInt(bedroomsRaw as string) : null,
    bathrooms: bathroomsRaw ? parseFloat(bathroomsRaw as string) : null,
    square_footage: sqftRaw ? parseInt(sqftRaw as string) : null,
    year_built: yearBuiltRaw ? parseInt(yearBuiltRaw as string) : null,
    status: (formData.get('status') as string) || 'vacant',
    rental_price: rentalPriceRaw ? parseFloat(rentalPriceRaw as string) : null,
    listing_description: formData.get('listing_description') || null,
    pet_policy: formData.get('pet_policy') || null,
    amenities: amenitiesRaw ? JSON.parse(amenitiesRaw as string) : null,
    notes: formData.get('notes') || null,
  }
}

export async function createUnitAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const rawData = parseFormDataForUnit(formData)

  const result = unitFullSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  const { data, error } = await supabase
    .from('units')
    .insert({
      organization_id: organizationId,
      ...result.data,
    } as never)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/units')
  revalidatePath('/buildings')
  return { success: true, data }
}

export async function updateUnitAction(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const rawData = parseFormDataForUnit(formData)

  const result = unitUpdateSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  const { data, error } = await supabase
    .from('units')
    .update(result.data as never)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/units')
  revalidatePath(`/units/${id}`)
  revalidatePath('/buildings')
  return { success: true, data }
}

export async function deleteUnitAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const { error } = await supabase
    .from('units')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/units')
  return { success: true }
}
