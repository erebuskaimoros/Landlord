import { z } from 'zod'

export const timelineEventTypeSchema = z.enum([
  'lease_signed',
  'move_in',
  'move_out',
  'rent_payment',
  'late_payment',
  'maintenance_request',
  'inspection',
  'communication',
  'violation',
  'renewal',
  'other',
])

export const timelineEventCreateSchema = z.object({
  tenant_id: z.string().uuid('Invalid tenant'),
  event_type: timelineEventTypeSchema,
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(5000).optional().nullable(),
  event_date: z.string().min(1, 'Event date is required'),
})

export const timelineEventUpdateSchema = timelineEventCreateSchema.partial().omit({ tenant_id: true })

export type TimelineEventType = z.infer<typeof timelineEventTypeSchema>
export type TimelineEventCreateInput = z.infer<typeof timelineEventCreateSchema>
export type TimelineEventUpdateInput = z.infer<typeof timelineEventUpdateSchema>

export const eventTypeLabels: Record<TimelineEventType, string> = {
  lease_signed: 'Lease Signed',
  move_in: 'Move In',
  move_out: 'Move Out',
  rent_payment: 'Rent Payment',
  late_payment: 'Late Payment',
  maintenance_request: 'Maintenance Request',
  inspection: 'Inspection',
  communication: 'Communication',
  violation: 'Violation',
  renewal: 'Renewal',
  other: 'Other',
}

export const eventTypeColors: Record<TimelineEventType, string> = {
  lease_signed: 'bg-green-100 text-green-800',
  move_in: 'bg-blue-100 text-blue-800',
  move_out: 'bg-orange-100 text-orange-800',
  rent_payment: 'bg-emerald-100 text-emerald-800',
  late_payment: 'bg-red-100 text-red-800',
  maintenance_request: 'bg-yellow-100 text-yellow-800',
  inspection: 'bg-purple-100 text-purple-800',
  communication: 'bg-gray-100 text-gray-800',
  violation: 'bg-red-100 text-red-800',
  renewal: 'bg-indigo-100 text-indigo-800',
  other: 'bg-gray-100 text-gray-800',
}
