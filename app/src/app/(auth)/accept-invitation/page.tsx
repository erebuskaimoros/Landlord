import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getInvitationByToken, acceptInvitation } from '@/services/organizations'
import { AcceptInvitationClient } from './accept-invitation-client'

interface AcceptInvitationPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function AcceptInvitationPage({
  searchParams,
}: AcceptInvitationPageProps) {
  const params = await searchParams
  const token = params.token

  if (!token) {
    return (
      <AcceptInvitationClient
        error="Invalid invitation link. Please request a new invitation."
      />
    )
  }

  // Get invitation details
  const invitation = await getInvitationByToken(token)

  if (!invitation) {
    return (
      <AcceptInvitationClient
        error="This invitation has expired or is no longer valid. Please request a new invitation."
      />
    )
  }

  // Check if user is logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // User needs to sign up or log in first
    return (
      <AcceptInvitationClient
        invitation={{
          email: invitation.email,
          role: invitation.role,
          organizationName: invitation.organizations.name,
        }}
        token={token}
        requiresAuth
      />
    )
  }

  // User is logged in, try to accept the invitation
  const result = await acceptInvitation(token, user.id)

  if (!result.success) {
    return (
      <AcceptInvitationClient
        error={result.error || 'Failed to accept invitation'}
      />
    )
  }

  // Success - redirect to dashboard
  redirect('/dashboard')
}
