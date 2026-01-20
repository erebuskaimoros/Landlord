'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Pencil, Trash2, Home, MapPin, Calendar, Building2, User, FileText, AlertCircle, Plus, Wrench, ClipboardList, MoreHorizontal, Eye, CheckCircle, PlayCircle, XCircle, Package } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UnitForm } from '@/components/forms/unit-form'
import { TaskForm } from '@/components/forms/task-form'
import { AssetForm } from '@/components/forms/asset-form'
import { PhotoGallery } from '@/components/photos/photo-gallery'
import { deleteUnitAction } from '@/app/(dashboard)/units/actions'
import { deleteTaskAction, updateTaskStatusAction } from '@/app/(dashboard)/tasks/actions'
import { toast } from 'sonner'
import { useUserRole } from '@/hooks/useUserRole'
import {
  formatTaskStatus,
  formatTaskPriority,
  getTaskStatusVariant,
  getTaskPriorityVariant,
  type TaskStatus,
} from '@/lib/validations/task'
import {
  formatAssetType,
  formatCondition,
  getConditionColor,
} from '@/lib/validations/asset'
import type { Tables } from '@/types/database'

// Standard appliances that most units have
const STANDARD_APPLIANCES = [
  { type: 'refrigerator', label: 'Refrigerator', icon: '🧊' },
  { type: 'stove', label: 'Stove/Range', icon: '🔥' },
  { type: 'dishwasher', label: 'Dishwasher', icon: '🍽️' },
  { type: 'microwave', label: 'Microwave', icon: '📻' },
  { type: 'washer', label: 'Washer', icon: '🧺' },
  { type: 'dryer', label: 'Dryer', icon: '👕' },
  { type: 'hvac', label: 'HVAC/AC', icon: '❄️' },
  { type: 'water_heater', label: 'Water Heater', icon: '🚿' },
] as const

type LeaseWithTenant = Tables<'leases'> & {
  tenant: Tables<'tenants'> | null
}

type TaskWithContractor = Tables<'tasks'> & {
  contractor: Tables<'contractors'> | null
}

interface UnitDetailClientProps {
  unit: Tables<'units'>
  building: Tables<'buildings'> | null
  activeLease: LeaseWithTenant | null
  photos: Tables<'photos'>[]
  photoUrls: Record<string, string>
  tasks: TaskWithContractor[]
  contractors: Tables<'contractors'>[]
  assets: Tables<'assets'>[]
  hasTenants: boolean
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

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString()
}

function isOverdue(task: TaskWithContractor): boolean {
  if (!task.due_date) return false
  if (task.status === 'completed' || task.status === 'cancelled') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(task.due_date)
  return dueDate < today
}

