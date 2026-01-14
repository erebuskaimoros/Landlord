import { describe, it, expect } from 'vitest'
import {
  tenantCreateSchema,
  tenantFullSchema,
  tenantUpdateSchema,
} from '../tenant'

describe('tenantCreateSchema', () => {
  it('requires first_name', () => {
    const result = tenantCreateSchema.safeParse({ last_name: 'Doe' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('first_name')
    }
  })

  it('requires last_name', () => {
    const result = tenantCreateSchema.safeParse({ first_name: 'John' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('last_name')
    }
  })

  it('rejects empty first_name', () => {
    const result = tenantCreateSchema.safeParse({
      first_name: '',
      last_name: 'Doe',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty last_name', () => {
    const result = tenantCreateSchema.safeParse({
      first_name: 'John',
      last_name: '',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid minimal input', () => {
    const result = tenantCreateSchema.safeParse({
      first_name: 'John',
      last_name: 'Doe',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.first_name).toBe('John')
      expect(result.data.last_name).toBe('Doe')
    }
  })

  it('accepts all optional fields', () => {
    const result = tenantCreateSchema.safeParse({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '555-123-4567',
      notes: 'Great tenant',
    })
    expect(result.success).toBe(true)
  })

  it('accepts null for optional fields', () => {
    const result = tenantCreateSchema.safeParse({
      first_name: 'John',
      last_name: 'Doe',
      email: null,
      phone: null,
      notes: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty string for email (optional)', () => {
    const result = tenantCreateSchema.safeParse({
      first_name: 'John',
      last_name: 'Doe',
      email: '',
    })
    expect(result.success).toBe(true)
  })

  it('validates email format', () => {
    const result = tenantCreateSchema.safeParse({
      first_name: 'John',
      last_name: 'Doe',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid email', () => {
    const result = tenantCreateSchema.safeParse({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects first_name that is too long', () => {
    const result = tenantCreateSchema.safeParse({
      first_name: 'a'.repeat(101),
      last_name: 'Doe',
    })
    expect(result.success).toBe(false)
  })

  it('rejects last_name that is too long', () => {
    const result = tenantCreateSchema.safeParse({
      first_name: 'John',
      last_name: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('rejects notes that are too long', () => {
    const result = tenantCreateSchema.safeParse({
      first_name: 'John',
      last_name: 'Doe',
      notes: 'a'.repeat(10001),
    })
    expect(result.success).toBe(false)
  })
})

describe('tenantFullSchema', () => {
  const validMinimal = { first_name: 'John', last_name: 'Doe' }

  it('extends create schema', () => {
    const result = tenantFullSchema.safeParse(validMinimal)
    expect(result.success).toBe(true)
  })

  it('accepts emergency contact fields', () => {
    const result = tenantFullSchema.safeParse({
      ...validMinimal,
      emergency_contact_name: 'Jane Doe',
      emergency_contact_phone: '555-987-6543',
      emergency_contact_relationship: 'Spouse',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.emergency_contact_name).toBe('Jane Doe')
      expect(result.data.emergency_contact_phone).toBe('555-987-6543')
      expect(result.data.emergency_contact_relationship).toBe('Spouse')
    }
  })

  it('accepts null for emergency contact fields', () => {
    const result = tenantFullSchema.safeParse({
      ...validMinimal,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      emergency_contact_relationship: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects emergency_contact_name that is too long', () => {
    const result = tenantFullSchema.safeParse({
      ...validMinimal,
      emergency_contact_name: 'a'.repeat(201),
    })
    expect(result.success).toBe(false)
  })

  it('rejects emergency_contact_relationship that is too long', () => {
    const result = tenantFullSchema.safeParse({
      ...validMinimal,
      emergency_contact_relationship: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })
})

describe('tenantUpdateSchema', () => {
  it('allows empty object', () => {
    const result = tenantUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('allows partial updates', () => {
    const result = tenantUpdateSchema.safeParse({
      phone: '555-999-8888',
    })
    expect(result.success).toBe(true)
  })

  it('allows updating just emergency contact', () => {
    const result = tenantUpdateSchema.safeParse({
      emergency_contact_name: 'New Contact',
      emergency_contact_phone: '555-111-2222',
    })
    expect(result.success).toBe(true)
  })

  it('still validates field constraints', () => {
    expect(
      tenantUpdateSchema.safeParse({ first_name: '' }).success
    ).toBe(false)
    expect(
      tenantUpdateSchema.safeParse({ email: 'invalid' }).success
    ).toBe(false)
  })
})
