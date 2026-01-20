'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Building2,
  Calendar,
  DollarSign,
  User,
  CheckCircle,
  Clock,
  AlertTriangle,
  ClipboardList,
  Play,
  XCircle,
} from 'lucide-react'
import type { Tables } from '@/types/database'
import { deleteTaskAction, updateTaskStatusAction } from '@/app/(dashboard)/tasks/actions'
import { toast } from 'sonner'
import { TaskForm } from '@/components/forms/task-form'
import { TaskPhotoSection } from '@/components/photos/task-photo-section'
import { useUserRole } from '@/hooks/useUserRole'
import {
  formatTaskStatus,
  formatTaskPriority,
  getTaskStatusVariant,
  getTaskPriorityVariant,
} from '@/lib/validations/task'
import { ContractorRatingDialog } from '@/components/contractors/contractor-rating'

interface TaskDetailClientProps {
  task: Tables<'tasks'> & {
    unit: Tables<'units'> | null
    contractor: Tables<'contractors'> | null
  }
  units: Tables<'units'>[]
  contractors: Tables<'contractors'>[]
  photos: Tables<'photos'>[]
  photoUrls: Record<string, string>
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function formatDate(date: string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === 'completed' || status === 'cancelled') return false
  return new Date(dueDate) < new Date()
}

export function TaskDetailClient({ task, units, contractors, photos, photoUrls }: TaskDetailClientProps) {
  const router = useRouter()
  const [editFormOpen, setEditFormOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false)
  const { canEdit, canDelete } = useUserRole()

  const overdue = isOverdue(task.due_date, task.status)

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteTaskAction(task.id)
      if (result.success) {
        toast.success('Task deleted')
        router.push('/tasks')
      } else {
        toast.error(result.error || 'Failed to delete task')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleStatusChange(newStatus: 'open' | 'in_progress' | 'completed' | 'cancelled') {
    setIsUpdatingStatus(true)
    try {
      const result = await updateTaskStatusAction(task.id, newStatus)
      if (result.success) {
        toast.success(`Task marked as ${formatTaskStatus(newStatus)}`)
        // If completed and has contractor, open rating dialog
        if (newStatus === 'completed' && task.assigned_contractor_id) {
          setRatingDialogOpen(true)
        }
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update task status')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tasks">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
              <Badge variant={getTaskStatusVariant(task.status)}>
                {formatTaskStatus(task.status)}
              </Badge>
              <Badge variant={getTaskPriorityVariant(task.priority)}>
                {formatTaskPriority(task.priority)}
              </Badge>
            </div>
            {task.unit && (
              <p className="text-gray-500">{task.unit.address}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" onClick={() => setEditFormOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </div>
      </div>

      {/* Overdue warning */}
      {overdue && (
        <div className="rounded-md p-4 bg-red-50 border border-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="font-medium text-red-800">Task is overdue</span>
          </div>
          <p className="mt-1 text-sm text-red-700">
            Due date was {formatDate(task.due_date)}.
          </p>
        </div>
      )}

      {/* Status Actions */}
      {canEdit && task.status !== 'completed' && task.status !== 'cancelled' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Update task status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {task.status === 'open' && (
                <Button
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={isUpdatingStatus}
                  variant="outline"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Work
                </Button>
              )}
              {(task.status === 'open' || task.status === 'in_progress') && (
                <>
                  <Button
                    onClick={() => handleStatusChange('completed')}
                    disabled={isUpdatingStatus}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark Complete
                  </Button>
                  <Button
                    onClick={() => handleStatusChange('cancelled')}
                    disabled={isUpdatingStatus}
                    variant="outline"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Task Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Task Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Description</p>
              <p className="text-sm whitespace-pre-wrap">
                {task.description || 'No description provided'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <Badge variant={getTaskStatusVariant(task.status)}>
                  {formatTaskStatus(task.status)}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Priority</p>
                <Badge variant={getTaskPriorityVariant(task.priority)}>
                  {formatTaskPriority(task.priority)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unit Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            {task.unit ? (
              <Link
                href={`/units/${task.unit.id}`}
                className="block p-4 rounded-md border hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium">{task.unit.address}</p>
                {task.unit.unit_number && (
                  <p className="text-sm text-gray-500">Unit {task.unit.unit_number}</p>
                )}
                {task.unit.city && task.unit.state && (
                  <p className="text-sm text-gray-500">
                    {task.unit.city}, {task.unit.state} {task.unit.zip_code}
                  </p>
                )}
              </Link>
            ) : (
              <p className="text-gray-500">No unit assigned</p>
            )}
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Due Date</p>
              <div className="flex items-center gap-2">
                <p className={`text-sm ${overdue ? 'text-red-600 font-medium' : ''}`}>
                  {formatDate(task.due_date)}
                </p>
                {overdue && (
                  <Badge variant="destructive" className="text-xs">Overdue</Badge>
                )}
              </div>
            </div>
            {task.completed_at && (
              <div>
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <p className="text-sm">{formatDate(task.completed_at)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contractor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Assigned Contractor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {task.contractor ? (
              <Link
                href={`/contractors/${task.contractor.id}`}
                className="block p-4 rounded-md border hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium">{task.contractor.name}</p>
                {task.contractor.phone && (
                  <p className="text-sm text-gray-500">{task.contractor.phone}</p>
                )}
                {task.contractor.email && (
                  <p className="text-sm text-gray-500">{task.contractor.email}</p>
                )}
              </Link>
            ) : (
              <p className="text-gray-500">No contractor assigned</p>
            )}
          </CardContent>
        </Card>

        {/* Cost Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Estimated Cost</p>
                <p className="text-lg font-semibold">{formatCurrency(task.estimated_cost)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Actual Cost</p>
                <p className="text-lg font-semibold">{formatCurrency(task.actual_cost)}</p>
              </div>
              {task.estimated_cost && task.actual_cost && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Variance</p>
                  <p className={`text-lg font-semibold ${task.actual_cost > task.estimated_cost ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(task.actual_cost - task.estimated_cost)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Photos */}
      {task.unit && (
        <TaskPhotoSection
          taskId={task.id}
          unitId={task.unit.id}
          photos={photos}
          photoUrls={photoUrls}
        />
      )}

      {/* Notes */}
      {task.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{task.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-500">Record Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
            <div>
              <span>Created: </span>
              <span>{formatDate(task.created_at)}</span>
            </div>
            <div>
              <span>Last Updated: </span>
              <span>{formatDate(task.updated_at)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <TaskForm
          open={editFormOpen}
          onOpenChange={setEditFormOpen}
          task={task}
          units={units}
          contractors={contractors}
        />
      )}

      {/* Contractor Rating Dialog */}
      {task.contractor && (
        <ContractorRatingDialog
          open={ratingDialogOpen}
          onOpenChange={setRatingDialogOpen}
          task={task}
          contractor={task.contractor}
        />
      )}
    </div>
  )
}
