'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { taskFullSchema, type TaskFullInput, formatTaskPriority } from '@/lib/validations/task'
import { createTaskAction, updateTaskAction } from '@/app/(dashboard)/tasks/actions'
import { toast } from 'sonner'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Tables } from '@/types/database'

interface TaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Tables<'tasks'> | null
  units: Tables<'units'>[]
  contractors: Tables<'contractors'>[]
  defaultUnitId?: string
  onSuccess?: () => void
}

const priorities = ['low', 'medium', 'high', 'urgent'] as const

export function TaskForm({
  open,
  onOpenChange,
  task,
  units,
  contractors,
  defaultUnitId,
  onSuccess
}: TaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(
    !!task?.description || !!task?.estimated_cost || !!task?.notes
  )
  const isEditing = !!task

  const form = useForm<TaskFullInput>({
    resolver: zodResolver(taskFullSchema),
    defaultValues: {
      title: task?.title || '',
      unit_id: task?.unit_id || defaultUnitId || '',
      description: task?.description || '',
      status: task?.status || 'open',
      priority: task?.priority || 'medium',
      due_date: task?.due_date || '',
      assigned_contractor_id: task?.assigned_contractor_id || '',
      estimated_cost: task?.estimated_cost ?? undefined,
      actual_cost: task?.actual_cost ?? undefined,
      notes: task?.notes || '',
    },
  })

  async function onSubmit(data: TaskFullInput) {
    setIsSubmitting(true)

    const formData = new FormData()
    formData.set('title', data.title)
    formData.set('unit_id', data.unit_id)
    if (data.description) formData.set('description', data.description)
    if (data.status) formData.set('status', data.status)
    if (data.priority) formData.set('priority', data.priority)
    if (data.due_date) formData.set('due_date', data.due_date)
    if (data.assigned_contractor_id) formData.set('assigned_contractor_id', data.assigned_contractor_id)
    if (data.estimated_cost !== undefined && data.estimated_cost !== null) {
      formData.set('estimated_cost', String(data.estimated_cost))
    }
    if (data.actual_cost !== undefined && data.actual_cost !== null) {
      formData.set('actual_cost', String(data.actual_cost))
    }
    if (data.notes) formData.set('notes', data.notes)

    try {
      const result = isEditing
        ? await updateTaskAction(task.id, formData)
        : await createTaskAction(formData)

      if (result.success) {
        toast.success(isEditing ? 'Task updated' : 'Task created')
        form.reset()
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Something went wrong')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  function formatUnitAddress(unit: Tables<'units'>) {
    const parts = [unit.address]
    if (unit.unit_number) parts.push(`Unit ${unit.unit_number}`)
    return parts.join(', ')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details for this task.'
              : 'Create a new maintenance task or work order.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Fix leaking faucet" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unit_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {formatUnitAddress(unit)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || 'medium'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorities.map((p) => (
                          <SelectItem key={p} value={p}>
                            {formatTaskPriority(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="assigned_contractor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Contractor</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a contractor (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contractors.map((contractor) => (
                        <SelectItem key={contractor.id} value={contractor.id}>
                          {contractor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Additional Details Section */}
            <Collapsible open={showAdditionalDetails} onOpenChange={setShowAdditionalDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <span className="text-sm font-medium">Additional Details</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAdditionalDetails ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detailed description of the task..."
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="estimated_cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Cost ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            value={field.value !== undefined && field.value !== null ? String(field.value) : ''}
                            onChange={(e) => {
                              const val = e.target.value
                              field.onChange(val === '' ? undefined : parseFloat(val))
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isEditing && (
                    <FormField
                      control={form.control}
                      name="actual_cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Actual Cost ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              {...field}
                              value={field.value !== undefined && field.value !== null ? String(field.value) : ''}
                              onChange={(e) => {
                                const val = e.target.value
                                field.onChange(val === '' ? undefined : parseFloat(val))
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes..."
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
