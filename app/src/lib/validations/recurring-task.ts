import { z } from 'zod'
import { taskPrioritySchema, formatTaskPriority, getTaskPriorityVariant } from './task'

// Re-export these for convenience
export { formatTaskPriority, getTaskPriorityVariant }

// Common interval presets in days
export const INTERVAL_PRESETS = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  semiannually: 180,
  annually: 365,
} as const

// Minimal schema for creating a recurring task
export const recurringTaskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  unit_id: z.string().uuid('Invalid unit'),
  interval_days: z.coerce.number().int().min(1, 'Interval must be at least 1 day').max(365, 'Interval cannot exceed 365 days'),
  next_due_date: z.string().min(1, 'Next due date is required'),
})

// Full schema with all fields
export const recurringTaskFullSchema = recurringTaskCreateSchema.extend({
  description: z.string().max(5000).optional().nullable(),
  priority: taskPrioritySchema.default('medium'),
  assigned_contractor_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
})

// Update schema (all fields optional)
export const recurringTaskUpdateSchema = recurringTaskFullSchema.partial()

// Types derived from schemas
export type RecurringTaskCreateInput = z.infer<typeof recurringTaskCreateSchema>
export type RecurringTaskFullInput = z.input<typeof recurringTaskFullSchema>
export type RecurringTaskFullOutput = z.infer<typeof recurringTaskFullSchema>
export type RecurringTaskUpdateInput = z.infer<typeof recurringTaskUpdateSchema>

// Helper to format interval for display
export function formatInterval(days: number): string {
  if (days === 1) return 'Daily'
  if (days === 7) return 'Weekly'
  if (days === 14) return 'Every 2 weeks'
  if (days === 30) return 'Monthly'
  if (days === 60) return 'Every 2 months'
  if (days === 90) return 'Quarterly'
  if (days === 180) return 'Every 6 months'
  if (days === 365) return 'Annually'
  return `Every ${days} days`
}

// Helper to get next occurrence date from a starting date
export function getNextOccurrence(fromDate: Date, intervalDays: number): Date {
  const next = new Date(fromDate)
  next.setDate(next.getDate() + intervalDays)
  return next
}
