import { describe, it, expect } from 'vitest'
import {
  timelineEventTypeSchema,
  timelineEventCreateSchema,
  timelineEventUpdateSchema,
  eventTypeLabels,
  eventTypeColors,
} from '../timeline-event'

describe('timelineEventTypeSchema', () => {
  const validTypes = [
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
  ]

  it('accepts all valid event types', () => {
    for (const type of validTypes) {
      expect(timelineEventTypeSchema.safeParse(type).success).toBe(true)
    }
  })

  it('rejects invalid event type', () => {
    expect(timelineEventTypeSchema.safeParse('invalid').success).toBe(false)
    expect(timelineEventTypeSchema.safeParse('').success).toBe(false)
    expect(timelineEventTypeSchema.safeParse(null).success).toBe(false)
  })
})

describe('timelineEventCreateSchema', () => {
  const validEvent = {
    tenant_id: '550e8400-e29b-41d4-a716-446655440000',
    event_type: 'move_in' as const,
    title: 'Tenant Move In',
    event_date: '2024-01-15',
  }

  it('requires tenant_id', () => {
    const { tenant_id, ...rest } = validEvent
    const result = timelineEventCreateSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('requires event_type', () => {
    const { event_type, ...rest } = validEvent
    const result = timelineEventCreateSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('requires title', () => {
    const { title, ...rest } = validEvent
    const result = timelineEventCreateSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('requires event_date', () => {
    const { event_date, ...rest } = validEvent
    const result = timelineEventCreateSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('accepts valid minimal input', () => {
    const result = timelineEventCreateSchema.safeParse(validEvent)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tenant_id).toBe(validEvent.tenant_id)
      expect(result.data.event_type).toBe('move_in')
      expect(result.data.title).toBe('Tenant Move In')
    }
  })

  it('validates tenant_id as uuid', () => {
    const result = timelineEventCreateSchema.safeParse({
      ...validEvent,
      tenant_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty title', () => {
    const result = timelineEventCreateSchema.safeParse({
      ...validEvent,
      title: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects title that is too long', () => {
    const result = timelineEventCreateSchema.safeParse({
      ...validEvent,
      title: 'a'.repeat(201),
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty event_date', () => {
    const result = timelineEventCreateSchema.safeParse({
      ...validEvent,
      event_date: '',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional description', () => {
    const result = timelineEventCreateSchema.safeParse({
      ...validEvent,
      description: 'Keys handed over, walkthrough completed.',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe(
        'Keys handed over, walkthrough completed.'
      )
    }
  })

  it('accepts null for description', () => {
    const result = timelineEventCreateSchema.safeParse({
      ...validEvent,
      description: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects description that is too long', () => {
    const result = timelineEventCreateSchema.safeParse({
      ...validEvent,
      description: 'a'.repeat(5001),
    })
    expect(result.success).toBe(false)
  })

  it('accepts all event types', () => {
    const types = [
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
    ] as const

    for (const eventType of types) {
      const result = timelineEventCreateSchema.safeParse({
        ...validEvent,
        event_type: eventType,
      })
      expect(result.success).toBe(true)
    }
  })
})

describe('timelineEventUpdateSchema', () => {
  it('allows empty object', () => {
    const result = timelineEventUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('allows partial updates', () => {
    const result = timelineEventUpdateSchema.safeParse({
      title: 'Updated Title',
    })
    expect(result.success).toBe(true)
  })

  it('allows updating event_type', () => {
    const result = timelineEventUpdateSchema.safeParse({
      event_type: 'inspection',
    })
    expect(result.success).toBe(true)
  })

  it('allows updating description', () => {
    const result = timelineEventUpdateSchema.safeParse({
      description: 'Updated description of the event.',
    })
    expect(result.success).toBe(true)
  })

  it('does not allow updating tenant_id', () => {
    const result = timelineEventUpdateSchema.safeParse({
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    // tenant_id should be omitted from update schema
    expect(result.success).toBe(true)
    if (result.success) {
      expect('tenant_id' in result.data).toBe(false)
    }
  })

  it('still validates field constraints', () => {
    expect(
      timelineEventUpdateSchema.safeParse({ title: '' }).success
    ).toBe(false)
    expect(
      timelineEventUpdateSchema.safeParse({ event_type: 'invalid' }).success
    ).toBe(false)
    expect(
      timelineEventUpdateSchema.safeParse({ title: 'a'.repeat(201) }).success
    ).toBe(false)
  })
})

describe('eventTypeLabels', () => {
  it('has labels for all event types', () => {
    const types = [
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
    ] as const

    for (const type of types) {
      expect(eventTypeLabels[type]).toBeDefined()
      expect(typeof eventTypeLabels[type]).toBe('string')
      expect(eventTypeLabels[type].length).toBeGreaterThan(0)
    }
  })

  it('has human-readable labels', () => {
    expect(eventTypeLabels.lease_signed).toBe('Lease Signed')
    expect(eventTypeLabels.move_in).toBe('Move In')
    expect(eventTypeLabels.maintenance_request).toBe('Maintenance Request')
  })
})

describe('eventTypeColors', () => {
  it('has colors for all event types', () => {
    const types = [
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
    ] as const

    for (const type of types) {
      expect(eventTypeColors[type]).toBeDefined()
      expect(typeof eventTypeColors[type]).toBe('string')
      expect(eventTypeColors[type]).toContain('bg-')
      expect(eventTypeColors[type]).toContain('text-')
    }
  })

  it('uses Tailwind color classes', () => {
    expect(eventTypeColors.lease_signed).toMatch(/bg-\w+-\d+ text-\w+-\d+/)
    expect(eventTypeColors.late_payment).toContain('red')
    expect(eventTypeColors.rent_payment).toContain('emerald')
  })
})
