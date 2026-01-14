import { describe, it, expect } from 'vitest'
import { buildingCreateSchema, buildingUpdateSchema } from '../building'

describe('buildingCreateSchema', () => {
  it('requires name', () => {
    const result = buildingCreateSchema.safeParse({ address: '123 Main St' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
    }
  })

  it('requires address', () => {
    const result = buildingCreateSchema.safeParse({ name: 'Main Building' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('address')
    }
  })

  it('rejects empty name', () => {
    const result = buildingCreateSchema.safeParse({
      name: '',
      address: '123 Main St',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty address', () => {
    const result = buildingCreateSchema.safeParse({
      name: 'Main Building',
      address: '',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid minimal input', () => {
    const result = buildingCreateSchema.safeParse({
      name: 'Main Building',
      address: '123 Main St',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Main Building')
      expect(result.data.address).toBe('123 Main St')
    }
  })

  it('accepts optional notes', () => {
    const result = buildingCreateSchema.safeParse({
      name: 'Main Building',
      address: '123 Main St',
      notes: 'Historic building from 1920s',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.notes).toBe('Historic building from 1920s')
    }
  })

  it('accepts null for notes', () => {
    const result = buildingCreateSchema.safeParse({
      name: 'Main Building',
      address: '123 Main St',
      notes: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects name that is too long', () => {
    const result = buildingCreateSchema.safeParse({
      name: 'a'.repeat(201),
      address: '123 Main St',
    })
    expect(result.success).toBe(false)
  })

  it('rejects address that is too long', () => {
    const result = buildingCreateSchema.safeParse({
      name: 'Main Building',
      address: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it('rejects notes that are too long', () => {
    const result = buildingCreateSchema.safeParse({
      name: 'Main Building',
      address: '123 Main St',
      notes: 'a'.repeat(10001),
    })
    expect(result.success).toBe(false)
  })
})

describe('buildingUpdateSchema', () => {
  it('allows empty object', () => {
    const result = buildingUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('allows partial updates', () => {
    const result = buildingUpdateSchema.safeParse({
      name: 'New Name',
    })
    expect(result.success).toBe(true)
  })

  it('allows updating just notes', () => {
    const result = buildingUpdateSchema.safeParse({
      notes: 'Updated notes',
    })
    expect(result.success).toBe(true)
  })

  it('still validates field constraints', () => {
    expect(
      buildingUpdateSchema.safeParse({ name: '' }).success
    ).toBe(false)
    expect(
      buildingUpdateSchema.safeParse({ address: '' }).success
    ).toBe(false)
    expect(
      buildingUpdateSchema.safeParse({ name: 'a'.repeat(201) }).success
    ).toBe(false)
  })
})
