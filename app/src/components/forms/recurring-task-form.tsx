'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
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
import { Switch } from '@/components/ui/switch'
import {
  recurringTaskFullSchema,
  type RecurringTaskFullInput,
  formatTaskPriority,
  INTERVAL_PRESETS,
} from '@/lib/validations/recurring-task'
import { createRecurringTaskAction, updateRecurringTaskAction } from '@/app/(dashboard)/tasks/actions'
import { toast } from 'sonner'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Tables } from '@/types/database'

interface RecurringTaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recurringTask?: Tables<'recurring_tasks'> | null
  units: Tables<'units'>[]
  contractors: Tables<'contractors'>[]
  defaultUnitId?: string
  onSuccess?: () => void
}

const priorities = ['low', 'medium', 'high', 'urgent'] as const

const intervalOptions = [
  { value: '7', label: 'Weekly' },
  { value: '14', label: 'Every 2 weeks' },
  { value: '30', label: 'Monthly' },
  { value: '90', label: 'Quarterly' },
  { value: '180', label: 'Every 6 months' },
  { value: '365', label: 'Annually' },
  { value: 'custom', label: 'Custom...' },
]

export function RecurringTaskForm({
  open,
  onOpenChange,
  recurringTask,
  units,
  contractors,
  defaultUnitId,
  onSuccess
}: RecurringTaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(
    !!recurringTask?.description
  )
  const [showCustomInterval, setShowCustomInterval] = useState(false)
  const isEditing = !!recurringTask

  // Determine if current interval matches a preset
  const currentIntervalDays = recurringTask?.interval_days
  const isPresetInterval = currentIntervalDays &&
    intervalOptions.some(opt => opt.value === String(currentIntervalDays))

  const form = useForm<RecurringTaskFullInput>({
    resolver: zodResolver(recurringTaskFullSchema),
    defaultValues: {
      title: recurringTask?.title || '',
      unit_id: recurringTask?.unit_id || defaultUnitId || '',
      description: recurringTask?.description || '',
      priority: recurringTask?.priority || 'medium',
      interval_days: recurringTask?.interval_days || 30,
      next_due_date: recurringTask?.next_due_date || '',
      assigned_contractor_id: recurringTask?.assigned_contractor_id || '',
      is_active: recurringTask?.is_active ?? true,
    },
  })

  async function onSubmit(data: RecurringTaskFullInput) {
    setIsSubmitting(true)

    const formData = new FormData()
    formData.set('title', data.title)
    formData.set('unit_id', data.unit_id)
    formData.set('interval_days', String(data.interval_days))
    formData.set('next_due_date', data.next_due_date)
    if (data.description) formData.set('description', data.description)
    if (data.priority) formData.set('priority', data.priority)
    if (data.assigned_contractor_id) formData.set('assigned_contractor_id', data.assigned_contractor_id)
    formData.set('is_active', String(data.is_active ?? true))

    try {
      const result = isEditing
        ? await updateRecurringTaskAction(recurringTask.id, formData)
        : await createRecurringTaskAction(formData)

      if (result.success) {
        toast.success(isEditing ? 'Recurring task updated' : 'Recurring task created')
        form.reset()
        setShowCustomInterval(false)
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

  function handleIntervalChange(value: string) {
    if (value === 'custom') {
      setShowCustomInterval(true)
    } else {
      setShowCustomInterval(false)
      form.setValue('interval_days', parseInt(value, 10))
    }
  }

  // Get current interval value for the select
  const currentInterval = form.watch('interval_days')
  const selectValue = showCustomInterval ? 'custom' :
    intervalOptions.find(opt => opt.value === String(currentInterval))?.value || 'custom'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Recurring Task' : 'Create Recurring Task'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the schedule for this recurring task.'
              : 'Set up a task that repeats on a schedule.'}
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
                    <Input placeholder="HVAC filter replacement" {...field} />
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
              <FormItem>
                <FormLabel>Repeat Interval *</FormLabel>
                <Select value={selectValue} onValueChange={handleIntervalChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {intervalOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>

              {showCustomInterval && (
                <FormField
                  control={form.control}
                  name="interval_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          placeholder="30"
                          {...field}
                          value={field.value !== undefined && field.value !== null ? String(field.value) : ''}
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val === '' ? undefined : parseInt(val, 10))
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {!showCustomInterval && (
                <FormField
                  control={form.control}
                  name="next_due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Due Date *</FormLabel>
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
              )}
            </div>

            {showCustomInterval && (
              <FormField
                control={form.control}
                name="next_due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Due Date *</FormLabel>
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
            )}

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
                          <SelectValue placeholder="Select (optional)" />
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
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      When active, tasks will be generated automatically
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
                          placeholder="Instructions for this recurring task..."
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
                {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
