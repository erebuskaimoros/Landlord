import { describe, it, expect } from 'vitest'
import {
  taskStatusSchema,
  taskPrioritySchema,
  taskCreateSchema,
  taskFullSchema,
  taskUpdateSchema,
  taskStatusUpdateSchema,
  formatTaskStatus,
  formatTaskPriority,
  getTaskStatusVariant,
  getTaskPriorityVariant,
} from '../task'

describe('taskStatusSchema', () => {
  it('accepts valid status values', () => {
    expect(taskStatusSchema.safeParse('open').success).toBe(true)
    expect(taskStatusSchema.safeParse('in_progress').success).toBe(true)
    expect(taskStatusSchema.safeParse('completed').success).toBe(true)
    expect(taskStatusSchema.safeParse('cancelled').success).toBe(true)
  })

  it('rejects invalid status', () => {
    expect(taskStatusSchema.safeParse('invalid').success).toBe(false)
    expect(taskStatusSchema.safeParse('').success).toBe(false)
    expect(taskStatusSchema.safeParse(null).success).toBe(false)
  })
})

describe('taskPrioritySchema', () => {
  it('accepts valid priority values', () => {
    expect(taskPrioritySchema.safeParse('low').success).toBe(true)
    expect(taskPrioritySchema.safeParse('medium').success).toBe(true)
    expect(taskPrioritySchema.safeParse('high').success).toBe(true)
    expect(taskPrioritySchema.safeParse('urgent').success).toBe(true)
  })

  it('rejects invalid priority', () => {
    expect(taskPrioritySchema.safeParse('critical').success).toBe(false)
    expect(taskPrioritySchema.safeParse('').success).toBe(false)
    expect(taskPrioritySchema.safeParse(null).success).toBe(false)
  })
})

