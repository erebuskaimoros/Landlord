import { describe, it, expect } from 'vitest'
import {
  transactionTypeSchema,
  transactionCreateSchema,
  transactionFullSchema,
  transactionUpdateSchema,
} from '../transaction'

describe('transactionTypeSchema', () => {
  it('accepts valid type values', () => {
    expect(transactionTypeSchema.safeParse('income').success).toBe(true)
    expect(transactionTypeSchema.safeParse('expense').success).toBe(true)
  })

  it('rejects invalid type', () => {
    expect(transactionTypeSchema.safeParse('invalid').success).toBe(false)
    expect(transactionTypeSchema.safeParse('').success).toBe(false)
    expect(transactionTypeSchema.safeParse(null).success).toBe(false)
  })
})

describe('transactionCreateSchema', () => {
  const validTransaction = {
    type: 'income' as const,
    description: 'Monthly rent payment',
    transaction_date: '2024-01-01',
    actual_amount: 1500,
  }

  it('requires type', () => {
    const { type, ...rest } = validTransaction
    const result = transactionCreateSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('requires description', () => {
    const { description, ...rest } = validTransaction
    const result = transactionCreateSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('requires transaction_date', () => {
    const { transaction_date, ...rest } = validTransaction
    const result = transactionCreateSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('requires actual_amount', () => {
    const { actual_amount, ...rest } = validTransaction
    const result = transactionCreateSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('accepts valid minimal input', () => {
    const result = transactionCreateSchema.safeParse(validTransaction)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('income')
      expect(result.data.description).toBe('Monthly rent payment')
      expect(result.data.actual_amount).toBe(1500)
    }
  })

  it('rejects empty description', () => {
    const result = transactionCreateSchema.safeParse({
      ...validTransaction,
      description: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects description that is too long', () => {
    const result = transactionCreateSchema.safeParse({
      ...validTransaction,
      description: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty transaction_date', () => {
    const result = transactionCreateSchema.safeParse({
      ...validTransaction,
      transaction_date: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative actual_amount', () => {
    const result = transactionCreateSchema.safeParse({
      ...validTransaction,
      actual_amount: -100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects actual_amount that is too high', () => {
    const result = transactionCreateSchema.safeParse({
      ...validTransaction,
      actual_amount: 10000001,
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional category_id', () => {
    const result = transactionCreateSchema.safeParse({
      ...validTransaction,
      category_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('validates category_id as uuid', () => {
    const result = transactionCreateSchema.safeParse({
      ...validTransaction,
      category_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional unit_id', () => {
    const result = transactionCreateSchema.safeParse({
      ...validTransaction,
      unit_id: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(result.success).toBe(true)
  })

  it('validates unit_id as uuid', () => {
    const result = transactionCreateSchema.safeParse({
      ...validTransaction,
      unit_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional tenant_id', () => {
    const result = transactionCreateSchema.safeParse({
      ...validTransaction,
      tenant_id: '550e8400-e29b-41d4-a716-446655440002',
    })
    expect(result.success).toBe(true)
  })

  it('validates tenant_id as uuid', () => {
    const result = transactionCreateSchema.safeParse({
      ...validTransaction,
      tenant_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts null for optional uuid fields', () => {
    const result = transactionCreateSchema.safeParse({
      ...validTransaction,
      category_id: null,
      unit_id: null,
      tenant_id: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional notes', () => {
    const result = transactionCreateSchema.safeParse({
      ...validTransaction,
      notes: 'Paid on time',
    })
    expect(result.success).toBe(true)
  })

  it('rejects notes that are too long', () => {
    const result = transactionCreateSchema.safeParse({
      ...validTransaction,
      notes: 'a'.repeat(10001),
    })
    expect(result.success).toBe(false)
  })

  it('accepts expense type', () => {
    const result = transactionCreateSchema.safeParse({
      ...validTransaction,
      type: 'expense',
      description: 'Plumbing repair',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('expense')
    }
  })
})

describe('transactionFullSchema', () => {
  const validTransaction = {
    type: 'income' as const,
    description: 'Monthly rent payment',
    transaction_date: '2024-01-01',
    actual_amount: 1500,
  }

  it('extends create schema', () => {
    const result = transactionFullSchema.safeParse(validTransaction)
    expect(result.success).toBe(true)
  })

  it('accepts expected_amount', () => {
    const result = transactionFullSchema.safeParse({
      ...validTransaction,
      expected_amount: 1600,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.expected_amount).toBe(1600)
    }
  })

  it('rejects negative expected_amount', () => {
    const result = transactionFullSchema.safeParse({
      ...validTransaction,
      expected_amount: -100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects expected_amount that is too high', () => {
    const result = transactionFullSchema.safeParse({
      ...validTransaction,
      expected_amount: 10000001,
    })
    expect(result.success).toBe(false)
  })

  it('accepts null for expected_amount', () => {
    const result = transactionFullSchema.safeParse({
      ...validTransaction,
      expected_amount: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('transactionUpdateSchema', () => {
  it('allows empty object', () => {
    const result = transactionUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('allows partial updates', () => {
    const result = transactionUpdateSchema.safeParse({
      actual_amount: 1600,
    })
    expect(result.success).toBe(true)
  })

  it('allows updating type', () => {
    const result = transactionUpdateSchema.safeParse({
      type: 'expense',
    })
    expect(result.success).toBe(true)
  })

  it('allows updating amounts', () => {
    const result = transactionUpdateSchema.safeParse({
      expected_amount: 1500,
      actual_amount: 1400,
    })
    expect(result.success).toBe(true)
  })

  it('still validates field constraints', () => {
    expect(
      transactionUpdateSchema.safeParse({ actual_amount: -100 }).success
    ).toBe(false)
    expect(
      transactionUpdateSchema.safeParse({ type: 'invalid' }).success
    ).toBe(false)
    expect(
      transactionUpdateSchema.safeParse({ description: '' }).success
    ).toBe(false)
  })
})
