'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { transactionFullSchema, transactionUpdateSchema } from '@/lib/validations/transaction'
import { transactionAllocationsSchema } from '@/lib/validations/transaction-allocation'
import { upsertAllocations, validateAllocationsSum, type AllocationInput } from '@/services/transaction-allocations'

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

function parseFormDataForTransaction(formData: FormData) {
  const actualAmountRaw = formData.get('actual_amount')
  const expectedAmountRaw = formData.get('expected_amount')

  return {
    type: formData.get('type') as string,
    description: formData.get('description') as string,
    transaction_date: formData.get('transaction_date') as string,
    actual_amount: actualAmountRaw ? parseFloat(actualAmountRaw as string) : 0,
    expected_amount: expectedAmountRaw ? parseFloat(expectedAmountRaw as string) : null,
    category_id: formData.get('category_id') || null,
    unit_id: formData.get('unit_id') || null,
    tenant_id: formData.get('tenant_id') || null,
    notes: formData.get('notes') || null,
  }
}

export async function createTransactionAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const rawData = parseFormDataForTransaction(formData)

  const result = transactionFullSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      organization_id: organizationId,
      ...result.data,
    } as never)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/transactions')
  return { success: true, data }
}

export async function updateTransactionAction(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const rawData = parseFormDataForTransaction(formData)

  const result = transactionUpdateSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' }
  }

  const { data, error } = await supabase
    .from('transactions')
    .update(result.data as never)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/transactions')
  revalidatePath(`/transactions/${id}`)
  return { success: true, data }
}

export async function deleteTransactionAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/transactions')
  return { success: true }
}

export async function saveTransactionAllocationsAction(
  transactionId: string,
  allocations: AllocationInput[],
  transactionAmount: number
): Promise<ActionResult> {
  const supabase = await createClient()

  const organizationId = await getUserOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'No organization found' }
  }

  // Verify transaction belongs to organization
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .select('id')
    .eq('id', transactionId)
    .eq('organization_id', organizationId)
    .single()

  if (txError || !transaction) {
    return { success: false, error: 'Transaction not found' }
  }

  // Validate schema
  const schemaResult = transactionAllocationsSchema.safeParse(allocations)
  if (!schemaResult.success) {
    return { success: false, error: schemaResult.error.issues[0]?.message || 'Validation failed' }
  }

  // Validate sum
  const sumValidation = validateAllocationsSum(allocations, transactionAmount)
  if (!sumValidation.valid) {
    return { success: false, error: sumValidation.error }
  }

  try {
    await upsertAllocations(transactionId, allocations)
    revalidatePath(`/transactions/${transactionId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save allocations' }
  }
}
