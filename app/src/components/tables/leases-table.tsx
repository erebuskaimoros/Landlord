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
import { MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react'
import type { Tables } from '@/types/database'
import type { LeaseWithRelations } from '@/services/leases'
import { deleteLeaseAction } from '@/app/(dashboard)/leases/actions'
import { toast } from 'sonner'
import { LeaseForm } from '@/components/forms/lease-form'
import { useUserRole } from '@/hooks/useUserRole'

interface LeasesTableProps {
  leases: LeaseWithRelations[]
  units: Tables<'units'>[]
  tenants: Tables<'tenants'>[]
}

function StatusBadge({ status }: { status: Tables<'leases'>['status'] }) {
  const variants: Record<Tables<'leases'>['status'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
    active: 'default',
    draft: 'secondary',
    expired: 'outline',
    terminated: 'destructive',
  }

  const labels: Record<Tables<'leases'>['status'], string> = {
    active: 'Active',
    draft: 'Draft',
    expired: 'Expired',
    terminated: 'Terminated',
  }

  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function LeasesTable({ leases, units, tenants }: LeasesTableProps) {
  const [editingLease, setEditingLease] = useState<Tables<'leases'> | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { canEdit, canDelete } = useUserRole()

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this lease? This action cannot be undone.')) {
      return
    }

    setDeletingId(id)
    try {
      const result = await deleteLeaseAction(id)
      if (result.success) {
        toast.success('Lease deleted')
      } else {
        toast.error(result.error || 'Failed to delete lease')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setDeletingId(null)
    }
  }

  if (leases.length === 0) {
    return null
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Rent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leases.map((lease) => (
              <TableRow key={lease.id}>
                <TableCell className="font-medium">
                  {lease.tenant
                    ? `${lease.tenant.first_name} ${lease.tenant.last_name}`
                    : 'Unknown'}
                </TableCell>
                <TableCell className="text-gray-600">
                  {lease.unit
                    ? `${lease.unit.address}${lease.unit.unit_number ? ` #${lease.unit.unit_number}` : ''}`
                    : 'Unknown'}
                </TableCell>
                <TableCell className="text-sm">
                  <div>{formatDate(lease.start_date)}</div>
                  {lease.end_date && (
                    <div className="text-gray-500">to {formatDate(lease.end_date)}</div>
                  )}
                </TableCell>
                <TableCell>${lease.rent_amount.toLocaleString()}/mo</TableCell>
                <TableCell>
                  <StatusBadge status={lease.status} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        disabled={deletingId === lease.id}
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/leases/${lease.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      {canEdit && (
                        <DropdownMenuItem onClick={() => setEditingLease(lease)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(lease.id)}
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
        <LeaseForm
          open={!!editingLease}
          onOpenChange={(open) => !open && setEditingLease(null)}
          lease={editingLease}
          units={units}
          tenants={tenants}
        />
      )}
    </>
  )
}
