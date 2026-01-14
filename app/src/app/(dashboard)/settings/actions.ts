'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  updateOrganization,
  createInvitation,
  deleteInvitation,
  updateMemberRole,
  removeMember,
} from '@/services/organizations'
import {
  organizationSchema,
  invitationSchema,
  profileSchema,
} from '@/lib/validations/organization'

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const validatedFields = profileSchema.safeParse({
    full_name: formData.get('full_name'),
    phone: formData.get('phone') || null,
  })

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors }
  }

  const { error } = await (supabase.from('user_profiles') as ReturnType<typeof supabase.from>)
    .update({
      full_name: validatedFields.data.full_name,
      phone: validatedFields.data.phone,
    } as Record<string, unknown>)
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function updateOrganizationAction(
  organizationId: string,
  formData: FormData
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Check if user is owner
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()

  const membershipData = membership as { role: 'owner' | 'manager' | 'viewer' } | null

  if (!membershipData || membershipData.role !== 'owner') {
    return { error: 'Only owners can update organization settings' }
  }

  const validatedFields = organizationSchema.safeParse({
    name: formData.get('name'),
  })

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors }
  }

  const result = await updateOrganization(organizationId, validatedFields.data)

  if (!result) {
    return { error: 'Failed to update organization' }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function inviteMemberAction(
  organizationId: string,
  formData: FormData
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Check if user is owner or manager
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()

  const membershipData = membership as { role: 'owner' | 'manager' | 'viewer' } | null

  if (!membershipData || membershipData.role === 'viewer') {
    return { error: 'Only owners and managers can invite members' }
  }

  const validatedFields = invitationSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  })

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors }
  }

  // Owners can invite anyone, managers can only invite viewers
  if (
    membershipData.role === 'manager' &&
    validatedFields.data.role !== 'viewer'
  ) {
    return { error: 'Managers can only invite viewers' }
  }

  // Check if email is already a member
  const { data: existingMembers } = await supabase
    .from('organization_members')
    .select('user_id, user_profiles(full_name)')
    .eq('organization_id', organizationId)

  // Check pending invitations
  const { data: existingInvitation } = await supabase
    .from('organization_invitations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('email', validatedFields.data.email.toLowerCase())
    .single()

  if (existingInvitation) {
    return { error: 'An invitation has already been sent to this email' }
  }

  const invitation = await createInvitation(
    organizationId,
    validatedFields.data.email,
    validatedFields.data.role,
    user.id
  )

  if (!invitation) {
    return { error: 'Failed to create invitation' }
  }

  // TODO: Send invitation email via Edge Function
  // For now, just return the invitation link
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/accept-invitation?token=${invitation.token}`

  revalidatePath('/settings')
  return { success: true, inviteUrl }
}

export async function revokeInvitationAction(invitationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Get invitation to check organization
  const { data: invitation } = await supabase
    .from('organization_invitations')
    .select('organization_id')
    .eq('id', invitationId)
    .single()

  const invitationData = invitation as { organization_id: string } | null

  if (!invitationData) {
    return { error: 'Invitation not found' }
  }

  // Check if user is owner or manager
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', invitationData.organization_id)
    .eq('user_id', user.id)
    .single()

  const membershipData = membership as { role: 'owner' | 'manager' | 'viewer' } | null

  if (!membershipData || membershipData.role === 'viewer') {
    return { error: 'Only owners and managers can revoke invitations' }
  }

  const success = await deleteInvitation(invitationId)

  if (!success) {
    return { error: 'Failed to revoke invitation' }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function updateMemberRoleAction(
  organizationId: string,
  memberId: string,
  newRole: 'owner' | 'manager' | 'viewer'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Only owners can change roles
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()

  const membershipData = membership as { role: 'owner' | 'manager' | 'viewer' } | null

  if (!membershipData || membershipData.role !== 'owner') {
    return { error: 'Only owners can change member roles' }
  }

  // Can't change your own role
  if (memberId === user.id) {
    return { error: 'You cannot change your own role' }
  }

  const success = await updateMemberRole(organizationId, memberId, newRole)

  if (!success) {
    return { error: 'Failed to update member role' }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function removeMemberAction(
  organizationId: string,
  memberId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Only owners can remove members
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()

  const membershipData = membership as { role: 'owner' | 'manager' | 'viewer' } | null

  if (!membershipData || membershipData.role !== 'owner') {
    return { error: 'Only owners can remove members' }
  }

  // Can't remove yourself
  if (memberId === user.id) {
    return { error: 'You cannot remove yourself from the organization' }
  }

  const success = await removeMember(organizationId, memberId)

  if (!success) {
    return { error: 'Failed to remove member' }
  }

  revalidatePath('/settings')
  return { success: true }
}
