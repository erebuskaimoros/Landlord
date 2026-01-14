'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Pencil, Trash2, User, Mail, Phone, Calendar, FileText, Home } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { TenantForm } from '@/components/forms/tenant-form'
import { TenantTimeline } from '@/components/timeline/tenant-timeline'
import { deleteTenantAction } from '@/app/(dashboard)/tenants/actions'
import { toast } from 'sonner'
import type { Tables } from '@/types/database'

type LeaseWithUnit = Tables<'leases'> & {
  unit: Tables<'units'> | null
}

interface TenantDetailClientProps {
  tenant: Tables<'tenants'>
  timelineEvents: Tables<'tenant_timeline_events'>[]
  leases: LeaseWithUnit[]
}

function LeaseStatusBadge({ status }: { status: Tables<'leases'>['status'] }) {
  const variants: Record<Tables<'leases'>['status'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
    active: 'default',
    draft: 'secondary',
    expired: 'outline',
    terminated: 'destructive',
  }
  const labels: Record<Tables<'leases'>['status'], string> = {
    active: 'Active',
    draft: 'Draft',
    expired: 'Expired',
    terminated: 'Terminated',
  }
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}

export function TenantDetailClient({ tenant, timelineEvents, leases }: TenantDetailClientProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteTenantAction(tenant.id)
      if (result.success) {
        toast.success('Tenant deleted')
        router.push('/tenants')
      } else {
        toast.error(result.error || 'Failed to delete tenant')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  const fullName = `${tenant.first_name} ${tenant.last_name}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/tenants" className="hover:text-gray-700 flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Tenants
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <User className="h-6 w-6" />
            {fullName}
          </h1>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">First Name</label>
                <p className="mt-1">{tenant.first_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Name</label>
                <p className="mt-1">{tenant.last_name}</p>
              </div>
            </div>
            {tenant.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <a href={`mailto:${tenant.email}`} className="text-blue-600 hover:underline">
                  {tenant.email}
                </a>
              </div>
            )}
            {tenant.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <a href={`tel:${tenant.phone}`} className="text-blue-600 hover:underline">
                  {tenant.phone}
                </a>
              </div>
            )}
            {!tenant.email && !tenant.phone && (
              <p className="text-sm text-gray-400">No contact information on file</p>
            )}
          </CardContent>
        </Card>

        {/* Emergency Contact (if available) */}
        {tenant.emergency_contact_name && (
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="mt-1">{tenant.emergency_contact_name}</p>
              </div>
              {tenant.emergency_contact_phone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="mt-1">{tenant.emergency_contact_phone}</p>
                </div>
              )}
              {tenant.emergency_contact_relationship && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Relationship</label>
                  <p className="mt-1">{tenant.emergency_contact_relationship}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {tenant.notes && (
          <Card className={tenant.emergency_contact_name ? '' : 'md:col-span-1'}>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700">{tenant.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Record Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="font-medium text-gray-500">Created</dt>
                <dd className="mt-1">
                  {new Date(tenant.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1">
                  {new Date(tenant.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Lease History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lease History ({leases.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leases.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No leases on record for this tenant.
            </p>
          ) : (
            <div className="divide-y">
              {leases.map((lease) => (
                <div key={lease.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/leases/${lease.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {lease.unit ? (
                          <>
                            {lease.unit.address}
                            {lease.unit.unit_number && ` #${lease.unit.unit_number}`}
                          </>
                        ) : (
                          'Unknown Unit'
                        )}
                      </Link>
                      <LeaseStatusBadge status={lease.status} />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(lease.start_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {' - '}
                      {lease.end_date
                        ? new Date(lease.end_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Month-to-month'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${lease.rent_amount.toLocaleString()}/mo</p>
                    {lease.unit && (
                      <Link
                        href={`/units/${lease.unit.id}`}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 justify-end"
                      >
                        <Home className="h-3 w-3" />
                        View Unit
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline Events */}
      <TenantTimeline
        tenantId={tenant.id}
        events={timelineEvents}
        onRefresh={() => router.refresh()}
      />

      <TenantForm
        open={editOpen}
        onOpenChange={setEditOpen}
        tenant={tenant}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
