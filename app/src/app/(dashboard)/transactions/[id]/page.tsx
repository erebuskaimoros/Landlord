import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { TransactionDetailClient } from './transaction-detail-client'
import { getAllocations } from '@/services/transaction-allocations'
import type { TransactionWithRelations } from '@/services/transactions'
import type { Tables } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getOrganizationId() {
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

export default async function TransactionDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const organizationId = await getOrganizationId()

  const { data: transaction, error } = await supabase
    .from('transactions')
    .select('*, category:transaction_categories(*), tenant:tenants(*), unit:units(*)')
    .eq('id', id)
    .single()

  if (error || !transaction) {
    notFound()
  }

  // Fetch categories, units, and tenants for edit form
  const { data: categoriesData } = await supabase
    .from('transaction_categories')
    .select('*')
    .or(`organization_id.eq.${organizationId!},is_system_default.eq.true`)
    .order('type')
    .order('name')

  const categories = (categoriesData || []) as Tables<'transaction_categories'>[]

  const { data: unitsData } = await supabase
    .from('units')
    .select('*')
    .eq('organization_id', organizationId!)
    .order('address')

  const units = (unitsData || []) as Tables<'units'>[]

  const { data: tenantsData } = await supabase
    .from('tenants')
    .select('*')
    .eq('organization_id', organizationId!)
    .order('last_name')

  const tenants = (tenantsData || []) as Tables<'tenants'>[]

  // Fetch allocations for the transaction
  const allocations = await getAllocations(id)

  return (
    <TransactionDetailClient
      transaction={transaction as TransactionWithRelations}
      categories={categories}
      units={units}
      tenants={tenants}
      allocations={allocations}
    />
  )
}
