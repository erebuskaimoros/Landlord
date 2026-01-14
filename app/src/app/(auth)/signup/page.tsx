'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignupPage() {
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect')
  const prefillEmail = searchParams.get('email')
  const isInvitation = redirectUrl?.includes('accept-invitation')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState(prefillEmail || '')
  const [password, setPassword] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Update email if prefill changes
  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail)
    }
  }, [prefillEmail])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!authData.user) {
      setError('Failed to create user')
      setLoading(false)
      return
    }

    // Create user profile - using type cast to work around Supabase SSR type inference issues
    const { error: profileError } = await (supabase
      .from('user_profiles') as ReturnType<typeof supabase.from>)
      .insert({
        id: authData.user.id,
        full_name: fullName,
      } as Record<string, unknown>)

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Don't fail signup if profile creation fails
    }

    // If joining via invitation, skip organization creation
    if (isInvitation) {
      // Redirect to accept invitation page
      router.push(redirectUrl!)
      router.refresh()
      return
    }

    // Create organization for new users
    const { data: orgResult, error: orgError } = await (supabase
      .from('organizations') as ReturnType<typeof supabase.from>)
      .insert({
        name: organizationName,
      } as Record<string, unknown>)
      .select()
      .single()

    if (orgError || !orgResult) {
      setError('Failed to create organization: ' + (orgError?.message || 'Unknown error'))
      setLoading(false)
      return
    }

    // Add user as owner of the organization
    const { error: memberError } = await (supabase
      .from('organization_members') as ReturnType<typeof supabase.from>)
      .insert({
        organization_id: (orgResult as { id: string }).id,
        user_id: authData.user.id,
        role: 'owner',
      } as Record<string, unknown>)

    if (memberError) {
      setError('Failed to add user to organization: ' + memberError.message)
      setLoading(false)
      return
    }

    router.push(redirectUrl || '/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Landlord</CardTitle>
          <CardDescription className="text-center">
            {isInvitation ? 'Create your account to accept the invitation' : 'Create your account'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!prefillEmail}
              />
              {prefillEmail && (
                <p className="text-xs text-gray-500">
                  Use this email to match your invitation
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {!isInvitation && (
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  type="text"
                  placeholder="My Property Company"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">
                  This will be your portfolio name
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
            <p className="text-sm text-center text-gray-600">
              Already have an account?{' '}
              <Link
                href={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'}
                className="text-blue-600 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
