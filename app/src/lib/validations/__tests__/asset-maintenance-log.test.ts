import { describe, it, expect } from 'vitest'
import {
  serviceTypeSchema,
  serviceTypeOptions,
  maintenanceLogCreateSchema,
  maintenanceLogUpdateSchema,
  formatServiceType,
} from '../asset-maintenance-log'

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

describe('maintenanceLogCreateSchema', () => {
  const validAssetId = '550e8400-e29b-41d4-a716-446655440000'
  const validContractorId = '660e8400-e29b-41d4-a716-446655440001'
  const validTaskId = '770e8400-e29b-41d4-a716-446655440002'

  it('requires asset_id', () => {
    const result = maintenanceLogCreateSchema.safeParse({
      service_date: '2025-01-15',
      service_type: 'repair',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('asset_id')
    }
  })

  it('requires service_date', () => {
    const result = maintenanceLogCreateSchema.safeParse({
      asset_id: validAssetId,
      service_type: 'repair',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('service_date')
    }
  })

  it('requires service_type', () => {
    const result = maintenanceLogCreateSchema.safeParse({
      asset_id: validAssetId,
      service_date: '2025-01-15',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('service_type')
    }
  })

  it('rejects empty service_date', () => {
    const result = maintenanceLogCreateSchema.safeParse({
      asset_id: validAssetId,
      service_date: '',
      service_type: 'repair',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty service_type', () => {
    const result = maintenanceLogCreateSchema.safeParse({
      asset_id: validAssetId,
      service_date: '2025-01-15',
      service_type: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid uuid for asset_id', () => {
    const result = maintenanceLogCreateSchema.safeParse({
      asset_id: 'not-a-uuid',
      service_date: '2025-01-15',
      service_type: 'repair',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid minimal input', () => {
    const result = maintenanceLogCreateSchema.safeParse({
      asset_id: validAssetId,
      service_date: '2025-01-15',
      service_type: 'repair',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.asset_id).toBe(validAssetId)
      expect(result.data.service_date).toBe('2025-01-15')
      expect(result.data.service_type).toBe('repair')
    }
  })

  it('accepts all optional fields', () => {
    const result = maintenanceLogCreateSchema.safeParse({
      asset_id: validAssetId,
      service_date: '2025-01-15',
      service_type: 'repair',
      description: 'Replaced compressor motor',
      cost: 350.50,
      performed_by: 'ABC HVAC Services',
      contractor_id: validContractorId,
      task_id: validTaskId,
      notes: 'Covered under warranty',
    })
    expect(result.success).toBe(true)
  })

  it('coerces string numbers for cost', () => {
    const result = maintenanceLogCreateSchema.safeParse({
      asset_id: validAssetId,
      service_date: '2025-01-15',
      service_type: 'repair',
      cost: '350.50',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cost).toBe(350.5)
    }
  })

  it('validates cost range', () => {
    expect(
      maintenanceLogCreateSchema.safeParse({
        asset_id: validAssetId,
        service_date: '2025-01-15',
        service_type: 'repair',
        cost: -1,
      }).success
    ).toBe(false)

    expect(
      maintenanceLogCreateSchema.safeParse({
        asset_id: validAssetId,
        service_date: '2025-01-15',
        service_type: 'repair',
        cost: 1000001,
      }).success
    ).toBe(false)

    expect(
      maintenanceLogCreateSchema.safeParse({
        asset_id: validAssetId,
        service_date: '2025-01-15',
        service_type: 'repair',
        cost: 1000000,
      }).success
    ).toBe(true)
  })

  it('validates service_type length', () => {
    const result = maintenanceLogCreateSchema.safeParse({
      asset_id: validAssetId,
      service_date: '2025-01-15',
      service_type: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('validates description length', () => {
    const result = maintenanceLogCreateSchema.safeParse({
      asset_id: validAssetId,
      service_date: '2025-01-15',
      service_type: 'repair',
      description: 'a'.repeat(5001),
    })
    expect(result.success).toBe(false)
  })

  it('validates performed_by length', () => {
    const result = maintenanceLogCreateSchema.safeParse({
      asset_id: validAssetId,
      service_date: '2025-01-15',
      service_type: 'repair',
      performed_by: 'a'.repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it('validates notes length', () => {
    const result = maintenanceLogCreateSchema.safeParse({
      asset_id: validAssetId,
      service_date: '2025-01-15',
      service_type: 'repair',
      notes: 'a'.repeat(10001),
    })
    expect(result.success).toBe(false)
  })

  it('validates contractor_id uuid format', () => {
    const result = maintenanceLogCreateSchema.safeParse({
      asset_id: validAssetId,
      service_date: '2025-01-15',
      service_type: 'repair',
      contractor_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('validates task_id uuid format', () => {
    const result = maintenanceLogCreateSchema.safeParse({
      asset_id: validAssetId,
      service_date: '2025-01-15',
      service_type: 'repair',
      task_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts null for optional fields', () => {
    const result = maintenanceLogCreateSchema.safeParse({
      asset_id: validAssetId,
      service_date: '2025-01-15',
      service_type: 'repair',
      description: null,
      cost: null,
      performed_by: null,
      contractor_id: null,
      task_id: null,
      notes: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('maintenanceLogUpdateSchema', () => {
  it('allows empty object', () => {
    const result = maintenanceLogUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('allows partial updates', () => {
    const result = maintenanceLogUpdateSchema.safeParse({
      cost: 400,
      notes: 'Updated cost after final invoice',
    })
    expect(result.success).toBe(true)
  })

  it('still validates field constraints', () => {
    expect(
      maintenanceLogUpdateSchema.safeParse({ cost: -1 }).success
    ).toBe(false)
    expect(
      maintenanceLogUpdateSchema.safeParse({ service_type: '' }).success
    ).toBe(false)
  })
})

describe('formatServiceType', () => {
  it('formats single word types', () => {
    expect(formatServiceType('repair')).toBe('Repair')
    expect(formatServiceType('replacement')).toBe('Replacement')
    expect(formatServiceType('inspection')).toBe('Inspection')
  })

  it('formats multi-word types with underscores', () => {
    expect(formatServiceType('preventive_maintenance')).toBe('Preventive Maintenance')
    expect(formatServiceType('emergency_repair')).toBe('Emergency Repair')
    expect(formatServiceType('warranty_service')).toBe('Warranty Service')
  })
})
