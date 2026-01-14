'use client'

import { ReactNode } from 'react'
import { UserRoleContext, UserRole, getRolePermissions } from '@/hooks/useUserRole'

interface UserRoleProviderProps {
  role: UserRole
  children: ReactNode
}

export function UserRoleProvider({ role, children }: UserRoleProviderProps) {
  const permissions = getRolePermissions(role)

  return (
    <UserRoleContext.Provider value={{ role, ...permissions }}>
      {children}
    </UserRoleContext.Provider>
  )
}
