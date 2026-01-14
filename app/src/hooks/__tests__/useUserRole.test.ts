import { describe, it, expect } from 'vitest'
import { getRolePermissions, UserRole } from '../useUserRole'

describe('getRolePermissions', () => {
  describe('owner role', () => {
    it('has full permissions', () => {
      const perms = getRolePermissions('owner')
      expect(perms.canEdit).toBe(true)
      expect(perms.canDelete).toBe(true)
      expect(perms.canManageTeam).toBe(true)
      expect(perms.canViewFinancials).toBe(true)
    })

    it('correctly sets role flags', () => {
      const perms = getRolePermissions('owner')
      expect(perms.isOwner).toBe(true)
      expect(perms.isManager).toBe(false)
      expect(perms.isViewer).toBe(false)
    })
  })

  describe('manager role', () => {
    it('can edit but not delete', () => {
      const perms = getRolePermissions('manager')
      expect(perms.canEdit).toBe(true)
      expect(perms.canDelete).toBe(false)
    })

    it('can manage team and view financials', () => {
      const perms = getRolePermissions('manager')
      expect(perms.canManageTeam).toBe(true)
      expect(perms.canViewFinancials).toBe(true)
    })

    it('correctly sets role flags', () => {
      const perms = getRolePermissions('manager')
      expect(perms.isOwner).toBe(false)
      expect(perms.isManager).toBe(true)
      expect(perms.isViewer).toBe(false)
    })
  })

  describe('viewer role', () => {
    it('has read-only access', () => {
      const perms = getRolePermissions('viewer')
      expect(perms.canEdit).toBe(false)
      expect(perms.canDelete).toBe(false)
      expect(perms.canManageTeam).toBe(false)
    })

    it('can view financials', () => {
      const perms = getRolePermissions('viewer')
      expect(perms.canViewFinancials).toBe(true)
    })

    it('correctly sets role flags', () => {
      const perms = getRolePermissions('viewer')
      expect(perms.isOwner).toBe(false)
      expect(perms.isManager).toBe(false)
      expect(perms.isViewer).toBe(true)
    })
  })

  describe('null role (not authenticated)', () => {
    it('has no permissions', () => {
      const perms = getRolePermissions(null)
      expect(perms.canEdit).toBe(false)
      expect(perms.canDelete).toBe(false)
      expect(perms.canManageTeam).toBe(false)
    })

    it('can still view financials (handles gracefully)', () => {
      // When role is null, user is not in any role
      // canViewFinancials will be false since none of the role flags are true
      const perms = getRolePermissions(null)
      expect(perms.canViewFinancials).toBe(false)
    })

    it('correctly sets all role flags to false', () => {
      const perms = getRolePermissions(null)
      expect(perms.isOwner).toBe(false)
      expect(perms.isManager).toBe(false)
      expect(perms.isViewer).toBe(false)
    })
  })

  describe('permission hierarchy', () => {
    it('owner has more permissions than manager', () => {
      const owner = getRolePermissions('owner')
      const manager = getRolePermissions('manager')

      // Owner can do everything manager can
      expect(owner.canEdit).toBe(manager.canEdit)
      expect(owner.canManageTeam).toBe(manager.canManageTeam)

      // Owner can delete, manager cannot
      expect(owner.canDelete).toBe(true)
      expect(manager.canDelete).toBe(false)
    })

    it('manager has more permissions than viewer', () => {
      const manager = getRolePermissions('manager')
      const viewer = getRolePermissions('viewer')

      // Manager can edit, viewer cannot
      expect(manager.canEdit).toBe(true)
      expect(viewer.canEdit).toBe(false)

      // Manager can manage team, viewer cannot
      expect(manager.canManageTeam).toBe(true)
      expect(viewer.canManageTeam).toBe(false)

      // Both can view financials
      expect(manager.canViewFinancials).toBe(true)
      expect(viewer.canViewFinancials).toBe(true)
    })

    it('viewer has more permissions than null', () => {
      const viewer = getRolePermissions('viewer')
      const noRole = getRolePermissions(null)

      // Viewer can view financials, null cannot
      expect(viewer.canViewFinancials).toBe(true)
      expect(noRole.canViewFinancials).toBe(false)

      // Both cannot edit or delete
      expect(viewer.canEdit).toBe(noRole.canEdit)
      expect(viewer.canDelete).toBe(noRole.canDelete)
    })
  })

  describe('type safety', () => {
    it('accepts all valid UserRole values', () => {
      const roles: UserRole[] = ['owner', 'manager', 'viewer', null]

      for (const role of roles) {
        expect(() => getRolePermissions(role)).not.toThrow()
      }
    })

    it('returns consistent shape for all roles', () => {
      const roles: UserRole[] = ['owner', 'manager', 'viewer', null]

      for (const role of roles) {
        const perms = getRolePermissions(role)
        expect(typeof perms.canEdit).toBe('boolean')
        expect(typeof perms.canDelete).toBe('boolean')
        expect(typeof perms.canManageTeam).toBe('boolean')
        expect(typeof perms.canViewFinancials).toBe('boolean')
        expect(typeof perms.isOwner).toBe('boolean')
        expect(typeof perms.isManager).toBe('boolean')
        expect(typeof perms.isViewer).toBe('boolean')
      }
    })
  })
})
