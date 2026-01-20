'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Building2,
  Calendar,
  DollarSign,
  Clock,
  AlertTriangle,
  Package,
  Wrench,
  Plus,
} from 'lucide-react'
import type { Tables } from '@/types/database'
import { deleteAssetAction } from '@/app/(dashboard)/assets/actions'
import { toast } from 'sonner'
import { AssetForm } from '@/components/forms/asset-form'
import { MaintenanceLogForm } from '@/components/assets/maintenance-log-form'
import { useUserRole } from '@/hooks/useUserRole'
import { formatAssetType, formatCondition, getConditionColor } from '@/lib/validations/asset'
import { formatServiceType } from '@/lib/validations/asset-maintenance-log'

type MaintenanceLogWithContractor = Tables<'asset_maintenance_logs'> & {
  contractor: Tables<'contractors'> | null
}

interface AssetDetailClientProps {
  asset: Tables<'assets'> & { unit: Tables<'units'> | null }
  units: Tables<'units'>[]
  contractors: Tables<'contractors'>[]
  maintenanceLogs: MaintenanceLogWithContractor[]
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
    month: 'long',
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

export function AssetDetailClient({ asset, units, contractors, maintenanceLogs }: AssetDetailClientProps) {
  const router = useRouter()
  const [editFormOpen, setEditFormOpen] = useState(false)
  const [maintenanceLogFormOpen, setMaintenanceLogFormOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { canEdit, canDelete } = useUserRole()

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this asset? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteAssetAction(asset.id)
      if (result.success) {
        toast.success('Asset deleted')
        router.push('/assets')
      } else {
        toast.error(result.error || 'Failed to delete asset')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  const warrantyExpiring = isWarrantyExpiringSoon(asset.warranty_expiry)
  const warrantyExpired = isWarrantyExpired(asset.warranty_expiry)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/assets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
              <Badge className={getConditionColor(asset.condition)}>
                {formatCondition(asset.condition)}
              </Badge>
            </div>
            <p className="text-gray-500">{formatAssetType(asset.asset_type)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" onClick={() => setEditFormOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </div>
      </div>

      {/* Warning banner for warranty */}
      {(warrantyExpiring || warrantyExpired) && (
        <div className={`rounded-md p-4 ${warrantyExpired ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${warrantyExpired ? 'text-red-500' : 'text-yellow-500'}`} />
            <span className={`font-medium ${warrantyExpired ? 'text-red-800' : 'text-yellow-800'}`}>
              {warrantyExpired
                ? 'Warranty has expired'
                : 'Warranty expiring soon'}
            </span>
          </div>
          <p className={`mt-1 text-sm ${warrantyExpired ? 'text-red-700' : 'text-yellow-700'}`}>
            Warranty {warrantyExpired ? 'expired' : 'expires'} on {formatDate(asset.warranty_expiry)}.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Asset Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Make</p>
                <p className="text-sm">{asset.make || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Model</p>
                <p className="text-sm">{asset.model || '-'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Serial Number</p>
              <p className="text-sm font-mono">{asset.serial_number || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Condition</p>
              <Badge className={getConditionColor(asset.condition)}>
                {formatCondition(asset.condition)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            {asset.unit ? (
              <Link
                href={`/units/${asset.unit.id}`}
                className="block p-4 rounded-md border hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium">{asset.unit.address}</p>
                {asset.unit.unit_number && (
                  <p className="text-sm text-gray-500">Unit {asset.unit.unit_number}</p>
                )}
                {asset.unit.city && asset.unit.state && (
                  <p className="text-sm text-gray-500">
                    {asset.unit.city}, {asset.unit.state} {asset.unit.zip_code}
                  </p>
                )}
              </Link>
            ) : (
              <p className="text-gray-500">No unit assigned</p>
            )}
          </CardContent>
        </Card>

        {/* Purchase Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Purchase Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Purchase Date</p>
                <p className="text-sm">{formatDate(asset.purchase_date)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Purchase Price</p>
                <p className="text-sm">{formatCurrency(asset.purchase_price)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warranty & Lifespan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Warranty & Lifespan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Warranty Expiry</p>
              <p className={`text-sm ${warrantyExpired ? 'text-red-600' : warrantyExpiring ? 'text-yellow-600' : ''}`}>
                {formatDate(asset.warranty_expiry)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Expected Lifespan</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <p className="text-sm">
                  {asset.expected_lifespan_years
                    ? `${asset.expected_lifespan_years} years`
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Maintenance History ({maintenanceLogs.length})
              </CardTitle>
              <CardDescription>Service records for this asset</CardDescription>
            </div>
            {canEdit && (
              <Button size="sm" onClick={() => setMaintenanceLogFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Log
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {maintenanceLogs.length === 0 ? (
            <p className="text-sm text-gray-400">No maintenance records yet</p>
          ) : (
            <div className="space-y-3">
              {maintenanceLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-md border bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{formatServiceType(log.service_type)}</Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(log.service_date).toLocaleDateString()}
                        </span>
                      </div>
                      {log.description && (
                        <p className="text-sm mt-1">{log.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {log.cost && (
                          <span>{formatCurrency(log.cost)}</span>
                        )}
                        {log.performed_by && (
                          <span>By: {log.performed_by}</span>
                        )}
                        {log.contractor && (
                          <span>Contractor: {log.contractor.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {asset.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{asset.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-500">Record Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
            <div>
              <span>Created: </span>
              <span>{formatDate(asset.created_at)}</span>
            </div>
            <div>
              <span>Last Updated: </span>
              <span>{formatDate(asset.updated_at)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <>
          <AssetForm
            open={editFormOpen}
            onOpenChange={setEditFormOpen}
            asset={asset}
            units={units}
          />
          <MaintenanceLogForm
            open={maintenanceLogFormOpen}
            onOpenChange={setMaintenanceLogFormOpen}
            assetId={asset.id}
            contractors={contractors}
            onSuccess={() => router.refresh()}
          />
        </>
      )}
    </div>
  )
}
