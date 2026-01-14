import { createClient } from '@/lib/supabase/server'
import type { Tables, InsertTables, UpdateTables } from '@/types/database'

export type Transaction = Tables<'transactions'>
export type TransactionInsert = InsertTables<'transactions'>
export type TransactionUpdate = UpdateTables<'transactions'>
export type TransactionCategory = Tables<'transaction_categories'>

// Extended transaction with related data
export interface TransactionWithRelations extends Transaction {
  category?: TransactionCategory | null
  tenant?: Tables<'tenants'> | null
  unit?: Tables<'units'> | null
}

export interface TransactionsListParams {
  organizationId: string
  type?: Transaction['type']
  categoryId?: string
  unitId?: string
  tenantId?: string
  startDate?: string
  endDate?: string
  search?: string
  limit?: number
  offset?: number
}

export interface TransactionsListResult {
  transactions: TransactionWithRelations[]
  count: number
}

/**
 * Get all transactions for an organization with optional filtering
 */
export async function getTransactions(params: TransactionsListParams): Promise<TransactionsListResult> {
  const supabase = await createClient()
  const { organizationId, type, categoryId, unitId, tenantId, startDate, endDate, search, limit = 50, offset = 0 } = params

  let query = supabase
    .from('transactions')
    .select('*, category:transaction_categories(*), tenant:tenants(*), unit:units(*)', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('transaction_date', { ascending: false })

  if (type) {
    query = query.eq('type', type)
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  if (unitId) {
    query = query.eq('unit_id', unitId)
  }

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }

  if (startDate) {
    query = query.gte('transaction_date', startDate)
  }

  if (endDate) {
    query = query.lte('transaction_date', endDate)
  }

  if (search) {
    query = query.ilike('description', `%${search}%`)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`)
  }

  return {
    transactions: (data || []) as TransactionWithRelations[],
    count: count || 0,
  }
}

/**
 * Get a single transaction by ID with relations
 */
export async function getTransaction(id: string): Promise<TransactionWithRelations | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select('*, category:transaction_categories(*), tenant:tenants(*), unit:units(*)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch transaction: ${error.message}`)
  }

  return data as TransactionWithRelations
}

/**
 * Create a new transaction
 */
export async function createTransaction(transaction: TransactionInsert): Promise<Transaction> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction as never)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create transaction: ${error.message}`)
  }

  return data as Transaction
}

/**
 * Update an existing transaction
 */
export async function updateTransaction(id: string, updates: TransactionUpdate): Promise<Transaction> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update transaction: ${error.message}`)
  }

  return data as Transaction
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete transaction: ${error.message}`)
  }
}

/**
 * Get transaction categories for an organization (including system defaults)
 */
export async function getTransactionCategories(organizationId: string): Promise<TransactionCategory[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transaction_categories')
    .select('*')
    .or(`organization_id.eq.${organizationId},is_system_default.eq.true`)
    .order('type')
    .order('name')

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`)
  }

  return data || []
}

/**
 * Get transaction totals by type
 */
export async function getTransactionTotals(organizationId: string): Promise<{ income: number; expense: number; net: number }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select('type, actual_amount')
    .eq('organization_id', organizationId)

  if (error) {
    throw new Error(`Failed to fetch transaction totals: ${error.message}`)
  }

  let income = 0
  let expense = 0

  const transactions = data as { type: 'income' | 'expense'; actual_amount: number }[] | null
  for (const tx of transactions || []) {
    if (tx.type === 'income') {
      income += tx.actual_amount
    } else {
      expense += tx.actual_amount
    }
  }

  return { income, expense, net: income - expense }
}
