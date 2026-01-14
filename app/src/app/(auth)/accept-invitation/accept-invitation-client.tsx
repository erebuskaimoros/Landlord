'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Building2, CheckCircle, UserPlus } from 'lucide-react'

interface AcceptInvitationClientProps {
  invitation?: {
    email: string
    role: 'owner' | 'manager' | 'viewer'
    organizationName: string
  }
  token?: string
  requiresAuth?: boolean
  error?: string
}

export function AcceptInvitationClient({
  invitation,
  token,
  requiresAuth,
  error,
}: AcceptInvitationClientProps) {
  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Full access to all settings and data'
      case 'manager':
        return 'Can manage properties, tenants, and transactions'
      case 'viewer':
        return 'Read-only access to all data'
      default:
        return ''
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Invitation Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/login">
              <Button>Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (requiresAuth && invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>You&apos;re Invited!</CardTitle>
            <CardDescription>
              You&apos;ve been invited to join an organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-400" />
                <span className="font-medium">{invitation.organizationName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Your role:</span>
                <Badge>{invitation.role}</Badge>
              </div>
              <p className="text-sm text-gray-500">
                {getRoleDescription(invitation.role)}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Sign in or create an account to accept this invitation
              </p>
              <div className="flex flex-col gap-2">
                <Link href={`/login?redirect=/accept-invitation?token=${token}`}>
                  <Button className="w-full">Sign In</Button>
                </Link>
                <Link href={`/signup?redirect=/accept-invitation?token=${token}&email=${encodeURIComponent(invitation.email)}`}>
                  <Button variant="outline" className="w-full">
                    Create Account
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state (shouldn't normally be seen as we redirect)
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Welcome!</CardTitle>
          <CardDescription>
            You&apos;ve successfully joined the organization
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
