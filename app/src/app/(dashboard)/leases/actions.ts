'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { leaseFullSchema, leaseUpdateSchema } from '@/lib/validations/lease'
import { deleteLeaseDocument as deleteDocument } from '@/services/lease-documents'

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

/**
 * Sync unit status based on active leases
 * If there's at least one active lease → occupied
 * If no active leases → vacant
 */
async function syncUnitStatus(unitId: string): Promise<void> {
  const supabase = await createClient()

  // Count active leases for this unit
  const { count } = await supabase
    .from('leases')
    .select('*', { count: 'exact', head: true })
    .eq('unit_id', unitId)
    .eq('status', 'active')

  const newStatus = (count && count > 0) ? 'occupied' : 'vacant'

  await supabase
    .from('units')
    .update({ status: newStatus } as never)
    .eq('id', unitId)

  revalidatePath('/units')
  revalidatePath(`/units/${unitId}`)
}

/**
 * Create a timeline event for lease-related activities
 */
async function createLeaseTimelineEvent(
  tenantId: string,
  eventType: 'lease_signed' | 'move_in' | 'move_out' | 'renewal',
  title: string,
  eventDate: string,
  userId: string
): Promise<void> {
  const supabase = await createClient()

  await supabase.from('tenant_timeline_events').insert({
    tenant_id: tenantId,
    event_type: eventType,
    title,
    event_date: eventDate,
    created_by: userId,
  } as never)

  revalidatePath(`/tenants/${tenantId}`)
}

function parseFormDataForLease(formData: FormData) {
  const securityDepositRaw = formData.get('security_deposit')
  const rentAmountRaw = formData.get('rent_amount')

  return {
    tenant_id: formData.get('tenant_id') as string,
    unit_id: formData.get('unit_id') as string,
    start_date: formData.get('start_date') as string,
    end_date: formData.get('end_date') || null,
    rent_amount: rentAmountRaw ? parseFloat(rentAmountRaw as string) : 0,
    security_deposit: securityDepositRaw ? parseFloat(securityDepositRaw as string) : null,
    deposit_returned_date: formData.get('deposit_returned_date') || null,
    terms: formData.get('terms') || null,
    status: (formData.get('status') as string) || 'draft',
    notes: formData.get('notes') || null,
  }
}

export async function createLeaseAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const rawData = parseFormDataForLease(formData)

  const result = leaseFullSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  const { data, error } = await supabase
    .from('leases')
    .insert({
      organization_id: organizationId,
      ...result.data,
    } as never)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Sync unit status based on lease
  const leaseData = data as { unit_id: string; tenant_id: string; status: string; start_date: string }
  await syncUnitStatus(leaseData.unit_id)

  // Create timeline event for lease
  const { data: { user } } = await supabase.auth.getUser()
  if (user && leaseData.status === 'active') {
    await createLeaseTimelineEvent(
      leaseData.tenant_id,
      'lease_signed',
      'Lease signed and activated',
      leaseData.start_date,
      user.id
    )
  }

  revalidatePath('/leases')
  return { success: true, data }
}

export async function updateLeaseAction(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  // Get old lease to track unit changes
  const { data: oldLease } = await supabase
    .from('leases')
    .select('unit_id')
    .eq('id', id)
    .single()
  const oldUnitId = (oldLease as { unit_id: string } | null)?.unit_id

  const rawData = parseFormDataForLease(formData)

  const result = leaseUpdateSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  const { data, error } = await supabase
    .from('leases')
    .update(result.data as never)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Sync unit status - handle both old and new units if changed
  const newUnitId = (data as { unit_id: string }).unit_id
  await syncUnitStatus(newUnitId)
  if (oldUnitId && oldUnitId !== newUnitId) {
    await syncUnitStatus(oldUnitId)
  }

  revalidatePath('/leases')
  revalidatePath(`/leases/${id}`)
  return { success: true, data }
}

export async function deleteLeaseAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  // Get unit_id before deletion
  const { data: lease } = await supabase
    .from('leases')
    .select('unit_id')
    .eq('id', id)
    .single()
  const unitId = (lease as { unit_id: string } | null)?.unit_id

  const { error } = await supabase
    .from('leases')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Sync unit status after deletion
  if (unitId) {
    await syncUnitStatus(unitId)
  }

  revalidatePath('/leases')
  return { success: true }
}

export async function deleteLeaseDocumentAction(
  documentId: string,
  leaseId: string
): Promise<ActionResult> {
  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const supabase = await createClient()

  // Verify lease belongs to organization
  const { data: lease, error: leaseError } = await supabase
    .from('leases')
    .select('id')
    .eq('id', leaseId)
    .eq('organization_id', organizationId)
    .single()

  if (leaseError || !lease) {
    return { success: false, error: 'Lease not found' }
  }

  try {
    await deleteDocument(documentId)
    revalidatePath(`/leases/${leaseId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete document' }
  }
}
