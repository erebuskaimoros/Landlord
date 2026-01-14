import { describe, it, expect } from 'vitest'
import {
  leaseStatusSchema,
  leaseCreateSchema,
  leaseFullSchema,
  leaseUpdateSchema,
} from '../lease'

describe('leaseStatusSchema', () => {
  it('accepts valid status values', () => {
    expect(leaseStatusSchema.safeParse('draft').success).toBe(true)
    expect(leaseStatusSchema.safeParse('active').success).toBe(true)
    expect(leaseStatusSchema.safeParse('expired').success).toBe(true)
    expect(leaseStatusSchema.safeParse('terminated').success).toBe(true)
  })

  it('rejects invalid status', () => {
    expect(leaseStatusSchema.safeParse('invalid').success).toBe(false)
    expect(leaseStatusSchema.safeParse('').success).toBe(false)
    expect(leaseStatusSchema.safeParse(null).success).toBe(false)
  })
})

describe('leaseCreateSchema', () => {
  const validLease = {
    tenant_id: '550e8400-e29b-41d4-a716-446655440000',
    unit_id: '550e8400-e29b-41d4-a716-446655440001',
    start_date: '2024-01-01',
    rent_amount: 1500,
    status: 'active' as const,
  }

  it('requires tenant_id', () => {
    const { tenant_id, ...rest } = validLease
    const result = leaseCreateSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('requires unit_id', () => {
    const { unit_id, ...rest } = validLease
    const result = leaseCreateSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('requires start_date', () => {
    const { start_date, ...rest } = validLease
    const result = leaseCreateSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('requires rent_amount', () => {
    const { rent_amount, ...rest } = validLease
    const result = leaseCreateSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('requires status', () => {
    const { status, ...rest } = validLease
    const result = leaseCreateSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('accepts valid minimal input', () => {
    const result = leaseCreateSchema.safeParse(validLease)
    expect(result.success).toBe(true)
  })

  it('validates tenant_id as uuid', () => {
    const result = leaseCreateSchema.safeParse({
      ...validLease,
      tenant_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('validates unit_id as uuid', () => {
    const result = leaseCreateSchema.safeParse({
      ...validLease,
      unit_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty start_date', () => {
    const result = leaseCreateSchema.safeParse({
      ...validLease,
      start_date: '',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional end_date', () => {
    const result = leaseCreateSchema.safeParse({
      ...validLease,
      end_date: '2025-01-01',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.end_date).toBe('2025-01-01')
    }
  })

  it('accepts null for end_date', () => {
    const result = leaseCreateSchema.safeParse({
      ...validLease,
      end_date: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative rent_amount', () => {
    const result = leaseCreateSchema.safeParse({
      ...validLease,
      rent_amount: -100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects rent_amount that is too high', () => {
    const result = leaseCreateSchema.safeParse({
      ...validLease,
      rent_amount: 100001,
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional notes', () => {
    const result = leaseCreateSchema.safeParse({
      ...validLease,
      notes: 'Annual lease agreement',
    })
    expect(result.success).toBe(true)
  })

  it('rejects notes that are too long', () => {
    const result = leaseCreateSchema.safeParse({
      ...validLease,
      notes: 'a'.repeat(10001),
    })
    expect(result.success).toBe(false)
  })
})

describe('leaseFullSchema', () => {
  const validLease = {
    tenant_id: '550e8400-e29b-41d4-a716-446655440000',
    unit_id: '550e8400-e29b-41d4-a716-446655440001',
    start_date: '2024-01-01',
    rent_amount: 1500,
    status: 'active' as const,
  }

  it('extends create schema', () => {
    const result = leaseFullSchema.safeParse(validLease)
    expect(result.success).toBe(true)
  })

  it('accepts security_deposit', () => {
    const result = leaseFullSchema.safeParse({
      ...validLease,
      security_deposit: 3000,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.security_deposit).toBe(3000)
    }
  })

  it('rejects negative security_deposit', () => {
    const result = leaseFullSchema.safeParse({
      ...validLease,
      security_deposit: -100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects security_deposit that is too high', () => {
    const result = leaseFullSchema.safeParse({
      ...validLease,
      security_deposit: 100001,
    })
    expect(result.success).toBe(false)
  })

  it('accepts deposit_returned_date', () => {
    const result = leaseFullSchema.safeParse({
      ...validLease,
      security_deposit: 3000,
      deposit_returned_date: '2025-02-01',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.deposit_returned_date).toBe('2025-02-01')
    }
  })

  it('accepts terms', () => {
    const result = leaseFullSchema.safeParse({
      ...validLease,
      terms: 'No pets allowed. Quiet hours from 10pm to 7am.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects terms that are too long', () => {
    const result = leaseFullSchema.safeParse({
      ...validLease,
      terms: 'a'.repeat(50001),
    })
    expect(result.success).toBe(false)
  })

  it('accepts null for all extended fields', () => {
    const result = leaseFullSchema.safeParse({
      ...validLease,
      security_deposit: null,
      deposit_returned_date: null,
      terms: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('leaseUpdateSchema', () => {
  it('allows empty object', () => {
    const result = leaseUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('allows partial updates', () => {
    const result = leaseUpdateSchema.safeParse({
      rent_amount: 1600,
    })
    expect(result.success).toBe(true)
  })

  it('allows updating status', () => {
    const result = leaseUpdateSchema.safeParse({
      status: 'terminated',
    })
    expect(result.success).toBe(true)
  })

  it('allows updating just security deposit info', () => {
    const result = leaseUpdateSchema.safeParse({
      security_deposit: 2500,
      deposit_returned_date: '2025-01-15',
    })
    expect(result.success).toBe(true)
  })

  it('still validates field constraints', () => {
    expect(
      leaseUpdateSchema.safeParse({ rent_amount: -100 }).success
    ).toBe(false)
    expect(
      leaseUpdateSchema.safeParse({ status: 'invalid' }).success
    ).toBe(false)
    expect(
      leaseUpdateSchema.safeParse({ tenant_id: 'not-uuid' }).success
    ).toBe(false)
  })
})
