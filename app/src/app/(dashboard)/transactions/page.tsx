import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TransactionsClient } from './transactions-client'
import type { Tables } from '@/types/database'
import type { TransactionWithRelations } from '@/services/transactions'

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

export default async function TransactionsPage() {
  const supabase = await createClient()
  const organizationId = await getOrganizationId()

  if (!organizationId) {
    redirect('/login')
  }

  // Fetch transactions with relations
  const { data: transactionsData } = await supabase
    .from('transactions')
    .select('*, category:transaction_categories(*), tenant:tenants(*), unit:units(*)')
    .eq('organization_id', organizationId)
    .order('transaction_date', { ascending: false })

  const transactions = (transactionsData || []) as TransactionWithRelations[]

  // Fetch categories (org-specific and system defaults)
  const { data: categoriesData } = await supabase
    .from('transaction_categories')
    .select('*')
    .or(`organization_id.eq.${organizationId},is_system_default.eq.true`)
    .order('type')
    .order('name')

  const categories = (categoriesData || []) as Tables<'transaction_categories'>[]

  // Fetch units and tenants for the form selects
  const { data: unitsData } = await supabase
    .from('units')
    .select('*')
    .eq('organization_id', organizationId)
    .order('address')

  const units = (unitsData || []) as Tables<'units'>[]

  const { data: tenantsData } = await supabase
    .from('tenants')
    .select('*')
    .eq('organization_id', organizationId)
    .order('last_name')

  const tenants = (tenantsData || []) as Tables<'tenants'>[]

  // Calculate totals
  let totalIncome = 0
  let totalExpense = 0

  for (const tx of transactions) {
    if (tx.type === 'income') {
      totalIncome += tx.actual_amount
    } else {
      totalExpense += tx.actual_amount
    }
  }

  const totals = {
    income: totalIncome,
    expense: totalExpense,
    net: totalIncome - totalExpense,
  }

  return (
    <TransactionsClient
      transactions={transactions}
      categories={categories}
      units={units}
      tenants={tenants}
      totals={totals}
    />
  )
}
