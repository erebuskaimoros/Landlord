'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Building2,
  Wrench,
  PlayCircle,
  PauseCircle,
  RefreshCw,
} from 'lucide-react'
import type { Tables } from '@/types/database'
import {
  deleteRecurringTaskAction,
  toggleRecurringTaskActiveAction,
  generateTaskFromRecurringAction,
} from '@/app/(dashboard)/tasks/actions'
import { toast } from 'sonner'
import { RecurringTaskForm } from '@/components/forms/recurring-task-form'
import { useUserRole } from '@/hooks/useUserRole'
import {
  formatTaskPriority,
  getTaskPriorityVariant,
} from '@/lib/validations/task'
import { formatInterval } from '@/lib/validations/recurring-task'

type RecurringTaskWithRelations = Tables<'recurring_tasks'> & {
  unit: Tables<'units'> | null
  contractor: Tables<'contractors'> | null
}

interface RecurringTasksTableProps {
  recurringTasks: RecurringTaskWithRelations[]
  units: Tables<'units'>[]
  contractors: Tables<'contractors'>[]
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString()
}

function isDueSoon(nextDueDate: string): boolean {
  const due = new Date(nextDueDate)
  const today = new Date()
  const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntilDue <= 7 && daysUntilDue >= 0
}

function isOverdue(nextDueDate: string): boolean {
  const due = new Date(nextDueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

export function RecurringTasksTable({ recurringTasks, units, contractors }: RecurringTasksTableProps) {
  const [editingTask, setEditingTask] = useState<Tables<'recurring_tasks'> | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const { canEdit, canDelete } = useUserRole()

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this recurring task? This action cannot be undone.')) {
      return
    }

    setDeletingId(id)
    try {
      const result = await deleteRecurringTaskAction(id)
      if (result.success) {
        toast.success('Recurring task deleted')
      } else {
        toast.error(result.error || 'Failed to delete recurring task')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleToggleActive(id: string, currentlyActive: boolean) {
    setTogglingId(id)
    try {
      const result = await toggleRecurringTaskActiveAction(id, !currentlyActive)
      if (result.success) {
        toast.success(currentlyActive ? 'Recurring task paused' : 'Recurring task activated')
      } else {
        toast.error(result.error || 'Failed to update recurring task')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleGenerateTask(id: string) {
    setGeneratingId(id)
    try {
      const result = await generateTaskFromRecurringAction(id)
      if (result.success) {
        toast.success('Task generated successfully')
      } else {
        toast.error(result.error || 'Failed to generate task')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setGeneratingId(null)
    }
  }

  if (recurringTasks.length === 0) {
    return null
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Interval</TableHead>
              <TableHead>Next Due</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contractor</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recurringTasks.map((task) => {
              const overdue = isOverdue(task.next_due_date)
              const dueSoon = isDueSoon(task.next_due_date)

              return (
                <TableRow key={task.id} className={!task.is_active ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">
                    {task.title}
                  </TableCell>
                  <TableCell>
                    {task.unit ? (
                      <Link
                        href={`/units/${task.unit.id}`}
                        className="flex items-center gap-1 text-sm text-gray-600 hover:underline"
                      >
                        <Building2 className="h-3 w-3" />
                        {task.unit.address}
                        {task.unit.unit_number && ` #${task.unit.unit_number}`}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{formatInterval(task.interval_days)}</span>
                  </TableCell>
                  <TableCell>
                    <span className={
                      overdue ? 'text-red-600 font-medium' :
                      dueSoon ? 'text-orange-600 font-medium' : ''
                    }>
                      {formatDate(task.next_due_date)}
                      {overdue && ' (Overdue)'}
                      {dueSoon && !overdue && ' (Soon)'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getTaskPriorityVariant(task.priority)}>
                      {formatTaskPriority(task.priority)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={task.is_active ? 'default' : 'secondary'}>
                      {task.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.contractor ? (
                      <Link
                        href={`/contractors/${task.contractor.id}`}
                        className="flex items-center gap-1 text-sm text-gray-600 hover:underline"
                      >
                        <Wrench className="h-3 w-3" />
                        {task.contractor.name}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-400">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          disabled={
                            deletingId === task.id ||
                            togglingId === task.id ||
                            generatingId === task.id
                          }
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && (
                          <>
                            <DropdownMenuItem onClick={() => setEditingTask(task)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(task.id, task.is_active)}
                            >
                              {task.is_active ? (
                                <>
                                  <PauseCircle className="mr-2 h-4 w-4" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            {task.is_active && (
                              <DropdownMenuItem
                                onClick={() => handleGenerateTask(task.id)}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Generate Task Now
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(task.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {canEdit && (
        <RecurringTaskForm
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          recurringTask={editingTask}
          units={units}
          contractors={contractors}
        />
      )}
    </>
  )
}
