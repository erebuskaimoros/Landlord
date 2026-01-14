'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { LeaseForm } from '@/components/forms/lease-form'
import { LeasesTable } from '@/components/tables/leases-table'
import { useUserRole } from '@/hooks/useUserRole'
import type { Tables } from '@/types/database'
import type { LeaseWithRelations } from '@/services/leases'

interface LeasesClientProps {
  leases: LeaseWithRelations[]
  units: Tables<'units'>[]
  tenants: Tables<'tenants'>[]
  counts: Record<string, number>
}

export function LeasesClient({ leases, units, tenants, counts }: LeasesClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const { canEdit } = useUserRole()

  const hasUnitsAndTenants = units.length > 0 && tenants.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leases</h1>
          <p className="text-gray-500">
            {counts.total > 0
              ? `${counts.total} total - ${counts.active} active, ${counts.draft} draft`
              : 'Manage lease agreements'}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setFormOpen(true)} disabled={!hasUnitsAndTenants}>
            <Plus className="mr-2 h-4 w-4" />
            Add Lease
          </Button>
        )}
      </div>

      {!hasUnitsAndTenants && (
        <Card>
          <CardHeader>
            <CardTitle>Before adding leases</CardTitle>
            <CardDescription>
              You need to create units and tenants first
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Leases connect tenants to units. Make sure you have at least one unit and one tenant
              before creating a lease.
            </p>
          </CardContent>
        </Card>
      )}

      {hasUnitsAndTenants && leases.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No leases yet</CardTitle>
            <CardDescription>
              {canEdit
                ? 'Create leases to connect tenants with units'
                : 'No leases have been created yet'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Leases track the terms, rent amount, security deposit, and timeline of each tenancy.
            </p>
            {canEdit && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Lease
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        hasUnitsAndTenants && <LeasesTable leases={leases} units={units} tenants={tenants} />
      )}

      {canEdit && hasUnitsAndTenants && (
        <LeaseForm
          open={formOpen}
          onOpenChange={setFormOpen}
          units={units}
          tenants={tenants}
        />
      )}
    </div>
  )
}
