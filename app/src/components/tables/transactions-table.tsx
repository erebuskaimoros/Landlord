'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, Eye, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { Tables } from '@/types/database'
import type { TransactionWithRelations } from '@/services/transactions'
import { deleteTransactionAction } from '@/app/(dashboard)/transactions/actions'
import { toast } from 'sonner'
import { TransactionForm } from '@/components/forms/transaction-form'
import { useUserRole } from '@/hooks/useUserRole'

interface TransactionsTableProps {
  transactions: TransactionWithRelations[]
  categories: Tables<'transaction_categories'>[]
  units: Tables<'units'>[]
  tenants: Tables<'tenants'>[]
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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatAmount(amount: number, type: 'income' | 'expense') {
  const formatted = `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return type === 'income' ? (
    <span className="text-green-600 font-medium">+{formatted}</span>
  ) : (
    <span className="text-red-600 font-medium">-{formatted}</span>
  )
}

function formatBalance(balance: number) {
  const formatted = `$${Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return balance >= 0 ? (
    <span className="text-green-600 font-medium">{formatted}</span>
  ) : (
    <span className="text-red-600 font-medium">-{formatted}</span>
  )
}

function calculateRunningBalances(transactions: TransactionWithRelations[]) {
  // Sort by date ascending for running balance calculation
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
  )

  let balance = 0
  const balances = new Map<string, number>()

  for (const tx of sorted) {
    if (tx.type === 'income') {
      balance += tx.actual_amount
    } else {
      balance -= tx.actual_amount
    }
    balances.set(tx.id, balance)
  }

  return balances
}

export function TransactionsTable({ transactions, categories, units, tenants }: TransactionsTableProps) {
  const [editingTransaction, setEditingTransaction] = useState<Tables<'transactions'> | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { canEdit, canDelete } = useUserRole()

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      return
    }

    setDeletingId(id)
    try {
      const result = await deleteTransactionAction(id)
      if (result.success) {
        toast.success('Transaction deleted')
      } else {
        toast.error(result.error || 'Failed to delete transaction')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setDeletingId(null)
    }
  }

  const runningBalances = calculateRunningBalances(transactions)

  if (transactions.length === 0) {
    return null
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="text-sm">{formatDate(tx.transaction_date)}</TableCell>
                <TableCell>
                  <div className="font-medium">{tx.description}</div>
                  {tx.unit && (
                    <div className="text-sm text-gray-500">
                      {tx.unit.address}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {tx.category?.name || '-'}
                </TableCell>
                <TableCell>
                  <TypeBadge type={tx.type} />
                </TableCell>
                <TableCell className="text-right">
                  {formatAmount(tx.actual_amount, tx.type)}
                </TableCell>
                <TableCell className="text-right">
                  {formatBalance(runningBalances.get(tx.id) ?? 0)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        disabled={deletingId === tx.id}
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/transactions/${tx.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      {canEdit && (
                        <DropdownMenuItem onClick={() => setEditingTransaction(tx)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(tx.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {canEdit && (
        <TransactionForm
          open={!!editingTransaction}
          onOpenChange={(open) => !open && setEditingTransaction(null)}
          transaction={editingTransaction}
          categories={categories}
          units={units}
          tenants={tenants}
        />
      )}
    </>
  )
}
