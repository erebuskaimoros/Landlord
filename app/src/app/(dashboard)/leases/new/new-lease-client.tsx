'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { LeaseForm } from '@/components/forms/lease-form'
import type { Tables } from '@/types/database'

interface NewLeaseClientProps {
  units: Tables<'units'>[]
  tenants: Tables<'tenants'>[]
  defaultUnitId?: string
}

export function NewLeaseClient({ units, tenants, defaultUnitId }: NewLeaseClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const router = useRouter()

  const hasUnitsAndTenants = units.length > 0 && tenants.length > 0

  // Open form automatically on mount
  useEffect(() => {
    if (hasUnitsAndTenants) {
      setFormOpen(true)
    }
  }, [hasUnitsAndTenants])

  // Handle form close - navigate back
  function handleOpenChange(open: boolean) {
    setFormOpen(open)
    if (!open) {
      // Navigate back to where the user came from
      if (defaultUnitId) {
        router.push(`/units/${defaultUnitId}`)
      } else {
        router.push('/leases')
      }
    }
  }

  function handleSuccess() {
    if (defaultUnitId) {
      router.push(`/units/${defaultUnitId}`)
    } else {
      router.push('/leases')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={defaultUnitId ? `/units/${defaultUnitId}` : '/leases'} className="hover:text-gray-700 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add New Lease</h1>
        <p className="text-gray-500">Create a new lease to connect a tenant with a unit</p>
      </div>

      {!hasUnitsAndTenants && (
        <Card>
          <CardHeader>
            <CardTitle>Before adding leases</CardTitle>
            <CardDescription>
              You need to create units and tenants first
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Leases connect tenants to units. Make sure you have at least one unit and one tenant
              before creating a lease.
            </p>
            <div className="flex gap-3">
              <Button asChild variant="outline">
                <Link href="/units">Manage Units</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/tenants">Manage Tenants</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {hasUnitsAndTenants && (
        <LeaseForm
          open={formOpen}
          onOpenChange={handleOpenChange}
          units={units}
          tenants={tenants}
          defaultUnitId={defaultUnitId}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
