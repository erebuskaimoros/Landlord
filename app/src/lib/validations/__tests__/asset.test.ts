import { describe, it, expect } from 'vitest'
import {
  assetTypeSchema,
  assetConditionSchema,
  assetTypeOptions,
  assetConditionOptions,
  assetCreateSchema,
  assetFullSchema,
  assetUpdateSchema,
  formatAssetType,
  formatCondition,
  getConditionColor,
} from '../asset'

describe('assetTypeSchema', () => {
  it('accepts valid asset types', () => {
    for (const type of assetTypeOptions) {
      expect(assetTypeSchema.safeParse(type).success).toBe(true)
    }
  })

  it('rejects invalid asset type', () => {
    expect(assetTypeSchema.safeParse('invalid').success).toBe(false)
    expect(assetTypeSchema.safeParse('').success).toBe(false)
    expect(assetTypeSchema.safeParse(null).success).toBe(false)
  })
})

describe('assetConditionSchema', () => {
  it('accepts valid condition values', () => {
    for (const condition of assetConditionOptions) {
      expect(assetConditionSchema.safeParse(condition).success).toBe(true)
    }
  })

  it('rejects invalid condition', () => {
    expect(assetConditionSchema.safeParse('broken').success).toBe(false)
    expect(assetConditionSchema.safeParse('').success).toBe(false)
    expect(assetConditionSchema.safeParse(null).success).toBe(false)
  })
})

