'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Wrench } from 'lucide-react'
import { ContractorForm } from '@/components/forms/contractor-form'
import { ContractorsTable } from '@/components/tables/contractors-table'
import { useUserRole } from '@/hooks/useUserRole'
import type { Tables } from '@/types/database'

interface ContractorsClientProps {
  contractors: Tables<'contractors'>[]
}

export function ContractorsClient({ contractors }: ContractorsClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const { canEdit } = useUserRole()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contractors</h1>
          <p className="text-gray-500">
            {contractors.length > 0
              ? `${contractors.length} contractor${contractors.length === 1 ? '' : 's'}`
              : 'Manage your vendors and service providers'}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contractor
          </Button>
        )}
      </div>

      {contractors.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              No contractors yet
            </CardTitle>
            <CardDescription>
              {canEdit
                ? 'Build your network of trusted service providers'
                : 'No contractors have been added yet'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Add plumbers, electricians, HVAC technicians, and other vendors.
              Track their service types, ratings, and assign them to work orders.
            </p>
            {canEdit && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Contractor
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <ContractorsTable contractors={contractors} />
      )}

      {canEdit && (
        <ContractorForm open={formOpen} onOpenChange={setFormOpen} />
      )}
    </div>
  )
}
