'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { TenantForm } from '@/components/forms/tenant-form'
import { TenantsTable } from '@/components/tables/tenants-table'
import { useUserRole } from '@/hooks/useUserRole'
import type { Tables } from '@/types/database'

interface TenantsClientProps {
  tenants: Tables<'tenants'>[]
}

export function TenantsClient({ tenants }: TenantsClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const { canEdit } = useUserRole()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-500">
            {tenants.length > 0
              ? `${tenants.length} tenant${tenants.length === 1 ? '' : 's'}`
              : 'Manage your tenants'}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Tenant
          </Button>
        )}
      </div>

      {tenants.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No tenants yet</CardTitle>
            <CardDescription>
              {canEdit
                ? 'Add tenants to track lease history and payments'
                : 'No tenants have been added yet'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Tenants can have multiple lease periods. Track their full history from move-in to move-out.
            </p>
            {canEdit && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Tenant
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <TenantsTable tenants={tenants} />
      )}

      {canEdit && (
        <TenantForm open={formOpen} onOpenChange={setFormOpen} />
      )}
    </div>
  )
}
