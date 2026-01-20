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
import { MoreHorizontal, Pencil, Trash2, Eye, CheckCircle, PlayCircle, XCircle, Building2, Wrench } from 'lucide-react'
import type { Tables } from '@/types/database'
import { deleteTaskAction, updateTaskStatusAction } from '@/app/(dashboard)/tasks/actions'
import { toast } from 'sonner'
import { TaskForm } from '@/components/forms/task-form'
import { useUserRole } from '@/hooks/useUserRole'
import {
  formatTaskStatus,
  formatTaskPriority,
  getTaskStatusVariant,
  getTaskPriorityVariant,
  type TaskStatus,
} from '@/lib/validations/task'

type TaskWithRelations = Tables<'tasks'> & {
  unit: Tables<'units'> | null
  contractor: Tables<'contractors'> | null
}

interface TasksTableProps {
  tasks: TaskWithRelations[]
  units: Tables<'units'>[]
  contractors: Tables<'contractors'>[]
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString()
}

function isOverdue(task: TaskWithRelations): boolean {
  if (!task.due_date) return false
  if (task.status === 'completed' || task.status === 'cancelled') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(task.due_date)
  return dueDate < today
}

export function TasksTable({ tasks, units, contractors }: TasksTableProps) {
  const [editingTask, setEditingTask] = useState<Tables<'tasks'> | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const { canEdit, canDelete } = useUserRole()

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return
    }

    setDeletingId(id)
    try {
      const result = await deleteTaskAction(id)
      if (result.success) {
        toast.success('Task deleted')
      } else {
        toast.error(result.error || 'Failed to delete task')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleStatusChange(id: string, newStatus: TaskStatus) {
    setUpdatingId(id)
    try {
      const result = await updateTaskStatusAction(id, newStatus)
      if (result.success) {
        toast.success(`Task marked as ${formatTaskStatus(newStatus).toLowerCase()}`)
      } else {
        toast.error(result.error || 'Failed to update task')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setUpdatingId(null)
    }
  }

  if (tasks.length === 0) {
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
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Contractor</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">
                  <Link href={`/tasks/${task.id}`} className="hover:underline">
                    {task.title}
                  </Link>
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
                  <Badge variant={getTaskStatusVariant(task.status)}>
                    {formatTaskStatus(task.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getTaskPriorityVariant(task.priority)}>
                    {formatTaskPriority(task.priority)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className={isOverdue(task) ? 'text-red-600 font-medium' : ''}>
                    {formatDate(task.due_date)}
                    {isOverdue(task) && ' (Overdue)'}
                  </span>
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
                        disabled={deletingId === task.id || updatingId === task.id}
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
                      {canEdit && (
                        <>
                          <DropdownMenuItem onClick={() => setEditingTask(task)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {task.status === 'open' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'in_progress')}>
                              <PlayCircle className="mr-2 h-4 w-4" />
                              Start Work
                            </DropdownMenuItem>
                          )}
                          {(task.status === 'open' || task.status === 'in_progress') && (
                            <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'completed')}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark Complete
                            </DropdownMenuItem>
                          )}
                          {task.status !== 'cancelled' && task.status !== 'completed' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'cancelled')}>
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel
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
            ))}
          </TableBody>
        </Table>
      </div>

      {canEdit && (
        <TaskForm
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          task={editingTask}
          units={units}
          contractors={contractors}
        />
      )}
    </>
  )
}
