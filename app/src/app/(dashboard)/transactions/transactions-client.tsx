'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react'
import { TransactionForm } from '@/components/forms/transaction-form'
import { TransactionsTable } from '@/components/tables/transactions-table'
import { useUserRole } from '@/hooks/useUserRole'
import type { Tables } from '@/types/database'
import type { TransactionWithRelations } from '@/services/transactions'

interface TransactionsClientProps {
  transactions: TransactionWithRelations[]
  categories: Tables<'transaction_categories'>[]
  units: Tables<'units'>[]
  tenants: Tables<'tenants'>[]
  totals: { income: number; expense: number; net: number }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function TransactionsClient({
  transactions,
  categories,
  units,
  tenants,
  totals,
}: TransactionsClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const { canEdit } = useUserRole()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500">
            {transactions.length > 0
              ? `${transactions.length} transaction${transactions.length === 1 ? '' : 's'}`
              : 'Track income and expenses'}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      {transactions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totals.income)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totals.expense)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Income</CardTitle>
              <TrendingUp className={`h-4 w-4 ${totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totals.net)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {transactions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No transactions yet</CardTitle>
            <CardDescription>
              {canEdit
                ? 'Record income and expenses for your properties'
                : 'No transactions have been recorded yet'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Track rent payments, maintenance costs, and other financial activity with IRS Schedule E compatible categories.
            </p>
            {canEdit && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Transaction
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <TransactionsTable
          transactions={transactions}
          categories={categories}
          units={units}
          tenants={tenants}
        />
      )}

      {canEdit && (
        <TransactionForm
          open={formOpen}
          onOpenChange={setFormOpen}
          categories={categories}
          units={units}
          tenants={tenants}
        />
      )}
    </div>
  )
}