describe('taskCreateSchema', () => {
  const validUnitId = '550e8400-e29b-41d4-a716-446655440000'

  it('requires title', () => {
    const result = taskCreateSchema.safeParse({ unit_id: validUnitId })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('title')
    }
  })

  it('requires unit_id', () => {
    const result = taskCreateSchema.safeParse({ title: 'Fix leak' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('unit_id')
    }
  })

  it('rejects empty title', () => {
    const result = taskCreateSchema.safeParse({ title: '', unit_id: validUnitId })
    expect(result.success).toBe(false)
  })

  it('rejects title that is too long', () => {
    const result = taskCreateSchema.safeParse({
      title: 'a'.repeat(256),
      unit_id: validUnitId,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid uuid for unit_id', () => {
    const result = taskCreateSchema.safeParse({
      title: 'Fix leak',
      unit_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid minimal input', () => {
    const result = taskCreateSchema.safeParse({
      title: 'Fix kitchen leak',
      unit_id: validUnitId,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Fix kitchen leak')
      expect(result.data.unit_id).toBe(validUnitId)
    }
  })
})

describe('taskFullSchema', () => {
  const validUnitId = '550e8400-e29b-41d4-a716-446655440000'
  const validContractorId = '660e8400-e29b-41d4-a716-446655440001'
  const validMinimal = { title: 'Fix leak', unit_id: validUnitId }

  it('extends create schema', () => {
    const result = taskFullSchema.safeParse(validMinimal)
    expect(result.success).toBe(true)
  })

  it('defaults status to open', () => {
    const result = taskFullSchema.safeParse(validMinimal)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('open')
    }
  })

  it('defaults priority to medium', () => {
    const result = taskFullSchema.safeParse(validMinimal)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.priority).toBe('medium')
    }
  })

  it('accepts all optional fields', () => {
    const result = taskFullSchema.safeParse({
      ...validMinimal,
      description: 'Water leaking from kitchen sink',
      status: 'in_progress',
      priority: 'high',
      due_date: '2025-06-15',
      assigned_contractor_id: validContractorId,
      estimated_cost: 250,
      actual_cost: 275,
      notes: 'Tenant reported issue on Monday',
    })
    expect(result.success).toBe(true)
  })

  it('coerces string numbers for costs', () => {
    const result = taskFullSchema.safeParse({
      ...validMinimal,
      estimated_cost: '250.50',
      actual_cost: '275.00',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.estimated_cost).toBe(250.5)
      expect(result.data.actual_cost).toBe(275)
    }
  })

  it('validates cost ranges', () => {
    expect(
      taskFullSchema.safeParse({ ...validMinimal, estimated_cost: -1 }).success
    ).toBe(false)
    expect(
      taskFullSchema.safeParse({ ...validMinimal, actual_cost: 10000001 }).success
    ).toBe(false)
    expect(
      taskFullSchema.safeParse({ ...validMinimal, estimated_cost: 10000000 }).success
    ).toBe(true)
  })

  it('validates description length', () => {
    expect(
      taskFullSchema.safeParse({
        ...validMinimal,
        description: 'a'.repeat(5001),
      }).success
    ).toBe(false)
  })

  it('validates notes length', () => {
    expect(
      taskFullSchema.safeParse({
        ...validMinimal,
        notes: 'a'.repeat(10001),
      }).success
    ).toBe(false)
  })

  it('validates assigned_contractor_id uuid format', () => {
    expect(
      taskFullSchema.safeParse({
        ...validMinimal,
        assigned_contractor_id: 'not-a-uuid',
      }).success
    ).toBe(false)
  })

  it('accepts null for optional fields', () => {
    const result = taskFullSchema.safeParse({
      ...validMinimal,
      description: null,
      due_date: null,
      assigned_contractor_id: null,
      estimated_cost: null,
      actual_cost: null,
      notes: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('taskUpdateSchema', () => {
  it('allows empty object', () => {
    const result = taskUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('allows partial updates', () => {
    const result = taskUpdateSchema.safeParse({
      status: 'completed',
      actual_cost: 300,
    })
    expect(result.success).toBe(true)
  })

  it('still validates field constraints', () => {
    expect(
      taskUpdateSchema.safeParse({ estimated_cost: -1 }).success
    ).toBe(false)
    expect(
      taskUpdateSchema.safeParse({ title: '' }).success
    ).toBe(false)
  })
})

describe('taskStatusUpdateSchema', () => {
  it('requires status', () => {
    const result = taskStatusUpdateSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('accepts valid status update', () => {
    const result = taskStatusUpdateSchema.safeParse({ status: 'completed' })
    expect(result.success).toBe(true)
  })

  it('accepts status with actual_cost', () => {
    const result = taskStatusUpdateSchema.safeParse({
      status: 'completed',
      actual_cost: 350,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('completed')
      expect(result.data.actual_cost).toBe(350)
    }
  })

  it('validates actual_cost range', () => {
    expect(
      taskStatusUpdateSchema.safeParse({ status: 'completed', actual_cost: -1 }).success
    ).toBe(false)
  })
})

describe('formatTaskStatus', () => {
  it('formats all status values', () => {
    expect(formatTaskStatus('open')).toBe('Open')
    expect(formatTaskStatus('in_progress')).toBe('In Progress')
    expect(formatTaskStatus('completed')).toBe('Completed')
    expect(formatTaskStatus('cancelled')).toBe('Cancelled')
  })
})

describe('formatTaskPriority', () => {
  it('formats all priority values', () => {
    expect(formatTaskPriority('low')).toBe('Low')
    expect(formatTaskPriority('medium')).toBe('Medium')
    expect(formatTaskPriority('high')).toBe('High')
    expect(formatTaskPriority('urgent')).toBe('Urgent')
  })
})

describe('getTaskStatusVariant', () => {
  it('returns correct variants for all statuses', () => {
    expect(getTaskStatusVariant('open')).toBe('outline')
    expect(getTaskStatusVariant('in_progress')).toBe('default')
    expect(getTaskStatusVariant('completed')).toBe('secondary')
    expect(getTaskStatusVariant('cancelled')).toBe('destructive')
  })
})

describe('getTaskPriorityVariant', () => {
  it('returns correct variants for all priorities', () => {
    expect(getTaskPriorityVariant('low')).toBe('outline')
    expect(getTaskPriorityVariant('medium')).toBe('secondary')
    expect(getTaskPriorityVariant('high')).toBe('default')
    expect(getTaskPriorityVariant('urgent')).toBe('destructive')
  })
})
