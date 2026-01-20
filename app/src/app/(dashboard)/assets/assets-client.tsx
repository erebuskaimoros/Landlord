'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Package, AlertTriangle } from 'lucide-react'
import { AssetForm } from '@/components/forms/asset-form'
import { AssetsTable } from '@/components/tables/assets-table'
import { useUserRole } from '@/hooks/useUserRole'
import type { Tables } from '@/types/database'

type AssetWithUnit = Tables<'assets'> & {
  unit: Tables<'units'> | null
}

interface AssetsClientProps {
  assets: AssetWithUnit[]
  units: Tables<'units'>[]
  stats: {
    total: number
    byCondition: Record<string, number>
    warrantyExpiringSoon: number
  }
}

export function AssetsClient({ assets, units, stats }: AssetsClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const { canEdit } = useUserRole()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="text-gray-500">
            {stats.total > 0
              ? `${stats.total} asset${stats.total === 1 ? '' : 's'} tracked${stats.warrantyExpiringSoon > 0 ? ` (${stats.warrantyExpiringSoon} warranty expiring soon)` : ''}`
              : 'Track appliances and equipment'}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      {stats.total > 0 && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Excellent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{stats.byCondition.excellent || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Good</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{stats.byCondition.good || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">Fair</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">{stats.byCondition.fair || 0}</p>
            </CardContent>
          </Card>
          <Card className={stats.warrantyExpiringSoon > 0 ? 'border-orange-200 bg-orange-50' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-medium ${stats.warrantyExpiringSoon > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                <div className="flex items-center gap-1">
                  {stats.warrantyExpiringSoon > 0 && <AlertTriangle className="h-4 w-4" />}
                  Warranty Expiring
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${stats.warrantyExpiringSoon > 0 ? 'text-orange-600' : ''}`}>
                {stats.warrantyExpiringSoon}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {assets.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              No assets yet
            </CardTitle>
            <CardDescription>
              {canEdit
                ? 'Add assets to track appliances and equipment in your units'
                : 'No assets have been added yet'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Assets help you track appliances, systems, and equipment.
              Monitor warranty dates, purchase history, and condition.
            </p>
            {canEdit && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Asset
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <AssetsTable assets={assets} units={units} />
      )}

      {canEdit && (
        <AssetForm
          open={formOpen}
          onOpenChange={setFormOpen}
          units={units}
        />
      )}
    </div>
  )
}
