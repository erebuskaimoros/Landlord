'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, Pencil, Trash2, Clock } from 'lucide-react'
import { TimelineEventForm } from './timeline-event-form'
import { deleteTimelineEventAction } from '@/app/(dashboard)/tenants/[id]/timeline-actions'
import {
  eventTypeLabels,
  eventTypeColors,
  type TimelineEventType,
} from '@/lib/validations/timeline-event'
import { toast } from 'sonner'
import type { Tables } from '@/types/database'

interface TenantTimelineProps {
  tenantId: string
  events: Tables<'tenant_timeline_events'>[]
  onRefresh?: () => void
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function TenantTimeline({ tenantId, events, onRefresh }: TenantTimelineProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Tables<'tenant_timeline_events'> | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this event?')) {
      return
    }

    setDeletingId(id)
    try {
      const result = await deleteTimelineEventAction(id)
      if (result.success) {
        toast.success('Event deleted')
        onRefresh?.()
      } else {
        toast.error(result.error || 'Failed to delete event')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Timeline
        </CardTitle>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Event
        </Button>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No events recorded yet. Add one to start tracking this tenant&apos;s history.
          </p>
        ) : (
          <div className="relative space-y-4">
            {/* Vertical line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-200" />

            {events.map((event) => (
              <div key={event.id} className="relative pl-10">
                {/* Timeline dot */}
                <div className="absolute left-2.5 top-1.5 h-3 w-3 rounded-full border-2 border-gray-300 bg-white" />

                <div className="group flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={eventTypeColors[event.event_type as TimelineEventType]}
                      >
                        {eventTypeLabels[event.event_type as TimelineEventType]}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {formatDate(event.event_date)}
                      </span>
                    </div>
                    <p className="font-medium">{event.title}</p>
                    {event.description && (
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {event.description}
                      </p>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                        disabled={deletingId === event.id}
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingEvent(event)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(event.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Event Form */}
      <TimelineEventForm
        open={formOpen}
        onOpenChange={setFormOpen}
        tenantId={tenantId}
        onSuccess={onRefresh}
      />

      {/* Edit Event Form */}
      <TimelineEventForm
        open={!!editingEvent}
        onOpenChange={(open) => !open && setEditingEvent(null)}
        tenantId={tenantId}
        event={editingEvent}
        onSuccess={onRefresh}
      />
    </Card>
  )
}
