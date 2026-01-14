import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect')
  const next = redirect || searchParams.get('next') || '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if user has a profile, if not create one
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!profile) {
        // Create profile for OAuth users - using type cast to work around Supabase SSR type inference issues
        await (supabase.from('user_profiles') as ReturnType<typeof supabase.from>).insert({
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
          avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null,
        } as Record<string, unknown>)
      }

      // Check if user has an organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', data.user.id)
        .limit(1)
        .single()

      // If no organization and not accepting an invitation, redirect to onboarding
      if (!membership && !next.includes('accept-invitation')) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
