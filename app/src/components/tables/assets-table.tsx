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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, Eye, Building2, AlertTriangle } from 'lucide-react'
import type { Tables } from '@/types/database'
import { deleteAssetAction } from '@/app/(dashboard)/assets/actions'
import { toast } from 'sonner'
import { AssetForm } from '@/components/forms/asset-form'
import { useUserRole } from '@/hooks/useUserRole'
import { formatAssetType, getConditionColor, formatCondition } from '@/lib/validations/asset'

interface AssetsTableProps {
  assets: (Tables<'assets'> & { unit: Tables<'units'> | null })[]
  units: Tables<'units'>[]
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function formatDate(date: string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function isWarrantyExpiringSoon(warrantyExpiry: string | null): boolean {
  if (!warrantyExpiry) return false
  const expiry = new Date(warrantyExpiry)
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const today = new Date()
  return expiry >= today && expiry <= thirtyDaysFromNow
}

function isWarrantyExpired(warrantyExpiry: string | null): boolean {
  if (!warrantyExpiry) return false
  return new Date(warrantyExpiry) < new Date()
}

export function AssetsTable({ assets, units }: AssetsTableProps) {
  const [editingAsset, setEditingAsset] = useState<Tables<'assets'> | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { canEdit, canDelete } = useUserRole()

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this asset? This action cannot be undone.')) {
      return
    }

    setDeletingId(id)
    try {
      const result = await deleteAssetAction(id)
      if (result.success) {
        toast.success('Asset deleted')
      } else {
        toast.error(result.error || 'Failed to delete asset')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setDeletingId(null)
    }
  }

  if (assets.length === 0) {
    return null
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Warranty</TableHead>
              <TableHead>Purchase Price</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell className="font-medium">
                  <div>
                    {asset.name}
                    {asset.make && asset.model && (
                      <div className="text-sm text-gray-500">
                        {asset.make} {asset.model}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {formatAssetType(asset.asset_type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {asset.unit ? (
                    <Link
                      href={`/units/${asset.unit.id}`}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      <Building2 className="h-3 w-3" />
                      {asset.unit.address}
                      {asset.unit.unit_number && `, Unit ${asset.unit.unit_number}`}
                    </Link>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={getConditionColor(asset.condition)}>
                    {formatCondition(asset.condition)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {asset.warranty_expiry ? (
                    <div className="flex items-center gap-1">
                      {isWarrantyExpiringSoon(asset.warranty_expiry) && (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                      {isWarrantyExpired(asset.warranty_expiry) && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={
                        isWarrantyExpired(asset.warranty_expiry)
                          ? 'text-red-600'
                          : isWarrantyExpiringSoon(asset.warranty_expiry)
                            ? 'text-yellow-600'
                            : ''
                      }>
                        {formatDate(asset.warranty_expiry)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>{formatCurrency(asset.purchase_price)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        disabled={deletingId === asset.id}
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/assets/${asset.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      {canEdit && (
                        <DropdownMenuItem onClick={() => setEditingAsset(asset)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(asset.id)}
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
        <AssetForm
          open={!!editingAsset}
          onOpenChange={(open) => !open && setEditingAsset(null)}
          asset={editingAsset}
          units={units}
        />
      )}
    </>
  )
}
