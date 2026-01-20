import { describe, it, expect } from 'vitest'
import {
  serviceTypeSchema,
  serviceTypeOptions,
  contractorCreateSchema,
  contractorFullSchema,
  contractorUpdateSchema,
  formatServiceType,
} from '../contractor'

describe('serviceTypeSchema', () => {
  it('accepts valid service types', () => {
    for (const type of serviceTypeOptions) {
      expect(serviceTypeSchema.safeParse(type).success).toBe(true)
    }
  })

  it('rejects invalid service type', () => {
    expect(serviceTypeSchema.safeParse('invalid').success).toBe(false)
    expect(serviceTypeSchema.safeParse('').success).toBe(false)
    expect(serviceTypeSchema.safeParse(null).success).toBe(false)
  })
})

describe('contractorCreateSchema', () => {
  it('requires name', () => {
    const result = contractorCreateSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
    }
  })

  it('rejects empty name', () => {
    const result = contractorCreateSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name that is too long', () => {
    const result = contractorCreateSchema.safeParse({ name: 'a'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('accepts valid minimal input', () => {
    const result = contractorCreateSchema.safeParse({ name: 'ABC Plumbing' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('ABC Plumbing')
    }
  })

  it('accepts optional email', () => {
    const result = contractorCreateSchema.safeParse({
      name: 'ABC Plumbing',
      email: 'contact@abcplumbing.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = contractorCreateSchema.safeParse({
      name: 'ABC Plumbing',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string for email', () => {
    const result = contractorCreateSchema.safeParse({
      name: 'ABC Plumbing',
      email: '',
    })
    expect(result.success).toBe(true)
  })

  it('accepts null for optional fields', () => {
    const result = contractorCreateSchema.safeParse({
      name: 'ABC Plumbing',
      email: null,
      phone: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects phone that is too long', () => {
    const result = contractorCreateSchema.safeParse({
      name: 'ABC Plumbing',
      phone: 'a'.repeat(51),
    })
    expect(result.success).toBe(false)
  })
})

describe('contractorFullSchema', () => {
  const validMinimal = { name: 'ABC Plumbing' }

  it('extends create schema', () => {
    const result = contractorFullSchema.safeParse(validMinimal)
    expect(result.success).toBe(true)
  })

  it('defaults service_types to empty array', () => {
    const result = contractorFullSchema.safeParse(validMinimal)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.service_types).toEqual([])
    }
  })

  it('accepts all optional fields', () => {
    const result = contractorFullSchema.safeParse({
      ...validMinimal,
      email: 'contact@abc.com',
      phone: '555-123-4567',
      address: '123 Main St, Portland, OR 97201',
      service_types: ['plumbing', 'hvac'],
      hourly_rate: 75,
      notes: 'Great contractor, very reliable',
    })
    expect(result.success).toBe(true)
  })

  it('coerces string numbers for hourly_rate', () => {
    const result = contractorFullSchema.safeParse({
      ...validMinimal,
      hourly_rate: '75.50',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.hourly_rate).toBe(75.5)
    }
  })

  it('validates hourly_rate range', () => {
    expect(
      contractorFullSchema.safeParse({ ...validMinimal, hourly_rate: -1 }).success
    ).toBe(false)
    expect(
      contractorFullSchema.safeParse({ ...validMinimal, hourly_rate: 10001 }).success
    ).toBe(false)
    expect(
      contractorFullSchema.safeParse({ ...validMinimal, hourly_rate: 10000 }).success
    ).toBe(true)
  })

  it('validates address length', () => {
    expect(
      contractorFullSchema.safeParse({
        ...validMinimal,
        address: 'a'.repeat(501),
      }).success
    ).toBe(false)
  })

  it('validates notes length', () => {
    expect(
      contractorFullSchema.safeParse({
        ...validMinimal,
        notes: 'a'.repeat(10001),
      }).success
    ).toBe(false)
  })

  it('accepts service_types array', () => {
    const result = contractorFullSchema.safeParse({
      ...validMinimal,
      service_types: ['plumbing', 'electrical', 'hvac'],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.service_types).toEqual(['plumbing', 'electrical', 'hvac'])
    }
  })
})

describe('contractorUpdateSchema', () => {
  it('allows empty object', () => {
    const result = contractorUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('allows partial updates', () => {
    const result = contractorUpdateSchema.safeParse({
      phone: '555-999-8888',
      hourly_rate: 100,
    })
    expect(result.success).toBe(true)
  })

  it('still validates field constraints', () => {
    expect(
      contractorUpdateSchema.safeParse({ hourly_rate: -1 }).success
    ).toBe(false)
    expect(
      contractorUpdateSchema.safeParse({ name: '' }).success
    ).toBe(false)
  })
})

describe('formatServiceType', () => {
  it('formats single word types', () => {
    expect(formatServiceType('plumbing')).toBe('Plumbing')
    expect(formatServiceType('electrical')).toBe('Electrical')
  })

  it('formats multi-word types with underscores', () => {
    expect(formatServiceType('appliance_repair')).toBe('Appliance Repair')
    expect(formatServiceType('general_maintenance')).toBe('General Maintenance')
    expect(formatServiceType('pest_control')).toBe('Pest Control')
  })
})
