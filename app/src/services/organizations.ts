import { createClient } from '@/lib/supabase/server'
import { Tables, InsertTables, UpdateTables } from '@/types/database'

export type Organization = Tables<'organizations'>
export type OrganizationMember = Tables<'organization_members'> & {
  user_profiles?: { full_name: string | null; avatar_url: string | null } | null
  email?: string
}
export type OrganizationInvitation = Tables<'organization_invitations'> & {
  invited_by_profile?: { full_name: string | null } | null
}

export async function getOrganization(id: string): Promise<Organization | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching organization:', error)
    return null
  }

  return data
}

export async function updateOrganization(
  id: string,
  updates: UpdateTables<'organizations'>
): Promise<Organization | null> {
  const supabase = await createClient()
  const { data, error } = await (supabase.from('organizations') as ReturnType<typeof supabase.from>)
    .update(updates as Record<string, unknown>)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating organization:', error)
    return null
  }

  return data as Organization
}

export async function getOrganizationMembers(
  organizationId: string
): Promise<OrganizationMember[]> {
  const supabase = await createClient()

  // Get members with their profiles
  const { data: members, error: membersError } = await supabase
    .from('organization_members')
    .select(`
      *,
      user_profiles (
        full_name,
        avatar_url
      )
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })

  if (membersError) {
    console.error('Error fetching organization members:', membersError)
    return []
  }

  // Get user emails from auth (need admin or edge function for this)
  // For now, we'll leave email undefined - it would need to come from user_profiles
  return members as OrganizationMember[]
}

export async function getUserRole(
  organizationId: string,
  userId: string
): Promise<'owner' | 'manager' | 'viewer' | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error fetching user role:', error)
    return null
  }

  const roleData = data as { role: 'owner' | 'manager' | 'viewer' } | null
  return roleData?.role || null
}

export async function updateMemberRole(
  organizationId: string,
  userId: string,
  role: 'owner' | 'manager' | 'viewer'
): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await (supabase.from('organization_members') as ReturnType<typeof supabase.from>)
    .update({ role } as Record<string, unknown>)
    .eq('organization_id', organizationId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating member role:', error)
    return false
  }

  return true
}

export async function removeMember(
  organizationId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', organizationId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error removing member:', error)
    return false
  }

  return true
}

// Invitations
export async function getOrganizationInvitations(
  organizationId: string
): Promise<OrganizationInvitation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organization_invitations')
    .select(`
      *,
      invited_by_profile:user_profiles!organization_invitations_invited_by_fkey (
        full_name
      )
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching invitations:', error)
    return []
  }

  return data as OrganizationInvitation[]
}

export async function createInvitation(
  organizationId: string,
  email: string,
  role: 'owner' | 'manager' | 'viewer',
  invitedBy: string
): Promise<OrganizationInvitation | null> {
  const supabase = await createClient()

  // Generate a secure token
  const token = crypto.randomUUID()

  // Set expiration to 7 days from now
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data, error } = await (supabase.from('organization_invitations') as ReturnType<typeof supabase.from>)
    .insert({
      organization_id: organizationId,
      email: email.toLowerCase(),
      role,
      token,
      invited_by: invitedBy,
      expires_at: expiresAt.toISOString(),
    } as Record<string, unknown>)
    .select()
    .single()

  if (error) {
    console.error('Error creating invitation:', error)
    return null
  }

  return data as OrganizationInvitation
}

export async function deleteInvitation(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('organization_invitations')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting invitation:', error)
    return false
  }

  return true
}

export async function getInvitationByToken(
  token: string
): Promise<(OrganizationInvitation & { organizations: { name: string } }) | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organization_invitations')
    .select(`
      *,
      organizations (
        name
      )
    `)
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error) {
    console.error('Error fetching invitation by token:', error)
    return null
  }

  return data as OrganizationInvitation & { organizations: { name: string } }
}

export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get the invitation
  const invitation = await getInvitationByToken(token)
  if (!invitation) {
    return { success: false, error: 'Invalid or expired invitation' }
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', invitation.organization_id)
    .eq('user_id', userId)
    .single()

  if (existingMember) {
    // Delete the invitation since they're already a member
    await deleteInvitation(invitation.id)
    return { success: false, error: 'You are already a member of this organization' }
  }

  // Add user as member
  const { error: memberError } = await (supabase.from('organization_members') as ReturnType<typeof supabase.from>)
    .insert({
      organization_id: invitation.organization_id,
      user_id: userId,
      role: invitation.role,
    } as Record<string, unknown>)

  if (memberError) {
    console.error('Error adding member:', memberError)
    return { success: false, error: 'Failed to join organization' }
  }

  // Delete the invitation
  await deleteInvitation(invitation.id)

  return { success: true }
}
