'use client'

import { createContext, useContext } from 'react'

export type UserRole = 'owner' | 'manager' | 'viewer' | null

export interface UserRoleContextType {
  role: UserRole
  canEdit: boolean
  canDelete: boolean
  canManageTeam: boolean
  canViewFinancials: boolean
  isOwner: boolean
  isManager: boolean
  isViewer: boolean
}

export const UserRoleContext = createContext<UserRoleContextType>({
  role: null,
  canEdit: false,
  canDelete: false,
  canManageTeam: false,
  canViewFinancials: false,
  isOwner: false,
  isManager: false,
  isViewer: false,
})

export function useUserRole(): UserRoleContextType {
  return useContext(UserRoleContext)
}

export function getRolePermissions(role: UserRole): Omit<UserRoleContextType, 'role'> {
  const isOwner = role === 'owner'
  const isManager = role === 'manager'
  const isViewer = role === 'viewer'

  return {
    // Owners and managers can create/edit
    canEdit: isOwner || isManager,
    // Only owners can delete
    canDelete: isOwner,
    // Owners and managers can invite team members
    canManageTeam: isOwner || isManager,
    // Only owners have full financial access (viewers have read-only, managers limited)
    canViewFinancials: isOwner || isManager || isViewer,
    isOwner,
    isManager,
    isViewer,
  }
}
