'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Pencil, Trash2, Home, MapPin, Calendar, Building2, User, FileText, AlertCircle, Plus } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UnitForm } from '@/components/forms/unit-form'
import { deleteUnitAction } from '@/app/(dashboard)/units/actions'
import { toast } from 'sonner'
import type { Tables } from '@/types/database'

type LeaseWithTenant = Tables<'leases'> & {
  tenant: Tables<'tenants'> | null
}

interface UnitDetailClientProps {
  unit: Tables<'units'>
  building: Tables<'buildings'> | null
  activeLease: LeaseWithTenant | null
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

function formatFullAddress(unit: Tables<'units'>) {
  const parts = [unit.address]
  if (unit.unit_number) {
    parts[0] = `${unit.address}, ${unit.unit_number}`
  }
  if (unit.city || unit.state || unit.zip_code) {
    const location = [unit.city, unit.state, unit.zip_code].filter(Boolean).join(', ')
    parts.push(location)
  }
  return parts.join('\n')
}

interface ProgressivePrompt {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

function getProgressivePrompts(
  unit: Tables<'units'>,
  activeLease: LeaseWithTenant | null
): ProgressivePrompt[] {
  const prompts: ProgressivePrompt[] = []

  // High priority: Vacant unit without rental price
  if (unit.status === 'vacant' && !unit.rental_price) {
    prompts.push({
      title: 'Set monthly rent',
      description: 'Add a rental price to help track potential income and attract tenants.',
      priority: 'high',
    })
  }

  // High priority: No tenant for occupied unit
  if (unit.status === 'occupied' && !activeLease) {
    prompts.push({
      title: 'Create a lease',
      description: 'This unit is marked as occupied but has no active lease. Create one to track rent.',
      priority: 'high',
    })
  }

  // Medium priority: Missing property details
  if (!unit.bedrooms && !unit.bathrooms) {
    prompts.push({
      title: 'Add property details',
      description: 'Add bedrooms, bathrooms, and square footage to complete the listing.',
      priority: 'medium',
    })
  }

  // Medium priority: Vacant without listing description
  if (unit.status === 'vacant' && !unit.listing_description) {
    prompts.push({
      title: 'Write a listing description',
      description: 'A compelling description helps attract quality tenants faster.',
      priority: 'medium',
    })
  }

  // Low priority: No amenities listed
  if (!unit.amenities || unit.amenities.length === 0) {
    prompts.push({
      title: 'Add amenities',
      description: 'List features like parking, laundry, or appliances to showcase this property.',
      priority: 'low',
    })
  }

  // Low priority: No pet policy
  if (!unit.pet_policy) {
    prompts.push({
      title: 'Set pet policy',
      description: 'Clarify your pet policy to attract the right tenants.',
      priority: 'low',
    })
  }

  return prompts
}

export function UnitDetailClient({ unit, building, activeLease }: UnitDetailClientProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this unit? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteUnitAction(unit.id)
      if (result.success) {
        toast.success('Unit deleted')
        router.push('/units')
      } else {
        toast.error(result.error || 'Failed to delete unit')
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
            <Link href="/units" className="hover:text-gray-700 flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Units
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            {unit.address}
            {unit.unit_number && <span className="text-gray-500">#{unit.unit_number}</span>}
          </h1>
          <div className="flex items-center gap-3">
            <StatusBadge status={unit.status} />
            {unit.rental_price && (
              <span className="text-gray-600">${unit.rental_price.toLocaleString()}/mo</span>
            )}
          </div>
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

      {/* Progressive Disclosure Prompts */}
      {(() => {
        const prompts = getProgressivePrompts(unit, activeLease)
        const highPriority = prompts.filter(p => p.priority === 'high')
        const otherPrompts = prompts.filter(p => p.priority !== 'high')

        if (prompts.length === 0) return null

        return (
          <div className="space-y-3">
            {highPriority.map((prompt, idx) => (
              <Alert key={`high-${idx}`} className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-amber-800">{prompt.title}:</span>{' '}
                    <span className="text-amber-700">{prompt.description}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditOpen(true)}
                    className="ml-4 shrink-0"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
            {otherPrompts.length > 0 && (
              <div className="text-sm text-gray-500">
                <span className="font-medium">Suggestions:</span>{' '}
                {otherPrompts.map((p, idx) => (
                  <span key={`other-${idx}`}>
                    {idx > 0 && ' · '}
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => setEditOpen(true)}
                    >
                      {p.title}
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })()}

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
              <label className="text-sm font-medium text-gray-500">Full Address</label>
              <p className="mt-1 whitespace-pre-line">{formatFullAddress(unit)}</p>
            </div>
            {building && (
              <div>
                <label className="text-sm font-medium text-gray-500">Building</label>
                <p className="mt-1">
                  <Link
                    href={`/buildings/${building.id}`}
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Building2 className="h-4 w-4" />
                    {building.name}
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Tenant / Lease Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Current Tenant
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeLease && activeLease.tenant ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Tenant</label>
                  <p className="mt-1">
                    <Link
                      href={`/tenants/${activeLease.tenant.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {activeLease.tenant.first_name} {activeLease.tenant.last_name}
                    </Link>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Lease Start</label>
                    <p className="mt-1">
                      {new Date(activeLease.start_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Lease End</label>
                    <p className="mt-1">
                      {activeLease.end_date
                        ? new Date(activeLease.end_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Month-to-month'}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Monthly Rent</label>
                  <p className="mt-1 font-medium">
                    ${activeLease.rent_amount.toLocaleString()}/mo
                  </p>
                </div>
                <Link href={`/leases/${activeLease.id}`}>
                  <Button variant="outline" size="sm" className="mt-2">
                    <FileText className="mr-2 h-4 w-4" />
                    View Lease Details
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No active lease</p>
                <p className="text-sm text-gray-400 mt-1">
                  This unit is currently vacant
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="mt-1">{unit.property_type || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Bedrooms</dt>
                <dd className="mt-1">{unit.bedrooms ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Bathrooms</dt>
                <dd className="mt-1">{unit.bathrooms ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Square Feet</dt>
                <dd className="mt-1">
                  {unit.square_footage ? `${unit.square_footage.toLocaleString()} sq ft` : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Year Built</dt>
                <dd className="mt-1">{unit.year_built ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Pet Policy</dt>
                <dd className="mt-1">{unit.pet_policy || '-'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Rental & Marketing Info */}
        <Card>
          <CardHeader>
            <CardTitle>Rental Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Monthly Rent</dt>
              <dd className="mt-1 text-lg font-semibold">
                {unit.rental_price ? `$${unit.rental_price.toLocaleString()}/mo` : '-'}
              </dd>
            </div>
            {unit.listing_description && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Listing Description</dt>
                <dd className="mt-1 text-gray-700 whitespace-pre-wrap">{unit.listing_description}</dd>
              </div>
            )}
            {unit.amenities && unit.amenities.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-2">Amenities</dt>
                <dd className="flex flex-wrap gap-2">
                  {unit.amenities.map((amenity) => (
                    <Badge key={amenity} variant="outline">
                      {amenity}
                    </Badge>
                  ))}
                </dd>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {unit.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700">{unit.notes}</p>
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
                  {new Date(unit.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1">
                  {new Date(unit.updated_at).toLocaleDateString('en-US', {
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

      <UnitForm
        open={editOpen}
        onOpenChange={setEditOpen}
        unit={unit}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