export function UnitDetailClient({ unit, building, activeLease, photos, photoUrls, tasks, contractors, assets, hasTenants }: UnitDetailClientProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Tables<'tasks'> | null>(null)
  const [assetFormOpen, setAssetFormOpen] = useState(false)
  const [assetFormDefaults, setAssetFormDefaults] = useState<{ type: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const router = useRouter()
  const { canEdit, canDelete } = useUserRole()

  // Helper to find existing asset by type
  function getAssetByType(type: string) {
    return assets.find(a => a.asset_type === type)
  }

  // Open asset form with defaults
  function openAssetForm(type: string, name: string) {
    setAssetFormDefaults({ type, name })
    setAssetFormOpen(true)
  }

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

  async function handleDeleteTask(id: string) {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return
    }

    setDeletingTaskId(id)
    try {
      const result = await deleteTaskAction(id)
      if (result.success) {
        toast.success('Task deleted')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete task')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setDeletingTaskId(null)
    }
  }

  async function handleTaskStatusChange(id: string, newStatus: TaskStatus) {
    setUpdatingTaskId(id)
    try {
      const result = await updateTaskStatusAction(id, newStatus)
      if (result.success) {
        toast.success(`Task marked as ${formatTaskStatus(newStatus).toLowerCase()}`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update task')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setUpdatingTaskId(null)
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
        {/* Tasks - shown first for owners/managers */}
        {canEdit && (
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Active Tasks
              </CardTitle>
              <Button size="sm" onClick={() => setTaskFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No active tasks</p>
                  <p className="text-sm text-gray-400">
                    Create a task to track maintenance or work orders for this unit
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="font-medium text-gray-900 hover:underline truncate"
                          >
                            {task.title}
                          </Link>
                          <Badge variant={getTaskStatusVariant(task.status)}>
                            {formatTaskStatus(task.status)}
                          </Badge>
                          <Badge variant={getTaskPriorityVariant(task.priority)}>
                            {formatTaskPriority(task.priority)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          {task.due_date && (
                            <span className={isOverdue(task) ? 'text-red-600 font-medium' : ''}>
                              Due: {formatDate(task.due_date)}
                              {isOverdue(task) && ' (Overdue)'}
                            </span>
                          )}
                          {task.contractor && (
                            <Link
                              href={`/contractors/${task.contractor.id}`}
                              className="flex items-center gap-1 hover:underline"
                            >
                              <Wrench className="h-3 w-3" />
                              {task.contractor.name}
                            </Link>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            disabled={deletingTaskId === task.id || updatingTaskId === task.id}
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/tasks/${task.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingTask(task)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {task.status === 'open' && (
                            <DropdownMenuItem onClick={() => handleTaskStatusChange(task.id, 'in_progress')}>
                              <PlayCircle className="mr-2 h-4 w-4" />
                              Start Work
                            </DropdownMenuItem>
                          )}
                          {(task.status === 'open' || task.status === 'in_progress') && (
                            <DropdownMenuItem onClick={() => handleTaskStatusChange(task.id, 'completed')}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark Complete
                            </DropdownMenuItem>
                          )}
                          {task.status !== 'cancelled' && task.status !== 'completed' && (
                            <DropdownMenuItem onClick={() => handleTaskStatusChange(task.id, 'cancelled')}>
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                  <div className="pt-2 border-t">
                    <Link
                      href={`/tasks?unit=${unit.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View all tasks for this unit
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Photos */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <PhotoGallery
              unitId={unit.id}
              photos={photos}
              photoUrls={photoUrls}
            />
          </CardContent>
        </Card>

        {/* Assets - Standard Appliances Grid */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Appliances & Equipment
            </CardTitle>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => openAssetForm('other', '')}>
                <Plus className="mr-2 h-4 w-4" />
                Add Other
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {/* Standard Appliances Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {STANDARD_APPLIANCES.map((appliance) => {
                const existingAsset = getAssetByType(appliance.type)

                if (existingAsset) {
                  return (
                    <Link
                      key={appliance.type}
                      href={`/assets/${existingAsset.id}`}
                      className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-2xl mb-2">{appliance.icon}</span>
                      <span className="text-sm font-medium text-gray-900">{appliance.label}</span>
                      {existingAsset.condition && (
                        <span className={`mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getConditionColor(existingAsset.condition)}`}>
                          {formatCondition(existingAsset.condition)}
                        </span>
                      )}
                      {existingAsset.make && (
                        <span className="mt-1 text-xs text-gray-500 truncate max-w-full">
                          {existingAsset.make}
                        </span>
                      )}
                    </Link>
                  )
                }

                // Not present - show add button
                return canEdit ? (
                  <button
                    key={appliance.type}
                    onClick={() => openAssetForm(appliance.type, appliance.label)}
                    className="flex flex-col items-center p-4 border border-dashed rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors text-gray-400 hover:text-gray-600"
                  >
                    <span className="text-2xl mb-2 opacity-50">{appliance.icon}</span>
                    <span className="text-sm font-medium">{appliance.label}</span>
                    <span className="mt-1 text-xs flex items-center gap-1">
                      <Plus className="h-3 w-3" />
                      Add
                    </span>
                  </button>
                ) : (
                  <div
                    key={appliance.type}
                    className="flex flex-col items-center p-4 border border-dashed rounded-lg text-gray-300"
                  >
                    <span className="text-2xl mb-2 opacity-50">{appliance.icon}</span>
                    <span className="text-sm font-medium">{appliance.label}</span>
                    <span className="mt-1 text-xs">Not present</span>
                  </div>
                )
              })}
            </div>

            {/* Other Assets (non-standard) */}
            {(() => {
              const standardTypes = STANDARD_APPLIANCES.map(a => a.type)
              const otherAssets = assets.filter(a => !standardTypes.includes(a.asset_type as typeof standardTypes[number]))

              if (otherAssets.length === 0) return null

              return (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Other Equipment</h4>
                  <div className="space-y-2">
                    {otherAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/assets/${asset.id}`}
                              className="font-medium text-gray-900 hover:underline truncate"
                            >
                              {asset.name}
                            </Link>
                            <Badge variant="outline">
                              {formatAssetType(asset.asset_type)}
                            </Badge>
                            {asset.condition && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getConditionColor(asset.condition)}`}>
                                {formatCondition(asset.condition)}
                              </span>
                            )}
                          </div>
                          {(asset.make || asset.warranty_expiry) && (
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                              {asset.make && asset.model && (
                                <span>{asset.make} {asset.model}</span>
                              )}
                              {asset.warranty_expiry && (
                                <span className={new Date(asset.warranty_expiry) < new Date() ? 'text-red-600' : ''}>
                                  Warranty: {new Date(asset.warranty_expiry).toLocaleDateString()}
                                  {new Date(asset.warranty_expiry) < new Date() && ' (Expired)'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/assets/${asset.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>

        {/* Location Info */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location
            </CardTitle>
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Current Tenant
            </CardTitle>
            {canEdit && !activeLease && (
              hasTenants ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/leases/new?unit=${unit.id}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Lease
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/tenants">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Tenant
                  </Link>
                </Button>
              )
            )}
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
                  {hasTenants
                    ? 'Create a lease to assign a tenant to this unit'
                    : 'Add a tenant first, then create a lease'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Details */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Property Details
            </CardTitle>
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Rental Information</CardTitle>
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
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
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Notes</CardTitle>
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {unit.notes ? (
              <p className="whitespace-pre-wrap text-gray-700">{unit.notes}</p>
            ) : (
              <p className="text-sm text-gray-400">No notes added</p>
            )}
          </CardContent>
        </Card>

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

      {/* Task Form for creating new tasks */}
      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        units={[unit]}
        contractors={contractors}
        defaultUnitId={unit.id}
        onSuccess={() => router.refresh()}
      />

      {/* Task Form for editing existing tasks */}
      {editingTask && (
        <TaskForm
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          task={editingTask}
          units={[unit]}
          contractors={contractors}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Asset Form for quick-adding appliances */}
      {assetFormOpen && (
        <AssetForm
          open={assetFormOpen}
          onOpenChange={(open) => {
            setAssetFormOpen(open)
            if (!open) setAssetFormDefaults(null)
          }}
          units={[unit]}
          defaultUnitId={unit.id}
          defaultAssetType={assetFormDefaults?.type}
          defaultName={assetFormDefaults?.name}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  )
}
