import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserRoleProvider } from '@/components/providers/user-role-provider'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile - with explicit type cast
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const profileData = profile as { full_name: string | null } | null

  // Get user's organization and role - with explicit type cast
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const membershipData = membership as {
    organization_id: string
    role: 'owner' | 'manager' | 'viewer'
    organizations: { name: string } | null
  } | null
  const organization = membershipData?.organizations || null
  const userRole = membershipData?.role || null

  return (
    <UserRoleProvider role={userRole}>
      <DashboardShell
        user={{
          email: user.email,
          full_name: profileData?.full_name ?? undefined,
        }}
        organization={organization}
      >
        {children}
      </DashboardShell>
    </UserRoleProvider>
  )
}
