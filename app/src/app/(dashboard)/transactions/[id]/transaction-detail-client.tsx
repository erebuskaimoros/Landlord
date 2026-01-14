'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Pencil, Trash2, DollarSign, Calendar, Tag, Home, User, ArrowUpRight, ArrowDownRight, Split } from 'lucide-react'
import { TransactionForm } from '@/components/forms/transaction-form'
import { TransactionAllocationsEditor } from '@/components/transactions/transaction-allocations-editor'
import { deleteTransactionAction, saveTransactionAllocationsAction } from '@/app/(dashboard)/transactions/actions'
import { toast } from 'sonner'
import type { Tables } from '@/types/database'
import type { TransactionWithRelations } from '@/services/transactions'
import type { TransactionAllocationWithUnit, AllocationInput } from '@/services/transaction-allocations'

interface TransactionDetailClientProps {
  transaction: TransactionWithRelations
  categories: Tables<'transaction_categories'>[]
  units: Tables<'units'>[]
  tenants: Tables<'tenants'>[]
  allocations: TransactionAllocationWithUnit[]
}

function TypeBadge({ type }: { type: 'income' | 'expense' }) {
  if (type === 'income') {
    return (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <ArrowUpRight className="mr-1 h-3 w-3" />
        Income
      </Badge>
    )
  }
  return (
    <Badge variant="default" className="bg-red-100 text-red-800">
      <ArrowDownRight className="mr-1 h-3 w-3" />
      Expense
    </Badge>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function TransactionDetailClient({
  transaction,
  categories,
  units,
  tenants,
  allocations,
}: TransactionDetailClientProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSavingAllocations, setIsSavingAllocations] = useState(false)
  const [pendingAllocations, setPendingAllocations] = useState<AllocationInput[]>(
    allocations.map((a) => ({ unit_id: a.unit_id, amount: a.amount, percentage: a.percentage }))
  )
  const router = useRouter()

  async function handleSaveAllocations() {
    setIsSavingAllocations(true)
    try {
      const result = await saveTransactionAllocationsAction(
        transaction.id,
        pendingAllocations,
        transaction.actual_amount
      )
      if (result.success) {
        toast.success('Allocations saved')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to save allocations')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsSavingAllocations(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteTransactionAction(transaction.id)
      if (result.success) {
        toast.success('Transaction deleted')
        router.push('/transactions')
      } else {
        toast.error(result.error || 'Failed to delete transaction')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/transactions" className="hover:text-gray-700 flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Transactions
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <DollarSign className="h-6 w-6" />
            {transaction.description}
          </h1>
          <div className="flex items-center gap-3">
            <TypeBadge type={transaction.type} />
            <span className={`text-lg font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.actual_amount)}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Transaction Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Transaction Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Amount</label>
                <p className={`mt-1 text-lg font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(transaction.actual_amount)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Date</label>
                <p className="mt-1">{formatDate(transaction.transaction_date)}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="mt-1">{transaction.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transaction.category ? (
              <div>
                <p className="font-medium">{transaction.category.name}</p>
                {transaction.category.schedule_e_line && (
                  <p className="text-sm text-gray-500 mt-1">
                    Schedule E: {transaction.category.schedule_e_line}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No category assigned</p>
            )}
          </CardContent>
        </Card>

        {/* Linked Unit */}
        {transaction.unit && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Unit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/units/${transaction.unit.id}`}
                className="text-blue-600 hover:underline font-medium"
              >
                {transaction.unit.address}
                {transaction.unit.unit_number && ` #${transaction.unit.unit_number}`}
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Linked Tenant */}
        {transaction.tenant && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Tenant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/tenants/${transaction.tenant.id}`}
                className="text-blue-600 hover:underline font-medium"
              >
                {transaction.tenant.first_name} {transaction.tenant.last_name}
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {transaction.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700">{transaction.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Record Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="font-medium text-gray-500">Created</dt>
                <dd className="mt-1">
                  {new Date(transaction.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1">
                  {new Date(transaction.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Allocations Section (for expenses only) */}
      {transaction.type === 'expense' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Split className="h-5 w-5" />
              Unit Allocations
            </CardTitle>
            {pendingAllocations.length > 0 && (
              <Button
                size="sm"
                onClick={handleSaveAllocations}
                disabled={isSavingAllocations}
              >
                {isSavingAllocations ? 'Saving...' : 'Save Allocations'}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {allocations.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-sm font-medium text-gray-500">Current allocations:</p>
                <div className="divide-y">
                  {allocations.map((allocation) => (
                    <div key={allocation.id} className="py-2 flex justify-between items-center">
                      <Link
                        href={`/units/${allocation.unit.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {allocation.unit.address}
                        {allocation.unit.unit_number && ` #${allocation.unit.unit_number}`}
                      </Link>
                      <span className="font-medium">
                        {formatCurrency(allocation.amount)}
                        {allocation.percentage && (
                          <span className="text-gray-500 text-sm ml-2">
                            ({allocation.percentage.toFixed(1)}%)
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <TransactionAllocationsEditor
              units={units}
              totalAmount={transaction.actual_amount}
              initialAllocations={pendingAllocations}
              onChange={setPendingAllocations}
            />
          </CardContent>
        </Card>
      )}

      <TransactionForm
        open={editOpen}
        onOpenChange={setEditOpen}
        transaction={transaction}
        categories={categories}
        units={units}
        tenants={tenants}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
