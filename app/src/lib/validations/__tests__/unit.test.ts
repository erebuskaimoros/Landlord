import { describe, it, expect } from 'vitest'
import {
  unitStatusSchema,
  unitCreateSchema,
  unitFullSchema,
  unitUpdateSchema,
} from '../unit'

describe('unitStatusSchema', () => {
  it('accepts valid status values', () => {
    expect(unitStatusSchema.safeParse('occupied').success).toBe(true)
    expect(unitStatusSchema.safeParse('vacant').success).toBe(true)
    expect(unitStatusSchema.safeParse('sold').success).toBe(true)
  })

  it('rejects invalid status', () => {
    expect(unitStatusSchema.safeParse('invalid').success).toBe(false)
    expect(unitStatusSchema.safeParse('').success).toBe(false)
    expect(unitStatusSchema.safeParse(null).success).toBe(false)
  })
})

describe('unitCreateSchema', () => {
  it('requires address', () => {
    const result = unitCreateSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('address')
    }
  })

  it('rejects empty address', () => {
    const result = unitCreateSchema.safeParse({ address: '' })
    expect(result.success).toBe(false)
  })

  it('rejects address that is too long', () => {
    const result = unitCreateSchema.safeParse({ address: 'a'.repeat(501) })
    expect(result.success).toBe(false)
  })

  it('accepts valid minimal input', () => {
    const result = unitCreateSchema.safeParse({ address: '123 Main St' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.address).toBe('123 Main St')
    }
  })

  it('accepts all optional fields', () => {
    const result = unitCreateSchema.safeParse({
      address: '123 Main St',
      unit_number: 'A',
      city: 'Portland',
      state: 'OR',
      zip_code: '97201',
      building_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('accepts null for optional fields', () => {
    const result = unitCreateSchema.safeParse({
      address: '123 Main St',
      unit_number: null,
      city: null,
      state: null,
      zip_code: null,
      building_id: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid uuid for building_id', () => {
    const result = unitCreateSchema.safeParse({
      address: '123 Main St',
      building_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects unit_number that is too long', () => {
    const result = unitCreateSchema.safeParse({
      address: '123 Main St',
      unit_number: 'a'.repeat(51),
    })
    expect(result.success).toBe(false)
  })
})

describe('unitFullSchema', () => {
  const validMinimal = { address: '123 Main St' }

  it('extends create schema', () => {
    const result = unitFullSchema.safeParse(validMinimal)
    expect(result.success).toBe(true)
  })

  it('defaults status to vacant', () => {
    const result = unitFullSchema.safeParse(validMinimal)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('vacant')
    }
  })

  it('accepts all property details', () => {
    const result = unitFullSchema.safeParse({
      ...validMinimal,
      property_type: 'Single Family',
      bedrooms: 3,
      bathrooms: 2,
      square_footage: 1500,
      year_built: 1990,
      status: 'occupied',
      listing_description: 'Beautiful home',
      rental_price: 2000,
      pet_policy: 'Cats allowed',
      amenities: ['garage', 'laundry'],
      notes: 'Great location',
    })
    expect(result.success).toBe(true)
  })

  it('coerces string numbers to numbers', () => {
    const result = unitFullSchema.safeParse({
      ...validMinimal,
      bedrooms: '3',
      bathrooms: '2.5',
      square_footage: '1500',
      year_built: '1990',
      rental_price: '2000',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.bedrooms).toBe(3)
      expect(result.data.bathrooms).toBe(2.5)
      expect(result.data.square_footage).toBe(1500)
      expect(result.data.year_built).toBe(1990)
      expect(result.data.rental_price).toBe(2000)
    }
  })

  it('validates bedroom count range', () => {
    expect(
      unitFullSchema.safeParse({ ...validMinimal, bedrooms: -1 }).success
    ).toBe(false)
    expect(
      unitFullSchema.safeParse({ ...validMinimal, bedrooms: 21 }).success
    ).toBe(false)
    expect(
      unitFullSchema.safeParse({ ...validMinimal, bedrooms: 20 }).success
    ).toBe(true)
  })

  it('validates bathroom count range', () => {
    expect(
      unitFullSchema.safeParse({ ...validMinimal, bathrooms: -1 }).success
    ).toBe(false)
    expect(
      unitFullSchema.safeParse({ ...validMinimal, bathrooms: 21 }).success
    ).toBe(false)
  })

  it('validates square footage range', () => {
    expect(
      unitFullSchema.safeParse({ ...validMinimal, square_footage: -1 }).success
    ).toBe(false)
    expect(
      unitFullSchema.safeParse({ ...validMinimal, square_footage: 100001 })
        .success
    ).toBe(false)
  })

  it('validates year built range', () => {
    expect(
      unitFullSchema.safeParse({ ...validMinimal, year_built: 1799 }).success
    ).toBe(false)
    const futureYear = new Date().getFullYear() + 6
    expect(
      unitFullSchema.safeParse({ ...validMinimal, year_built: futureYear })
        .success
    ).toBe(false)
  })

  it('validates rental price range', () => {
    expect(
      unitFullSchema.safeParse({ ...validMinimal, rental_price: -1 }).success
    ).toBe(false)
    expect(
      unitFullSchema.safeParse({ ...validMinimal, rental_price: 1000001 })
        .success
    ).toBe(false)
  })

  it('validates listing description length', () => {
    expect(
      unitFullSchema.safeParse({
        ...validMinimal,
        listing_description: 'a'.repeat(5001),
      }).success
    ).toBe(false)
  })

  it('accepts amenities array', () => {
    const result = unitFullSchema.safeParse({
      ...validMinimal,
      amenities: ['pool', 'gym', 'parking'],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.amenities).toEqual(['pool', 'gym', 'parking'])
    }
  })
})

describe('unitUpdateSchema', () => {
  it('allows empty object', () => {
    const result = unitUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('allows partial updates', () => {
    const result = unitUpdateSchema.safeParse({
      city: 'Seattle',
      bedrooms: 4,
    })
    expect(result.success).toBe(true)
  })

  it('still validates field constraints', () => {
    expect(
      unitUpdateSchema.safeParse({ bedrooms: -1 }).success
    ).toBe(false)
    expect(
      unitUpdateSchema.safeParse({ address: '' }).success
    ).toBe(false)
  })
})
