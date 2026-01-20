'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Pencil, Trash2, FileText, User, Home, Calendar, DollarSign, Paperclip } from 'lucide-react'
import { LeaseForm } from '@/components/forms/lease-form'
import { DocumentUpload } from '@/components/leases/document-upload'
import { DocumentsList } from '@/components/leases/documents-list'
import { deleteLeaseAction, deleteLeaseDocumentAction, uploadLeaseDocumentAction } from '@/app/(dashboard)/leases/actions'
import type { LeaseDocumentWithUrl } from '@/services/lease-documents'
import { toast } from 'sonner'
import type { Tables } from '@/types/database'
import type { LeaseWithRelations } from '@/services/leases'

interface LeaseDetailClientProps {
  lease: LeaseWithRelations
  units: Tables<'units'>[]
  tenants: Tables<'tenants'>[]
  documents: LeaseDocumentWithUrl[]
}

function StatusBadge({ status }: { status: Tables<'leases'>['status'] }) {
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function LeaseDetailClient({ lease, units, tenants, documents }: LeaseDetailClientProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  async function handleUploadDocument(file: File) {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await uploadLeaseDocumentAction(lease.id, formData)
      if (result.success) {
        toast.success('Document uploaded successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to upload document')
        throw new Error(result.error)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload document')
      throw error
    }
  }

  async function handleDeleteDocument(documentId: string) {
    try {
      const result = await deleteLeaseDocumentAction(documentId, lease.id)
      if (result.success) {
        toast.success('Document deleted')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete document')
      }
    } catch {
      toast.error('An unexpected error occurred')
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this lease? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteLeaseAction(lease.id)
      if (result.success) {
        toast.success('Lease deleted')
        router.push('/leases')
      } else {
        toast.error(result.error || 'Failed to delete lease')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  const tenantName = lease.tenant
    ? `${lease.tenant.first_name} ${lease.tenant.last_name}`
    : 'Unknown Tenant'

  const unitAddress = lease.unit
    ? `${lease.unit.address}${lease.unit.unit_number ? ` #${lease.unit.unit_number}` : ''}`
    : 'Unknown Unit'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/leases" className="hover:text-gray-700 flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Leases
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="h-6 w-6" />
            Lease: {tenantName}
          </h1>
          <div className="flex items-center gap-3">
            <StatusBadge status={lease.status} />
            <span className="text-gray-600">${lease.rent_amount.toLocaleString()}/mo</span>
          </div>
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
        {/* Tenant Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Tenant
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lease.tenant ? (
              <Link
                href={`/tenants/${lease.tenant.id}`}
                className="text-blue-600 hover:underline font-medium"
              >
                {tenantName}
              </Link>
            ) : (
              <span className="text-gray-500">Tenant not found</span>
            )}
          </CardContent>
        </Card>

        {/* Unit Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Unit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lease.unit ? (
              <Link
                href={`/units/${lease.unit.id}`}
                className="text-blue-600 hover:underline font-medium"
              >
                {unitAddress}
              </Link>
            ) : (
              <span className="text-gray-500">Unit not found</span>
            )}
          </CardContent>
        </Card>

        {/* Lease Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Lease Period
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <label className="text-sm font-medium text-gray-500">Start Date</label>
              <p className="mt-1">{formatDate(lease.start_date)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">End Date</label>
              <p className="mt-1">{lease.end_date ? formatDate(lease.end_date) : 'Month-to-month'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Financial Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <label className="text-sm font-medium text-gray-500">Monthly Rent</label>
              <p className="mt-1 text-lg font-semibold">
                ${lease.rent_amount.toLocaleString()}
              </p>
            </div>
            {lease.security_deposit && (
              <div>
                <label className="text-sm font-medium text-gray-500">Security Deposit</label>
                <p className="mt-1">${lease.security_deposit.toLocaleString()}</p>
              </div>
            )}
            {lease.deposit_returned_date && (
              <div>
                <label className="text-sm font-medium text-gray-500">Deposit Returned</label>
                <p className="mt-1">{formatDate(lease.deposit_returned_date)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lease Terms */}
        {lease.terms && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Lease Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700">{lease.terms}</p>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {lease.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700">{lease.notes}</p>
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
                  {new Date(lease.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1">
                  {new Date(lease.updated_at).toLocaleDateString('en-US', {
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

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Documents ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentUpload onUpload={handleUploadDocument} />
          <DocumentsList
            documents={documents}
            onDelete={handleDeleteDocument}
          />
        </CardContent>
      </Card>

      <LeaseForm
        open={editOpen}
        onOpenChange={setEditOpen}
        lease={lease}
        units={units}
        tenants={tenants}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