describe('assetCreateSchema', () => {
  const validUnitId = '550e8400-e29b-41d4-a716-446655440000'

  it('requires name', () => {
    const result = assetCreateSchema.safeParse({
      asset_type: 'refrigerator',
      unit_id: validUnitId,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
    }
  })

  it('requires asset_type', () => {
    const result = assetCreateSchema.safeParse({
      name: 'Kitchen Fridge',
      unit_id: validUnitId,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('asset_type')
    }
  })

  it('requires unit_id', () => {
    const result = assetCreateSchema.safeParse({
      name: 'Kitchen Fridge',
      asset_type: 'refrigerator',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('unit_id')
    }
  })

  it('rejects empty name', () => {
    const result = assetCreateSchema.safeParse({
      name: '',
      asset_type: 'refrigerator',
      unit_id: validUnitId,
    })
    expect(result.success).toBe(false)
  })

  it('rejects name that is too long', () => {
    const result = assetCreateSchema.safeParse({
      name: 'a'.repeat(256),
      asset_type: 'refrigerator',
      unit_id: validUnitId,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid uuid for unit_id', () => {
    const result = assetCreateSchema.safeParse({
      name: 'Kitchen Fridge',
      asset_type: 'refrigerator',
      unit_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid minimal input', () => {
    const result = assetCreateSchema.safeParse({
      name: 'Kitchen Refrigerator',
      asset_type: 'refrigerator',
      unit_id: validUnitId,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Kitchen Refrigerator')
      expect(result.data.asset_type).toBe('refrigerator')
      expect(result.data.unit_id).toBe(validUnitId)
    }
  })
})

describe('assetFullSchema', () => {
  const validUnitId = '550e8400-e29b-41d4-a716-446655440000'
  const validMinimal = {
    name: 'Kitchen Refrigerator',
    asset_type: 'refrigerator',
    unit_id: validUnitId,
  }

  it('extends create schema', () => {
    const result = assetFullSchema.safeParse(validMinimal)
    expect(result.success).toBe(true)
  })

  it('defaults condition to good', () => {
    const result = assetFullSchema.safeParse(validMinimal)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.condition).toBe('good')
    }
  })

  it('accepts all optional fields', () => {
    const result = assetFullSchema.safeParse({
      ...validMinimal,
      make: 'Samsung',
      model: 'RF28R7551SR',
      serial_number: 'SN123456789',
      purchase_date: '2023-01-15',
      purchase_price: 2500,
      warranty_expiry: '2028-01-15',
      expected_lifespan_years: 15,
      condition: 'excellent',
      notes: 'Stainless steel, French door model',
    })
    expect(result.success).toBe(true)
  })

  it('coerces string numbers for purchase_price', () => {
    const result = assetFullSchema.safeParse({
      ...validMinimal,
      purchase_price: '2500.99',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.purchase_price).toBe(2500.99)
    }
  })

  it('coerces string numbers for expected_lifespan_years', () => {
    const result = assetFullSchema.safeParse({
      ...validMinimal,
      expected_lifespan_years: '15',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.expected_lifespan_years).toBe(15)
    }
  })

  it('validates purchase_price range', () => {
    expect(
      assetFullSchema.safeParse({ ...validMinimal, purchase_price: -1 }).success
    ).toBe(false)
    expect(
      assetFullSchema.safeParse({ ...validMinimal, purchase_price: 1000001 }).success
    ).toBe(false)
    expect(
      assetFullSchema.safeParse({ ...validMinimal, purchase_price: 1000000 }).success
    ).toBe(true)
  })

  it('validates expected_lifespan_years range', () => {
    expect(
      assetFullSchema.safeParse({ ...validMinimal, expected_lifespan_years: 0 }).success
    ).toBe(false)
    expect(
      assetFullSchema.safeParse({ ...validMinimal, expected_lifespan_years: 101 }).success
    ).toBe(false)
    expect(
      assetFullSchema.safeParse({ ...validMinimal, expected_lifespan_years: 100 }).success
    ).toBe(true)
  })

  it('validates make length', () => {
    expect(
      assetFullSchema.safeParse({
        ...validMinimal,
        make: 'a'.repeat(101),
      }).success
    ).toBe(false)
  })

  it('validates model length', () => {
    expect(
      assetFullSchema.safeParse({
        ...validMinimal,
        model: 'a'.repeat(101),
      }).success
    ).toBe(false)
  })

  it('validates serial_number length', () => {
    expect(
      assetFullSchema.safeParse({
        ...validMinimal,
        serial_number: 'a'.repeat(101),
      }).success
    ).toBe(false)
  })

  it('validates notes length', () => {
    expect(
      assetFullSchema.safeParse({
        ...validMinimal,
        notes: 'a'.repeat(10001),
      }).success
    ).toBe(false)
  })

  it('accepts null for optional fields', () => {
    const result = assetFullSchema.safeParse({
      ...validMinimal,
      make: null,
      model: null,
      serial_number: null,
      purchase_date: null,
      purchase_price: null,
      warranty_expiry: null,
      expected_lifespan_years: null,
      notes: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('assetUpdateSchema', () => {
  it('allows empty object', () => {
    const result = assetUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('allows partial updates', () => {
    const result = assetUpdateSchema.safeParse({
      condition: 'fair',
      notes: 'Needs maintenance soon',
    })
    expect(result.success).toBe(true)
  })

  it('still validates field constraints', () => {
    expect(
      assetUpdateSchema.safeParse({ purchase_price: -1 }).success
    ).toBe(false)
    expect(
      assetUpdateSchema.safeParse({ name: '' }).success
    ).toBe(false)
  })
})

describe('formatAssetType', () => {
  it('formats single word types', () => {
    expect(formatAssetType('refrigerator')).toBe('Refrigerator')
    expect(formatAssetType('stove')).toBe('Stove')
    expect(formatAssetType('hvac')).toBe('Hvac')
  })

  it('formats multi-word types with underscores', () => {
    expect(formatAssetType('water_heater')).toBe('Water Heater')
    expect(formatAssetType('garbage_disposal')).toBe('Garbage Disposal')
    expect(formatAssetType('smoke_detector')).toBe('Smoke Detector')
    expect(formatAssetType('garage_door_opener')).toBe('Garage Door Opener')
  })
})

describe('formatCondition', () => {
  it('capitalizes condition values', () => {
    expect(formatCondition('excellent')).toBe('Excellent')
    expect(formatCondition('good')).toBe('Good')
    expect(formatCondition('fair')).toBe('Fair')
    expect(formatCondition('poor')).toBe('Poor')
  })
})

describe('getConditionColor', () => {
  it('returns correct colors for all conditions', () => {
    expect(getConditionColor('excellent')).toBe('bg-green-100 text-green-800')
    expect(getConditionColor('good')).toBe('bg-blue-100 text-blue-800')
    expect(getConditionColor('fair')).toBe('bg-yellow-100 text-yellow-800')
    expect(getConditionColor('poor')).toBe('bg-red-100 text-red-800')
  })

  it('returns default color for unknown condition', () => {
    expect(getConditionColor('unknown')).toBe('bg-gray-100 text-gray-800')
  })
})
