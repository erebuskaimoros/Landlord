'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { BuildingForm } from '@/components/forms/building-form'
import { BuildingsTable } from '@/components/tables/buildings-table'
import { useUserRole } from '@/hooks/useUserRole'
import type { Tables } from '@/types/database'

interface BuildingsClientProps {
  buildings: Tables<'buildings'>[]
}

export function BuildingsClient({ buildings }: BuildingsClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const { canEdit } = useUserRole()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buildings</h1>
          <p className="text-gray-500">
            {buildings.length > 0
              ? `${buildings.length} building${buildings.length === 1 ? '' : 's'}`
              : 'Group units into multi-unit properties'}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Building
          </Button>
        )}
      </div>

      {buildings.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No buildings yet</CardTitle>
            <CardDescription>
              {canEdit
                ? 'Add your first building to group multiple units together'
                : 'No buildings have been added yet'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Buildings help you organize multi-unit properties like apartment complexes or duplexes.
              Individual units can be linked to buildings for better organization.
            </p>
            {canEdit && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Building
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <BuildingsTable buildings={buildings} />
      )}

      {canEdit && (
        <BuildingForm open={formOpen} onOpenChange={setFormOpen} />
      )}
    </div>
  )
}
