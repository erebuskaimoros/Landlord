import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getOrganizationMembers,
  getOrganizationInvitations,
  getUserRole,
} from '@/services/organizations'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .single()

  // Get user's organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(id, name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const membershipData = membership as {
    organization_id: string
    role: 'owner' | 'manager' | 'viewer'
    organizations: { id: string; name: string } | null
  } | null

  const organization = membershipData?.organizations
    ? { id: membershipData.organizations.id, name: membershipData.organizations.name }
    : null

  // Get team members and invitations if user has an organization
  let members: Awaited<ReturnType<typeof getOrganizationMembers>> = []
  let invitations: Awaited<ReturnType<typeof getOrganizationInvitations>> = []
  let userRole: 'owner' | 'manager' | 'viewer' | null = membershipData?.role || null

  if (organization) {
    members = await getOrganizationMembers(organization.id)
    invitations = await getOrganizationInvitations(organization.id)
  }

  return (
    <SettingsClient
      user={{ id: user.id, email: user.email }}
      profile={profile}
      organization={organization}
      userRole={userRole}
      members={members}
      invitations={invitations}
    />
  )
}
