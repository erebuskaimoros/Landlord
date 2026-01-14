'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { UnitForm } from '@/components/forms/unit-form'
import { UnitsTable } from '@/components/tables/units-table'
import { useUserRole } from '@/hooks/useUserRole'
import type { Tables } from '@/types/database'

interface UnitsClientProps {
  units: Tables<'units'>[]
  buildings: Tables<'buildings'>[]
  counts: Record<string, number>
}

export function UnitsClient({ units, buildings, counts }: UnitsClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const { canEdit } = useUserRole()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Units</h1>
          <p className="text-gray-500">
            {counts.total > 0
              ? `${counts.total} total units - ${counts.occupied} occupied, ${counts.vacant} vacant`
              : 'Manage your rental properties'}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Unit
          </Button>
        )}
      </div>

      {units.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No units yet</CardTitle>
            <CardDescription>
              {canEdit
                ? 'Add your first rental unit to get started'
                : 'No rental units have been added yet'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Units are the core of your property management. Each unit represents a rentable property or residence.
            </p>
            {canEdit && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Unit
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <UnitsTable units={units} buildings={buildings} />
      )}

      {canEdit && (
        <UnitForm open={formOpen} onOpenChange={setFormOpen} buildings={buildings} />
      )}
    </div>
  )
}
