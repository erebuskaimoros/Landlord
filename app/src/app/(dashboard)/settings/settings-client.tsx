'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  organizationSchema,
  invitationSchema,
  profileSchema,
  type OrganizationFormValues,
  type InvitationFormValues,
  type ProfileFormValues,
} from '@/lib/validations/organization'
import {
  updateProfileAction,
  updateOrganizationAction,
  inviteMemberAction,
  revokeInvitationAction,
  updateMemberRoleAction,
  removeMemberAction,
} from './actions'
import type { OrganizationMember, OrganizationInvitation } from '@/services/organizations'
import { MoreHorizontal, UserPlus, Mail, Trash2, Copy, Check } from 'lucide-react'

interface SettingsClientProps {
  user: {
    id: string
    email?: string
  }
  profile: {
    full_name: string | null
    phone: string | null
  } | null
  organization: {
    id: string
    name: string
  } | null
  userRole: 'owner' | 'manager' | 'viewer' | null
  members: OrganizationMember[]
  invitations: OrganizationInvitation[]
}

export function SettingsClient({
  user,
  profile,
  organization,
  userRole,
  members,
  invitations,
}: SettingsClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
    },
  })

  const organizationForm = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name || '',
    },
  })

  const invitationForm = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: '',
      role: 'viewer',
    },
  })

  async function onProfileSubmit(data: ProfileFormValues) {
    setIsSubmitting(true)
    const formData = new FormData()
    formData.append('full_name', data.full_name)
    if (data.phone) formData.append('phone', data.phone)

    const result = await updateProfileAction(formData)

    if (result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to update profile')
    } else {
      toast.success('Profile updated successfully')
    }
    setIsSubmitting(false)
  }

  async function onOrganizationSubmit(data: OrganizationFormValues) {
    if (!organization) return
    setIsSubmitting(true)
    const formData = new FormData()
    formData.append('name', data.name)

    const result = await updateOrganizationAction(organization.id, formData)

    if (result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to update organization')
    } else {
      toast.success('Organization updated successfully')
    }
    setIsSubmitting(false)
  }

  async function onInviteSubmit(data: InvitationFormValues) {
    if (!organization) return
    setIsSubmitting(true)
    const formData = new FormData()
    formData.append('email', data.email)
    formData.append('role', data.role)

    const result = await inviteMemberAction(organization.id, formData)

    if (result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to send invitation')
    } else {
      toast.success('Invitation sent successfully')
      if (result.inviteUrl) {
        toast.info('Copy the invitation link to share with the invitee', {
          action: {
            label: 'Copy',
            onClick: () => {
              navigator.clipboard.writeText(result.inviteUrl!)
              toast.success('Link copied to clipboard')
            },
          },
        })
      }
      invitationForm.reset()
      setInviteDialogOpen(false)
    }
    setIsSubmitting(false)
  }

  async function handleRevokeInvitation(invitationId: string) {
    const result = await revokeInvitationAction(invitationId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Invitation revoked')
    }
  }

  async function handleUpdateRole(memberId: string, newRole: 'owner' | 'manager' | 'viewer') {
    if (!organization) return
    const result = await updateMemberRoleAction(organization.id, memberId, newRole)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Role updated')
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!organization) return
    const result = await removeMemberAction(organization.id, memberId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Member removed')
    }
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/accept-invitation?token=${token}`
    navigator.clipboard.writeText(url)
    setCopiedUrl(token)
    setTimeout(() => setCopiedUrl(null), 2000)
    toast.success('Link copied to clipboard')
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default'
      case 'manager':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const canManageTeam = userRole === 'owner' || userRole === 'manager'
  const isOwner = userRole === 'owner'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account and organization</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Manage your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user.email || ''} disabled className="bg-gray-50" />
                    <p className="text-xs text-gray-500">
                      Your email cannot be changed
                    </p>
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(555) 123-4567"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                Manage your organization details
                {!isOwner && (
                  <span className="block mt-1 text-yellow-600">
                    Only organization owners can modify these settings
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...organizationForm}>
                <form onSubmit={organizationForm.handleSubmit(onOrganizationSubmit)} className="space-y-4">
                  <FormField
                    control={organizationForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Acme Properties"
                            {...field}
                            disabled={!isOwner}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isOwner && (
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          {/* Team Members */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  People with access to this organization
                </CardDescription>
              </div>
              {canManageTeam && (
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>
                        Send an invitation to join your organization
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...invitationForm}>
                      <form onSubmit={invitationForm.handleSubmit(onInviteSubmit)} className="space-y-4">
                        <FormField
                          control={invitationForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="colleague@example.com"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={invitationForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isOwner && (
                                    <>
                                      <SelectItem value="owner">
                                        <div className="flex flex-col">
                                          <span>Owner</span>
                                          <span className="text-xs text-gray-500">
                                            Full access to all settings
                                          </span>
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="manager">
                                        <div className="flex flex-col">
                                          <span>Manager</span>
                                          <span className="text-xs text-gray-500">
                                            Can manage data but not settings
                                          </span>
                                        </div>
                                      </SelectItem>
                                    </>
                                  )}
                                  <SelectItem value="viewer">
                                    <div className="flex flex-col">
                                      <span>Viewer</span>
                                      <span className="text-xs text-gray-500">
                                        Read-only access
                                      </span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setInviteDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Sending...' : 'Send Invitation'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {member.user_profiles?.full_name
                            ?.split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase() || '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.user_profiles?.full_name || 'Unknown User'}
                          {member.user_id === user.id && (
                            <span className="text-gray-500 ml-2">(you)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {member.role}
                      </Badge>
                      {isOwner && member.user_id !== user.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleUpdateRole(member.user_id, 'owner')}
                              disabled={member.role === 'owner'}
                            >
                              Make Owner
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdateRole(member.user_id, 'manager')}
                              disabled={member.role === 'manager'}
                            >
                              Make Manager
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdateRole(member.user_id, 'viewer')}
                              disabled={member.role === 'viewer'}
                            >
                              Make Viewer
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleRemoveMember(member.user_id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          {canManageTeam && invitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Invitations</CardTitle>
                <CardDescription>
                  Invitations that haven&apos;t been accepted yet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <p className="text-sm text-gray-500">
                            Invited by {invitation.invited_by_profile?.full_name || 'Unknown'}
                            {' · '}
                            Expires {new Date(invitation.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(invitation.role)}>
                          {invitation.role}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyInviteLink(invitation.token)}
                        >
                          {copiedUrl === invitation.token ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleRevokeInvitation(invitation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
