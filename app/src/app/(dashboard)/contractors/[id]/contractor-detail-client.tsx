'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Pencil, Trash2, Wrench, Mail, Phone, MapPin, DollarSign, Star, ClipboardList } from 'lucide-react'
import { ContractorForm } from '@/components/forms/contractor-form'
import { deleteContractorAction } from '@/app/(dashboard)/contractors/actions'
import { formatServiceType } from '@/lib/validations/contractor'
import { toast } from 'sonner'
import { useUserRole } from '@/hooks/useUserRole'
import type { Tables } from '@/types/database'

type TaskWithUnit = Tables<'tasks'> & {
  unit: Tables<'units'> | null
}

interface ContractorDetailClientProps {
  contractor: Tables<'contractors'>
  tasks: TaskWithUnit[]
}

export function ContractorDetailClient({ contractor, tasks }: ContractorDetailClientProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { canEdit, canDelete } = useUserRole()

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this contractor? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteContractorAction(contractor.id)
      if (result.success) {
        toast.success('Contractor deleted')
        router.push('/contractors')
      } else {
        toast.error(result.error || 'Failed to delete contractor')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/contractors" className="hover:text-gray-700 flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Contractors
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Wrench className="h-6 w-6" />
            {contractor.name}
          </h1>
          {contractor.average_rating > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span>{contractor.average_rating.toFixed(1)} rating</span>
              {contractor.total_jobs > 0 && (
                <span className="text-gray-400">({contractor.total_jobs} jobs)</span>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contractor.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <a href={`mailto:${contractor.email}`} className="text-blue-600 hover:underline">
                  {contractor.email}
                </a>
              </div>
            )}
            {contractor.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <a href={`tel:${contractor.phone}`} className="text-blue-600 hover:underline">
                  {contractor.phone}
                </a>
              </div>
            )}
            {contractor.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <span>{contractor.address}</span>
              </div>
            )}
            {!contractor.email && !contractor.phone && !contractor.address && (
              <p className="text-sm text-gray-400">No contact information on file</p>
            )}
          </CardContent>
        </Card>

        {/* Service Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Services Offered
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contractor.service_types && contractor.service_types.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {contractor.service_types.map((type) => (
                  <Badge key={type} variant="secondary">
                    {formatServiceType(type)}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No services specified</p>
            )}
          </CardContent>
        </Card>

        {/* Rates & Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Rates & Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Hourly Rate</label>
                <p className="mt-1 text-lg font-semibold">
                  {contractor.hourly_rate ? formatCurrency(contractor.hourly_rate) : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Total Jobs</label>
                <p className="mt-1 text-lg font-semibold">{contractor.total_jobs}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Average Rating</label>
              <div className="flex items-center gap-2 mt-1">
                <Star className={`h-5 w-5 ${contractor.average_rating > 0 ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                <span className="text-lg font-semibold">
                  {contractor.average_rating > 0 ? contractor.average_rating.toFixed(1) : 'No ratings'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {contractor.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{contractor.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Work Orders */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Work Orders ({tasks.length})
            </CardTitle>
            <CardDescription>
              Tasks assigned to this contractor
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-gray-400">No work orders assigned</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="block p-3 rounded-md border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{task.title}</p>
                        {task.unit && (
                          <p className="text-sm text-gray-500 truncate">{task.unit.address}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant={
                          task.status === 'completed' ? 'secondary' :
                          task.status === 'in_progress' ? 'default' :
                          task.status === 'cancelled' ? 'destructive' : 'outline'
                        }>
                          {task.status === 'in_progress' ? 'In Progress' :
                           task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </Badge>
                        {task.due_date && (
                          <span className={`text-xs ${
                            new Date(task.due_date) < new Date() &&
                            task.status !== 'completed' &&
                            task.status !== 'cancelled'
                              ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {canEdit && (
        <ContractorForm
          open={editOpen}
          onOpenChange={setEditOpen}
          contractor={contractor}
        />
      )}
    </div>
  )
}
