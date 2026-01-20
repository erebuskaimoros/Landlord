import { z } from 'zod'

// Task status enum matching database
export const taskStatusSchema = z.enum(['open', 'in_progress', 'completed', 'cancelled'])

// Task priority enum matching database
export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])

// Minimal schema for creating a task
export const taskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  unit_id: z.string().uuid('Invalid unit'),
})

// Full schema with all fields
export const taskFullSchema = taskCreateSchema.extend({
  description: z.string().max(5000).optional().nullable(),
  status: taskStatusSchema.default('open'),
  priority: taskPrioritySchema.default('medium'),
  due_date: z.string().optional().nullable(),
  assigned_contractor_id: z.string().uuid().optional().nullable(),
  estimated_cost: z.coerce.number().min(0).max(10000000).optional().nullable(),
  actual_cost: z.coerce.number().min(0).max(10000000).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
})

// Update schema (all fields optional)
export const taskUpdateSchema = taskFullSchema.partial()

// Status update schema (for quick status changes)
export const taskStatusUpdateSchema = z.object({
  status: taskStatusSchema,
  actual_cost: z.coerce.number().min(0).max(10000000).optional().nullable(),
})

// Types derived from schemas
export type TaskCreateInput = z.infer<typeof taskCreateSchema>
export type TaskFullInput = z.input<typeof taskFullSchema>
export type TaskFullOutput = z.infer<typeof taskFullSchema>
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>
export type TaskStatus = z.infer<typeof taskStatusSchema>
export type TaskPriority = z.infer<typeof taskPrioritySchema>

// Helper to format status for display
export function formatTaskStatus(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }
  return labels[status]
}

// Helper to format priority for display
export function formatTaskPriority(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
  }
  return labels[priority]
}

// Helper to get status badge variant
export function getTaskStatusVariant(status: TaskStatus): 'default' | 'secondary' | 'outline' | 'destructive' {
  const variants: Record<TaskStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    open: 'outline',
    in_progress: 'default',
    completed: 'secondary',
    cancelled: 'destructive',
  }
  return variants[status]
}

// Helper to get priority badge variant
export function getTaskPriorityVariant(priority: TaskPriority): 'default' | 'secondary' | 'outline' | 'destructive' {
  const variants: Record<TaskPriority, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    low: 'outline',
    medium: 'secondary',
    high: 'default',
    urgent: 'destructive',
  }
  return variants[priority]
}
