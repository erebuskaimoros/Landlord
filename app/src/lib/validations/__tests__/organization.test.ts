import { describe, it, expect } from 'vitest'
import {
  organizationSchema,
  invitationSchema,
  profileSchema,
} from '../organization'

describe('organizationSchema', () => {
  it('requires name', () => {
    const result = organizationSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
    }
  })

  it('rejects empty name', () => {
    const result = organizationSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('accepts valid name', () => {
    const result = organizationSchema.safeParse({ name: 'My Property Company' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('My Property Company')
    }
  })

  it('rejects name that is too long', () => {
    const result = organizationSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('accepts name at max length', () => {
    const result = organizationSchema.safeParse({ name: 'a'.repeat(100) })
    expect(result.success).toBe(true)
  })
})

describe('invitationSchema', () => {
  it('requires email', () => {
    const result = invitationSchema.safeParse({ role: 'manager' })
    expect(result.success).toBe(false)
  })

  it('requires role', () => {
    const result = invitationSchema.safeParse({ email: 'test@example.com' })
    expect(result.success).toBe(false)
  })

  it('validates email format', () => {
    const result = invitationSchema.safeParse({
      email: 'not-an-email',
      role: 'manager',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid email', () => {
    const result = invitationSchema.safeParse({
      email: 'test@example.com',
      role: 'manager',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('test@example.com')
    }
  })

  it('accepts owner role', () => {
    const result = invitationSchema.safeParse({
      email: 'test@example.com',
      role: 'owner',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toBe('owner')
    }
  })

  it('accepts manager role', () => {
    const result = invitationSchema.safeParse({
      email: 'test@example.com',
      role: 'manager',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toBe('manager')
    }
  })

  it('accepts viewer role', () => {
    const result = invitationSchema.safeParse({
      email: 'test@example.com',
      role: 'viewer',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toBe('viewer')
    }
  })

  it('rejects invalid role', () => {
    const result = invitationSchema.safeParse({
      email: 'test@example.com',
      role: 'admin',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty role', () => {
    const result = invitationSchema.safeParse({
      email: 'test@example.com',
      role: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('profileSchema', () => {
  it('requires full_name', () => {
    const result = profileSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('full_name')
    }
  })

  it('rejects empty full_name', () => {
    const result = profileSchema.safeParse({ full_name: '' })
    expect(result.success).toBe(false)
  })

  it('accepts valid full_name', () => {
    const result = profileSchema.safeParse({ full_name: 'John Doe' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.full_name).toBe('John Doe')
    }
  })

  it('rejects full_name that is too long', () => {
    const result = profileSchema.safeParse({ full_name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('accepts optional phone', () => {
    const result = profileSchema.safeParse({
      full_name: 'John Doe',
      phone: '555-123-4567',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.phone).toBe('555-123-4567')
    }
  })

  it('accepts null for phone', () => {
    const result = profileSchema.safeParse({
      full_name: 'John Doe',
      phone: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts undefined for phone', () => {
    const result = profileSchema.safeParse({
      full_name: 'John Doe',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.phone).toBeUndefined()
    }
  })
})
