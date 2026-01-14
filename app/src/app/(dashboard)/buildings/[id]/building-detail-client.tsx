'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Pencil, Trash2, Building2, MapPin, Calendar, Home, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BuildingForm } from '@/components/forms/building-form'
import { BuildingAllocationsEditor } from '@/components/buildings/building-allocations-editor'
import { deleteBuildingAction, saveAllocationsAction } from '@/app/(dashboard)/buildings/actions'
import { toast } from 'sonner'
import type { Tables } from '@/types/database'

interface BuildingDetailClientProps {
  building: Tables<'buildings'>
  units: Tables<'units'>[]
  allocations: Record<string, number>
}

function StatusBadge({ status }: { status: Tables<'units'>['status'] }) {
  const variants: Record<Tables<'units'>['status'], 'default' | 'secondary' | 'outline'> = {
    occupied: 'default',
    vacant: 'secondary',
    sold: 'outline',
  }
  const labels: Record<Tables<'units'>['status'], string> = {
    occupied: 'Occupied',
    vacant: 'Vacant',
    sold: 'Sold',
  }
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}

export function BuildingDetailClient({ building, units, allocations }: BuildingDetailClientProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  // Convert allocations Record to Map for the editor
  const allocationsMap = useMemo(() => {
    const map = new Map<string, number>()
    Object.entries(allocations).forEach(([key, value]) => {
      map.set(key, value)
    })
    return map
  }, [allocations])

  async function handleSaveAllocations(
    newAllocations: { unit_id: string; allocation_percentage: number }[]
  ) {
    const result = await saveAllocationsAction(building.id, newAllocations)
    if (result.success) {
      router.refresh()
    }
    return result
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this building? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteBuildingAction(building.id)
      if (result.success) {
        toast.success('Building deleted')
        router.push('/buildings')
      } else {
        toast.error(result.error || 'Failed to delete building')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/buildings" className="hover:text-gray-700 flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Buildings
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="h-6 w-6" />
            {building.name}
          </h1>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Location Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Address</label>
              <p className="mt-1">{building.address}</p>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {building.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700">{building.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Record Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="font-medium text-gray-500">Created</dt>
                <dd className="mt-1">
                  {new Date(building.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1">
                  {new Date(building.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Units in this building */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Units ({units.length})
          </CardTitle>
          <Link href="/units">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />
              View All Units
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {units.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No units assigned to this building yet. Add units and assign them to this building from the Units page.
            </p>
          ) : (
            <div className="divide-y">
              {units.map((unit) => (
                <div key={unit.id} className="py-3 flex items-center justify-between">
                  <div>
                    <Link
                      href={`/units/${unit.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {unit.address}
                      {unit.unit_number && ` #${unit.unit_number}`}
                    </Link>
                    {(unit.city || unit.state) && (
                      <p className="text-sm text-gray-500">
                        {[unit.city, unit.state, unit.zip_code].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {unit.rental_price && (
                      <span className="text-sm text-gray-600">
                        ${unit.rental_price.toLocaleString()}/mo
                      </span>
                    )}
                    <StatusBadge status={unit.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Allocations */}
      <BuildingAllocationsEditor
        buildingId={building.id}
        units={units}
        initialAllocations={allocationsMap}
        onSave={handleSaveAllocations}
      />

      <BuildingForm
        open={editOpen}
        onOpenChange={setEditOpen}
        building={building}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
