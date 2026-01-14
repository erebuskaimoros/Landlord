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
  timelineEventCreateSchema,
  type TimelineEventCreateInput,
  type TimelineEventType,
  eventTypeLabels,
} from '@/lib/validations/timeline-event'
import {
  createTimelineEventAction,
  updateTimelineEventAction,
} from '@/app/(dashboard)/tenants/[id]/timeline-actions'
import { toast } from 'sonner'
import { useState } from 'react'
import type { Tables } from '@/types/database'

interface TimelineEventFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  event?: Tables<'tenant_timeline_events'> | null
  onSuccess?: () => void
}

const eventTypes = Object.entries(eventTypeLabels) as [TimelineEventType, string][]

export function TimelineEventForm({
  open,
  onOpenChange,
  tenantId,
  event,
  onSuccess,
}: TimelineEventFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!event

  const form = useForm<TimelineEventCreateInput>({
    resolver: zodResolver(timelineEventCreateSchema),
    defaultValues: {
      tenant_id: tenantId,
      event_type: event?.event_type || 'other',
      title: event?.title || '',
      description: event?.description || '',
      event_date: event?.event_date || new Date().toISOString().split('T')[0],
    },
  })

  async function onSubmit(data: TimelineEventCreateInput) {
    setIsSubmitting(true)

    const formData = new FormData()
    formData.set('tenant_id', data.tenant_id)
    formData.set('event_type', data.event_type)
    formData.set('title', data.title)
    if (data.description) formData.set('description', data.description)
    formData.set('event_date', data.event_date)

    try {
      const result = isEditing
        ? await updateTimelineEventAction(event.id, formData)
        : await createTimelineEventAction(formData)

      if (result.success) {
        toast.success(isEditing ? 'Event updated' : 'Event added')
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Event' : 'Add Timeline Event'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details for this event.'
              : 'Record an event in this tenant\'s history.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="event_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventTypes.map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
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
                name="event_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of the event" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes or details..."
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Event' : 'Add Event'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
