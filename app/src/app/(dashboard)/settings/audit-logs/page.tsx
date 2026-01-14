import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, History } from 'lucide-react'
import Link from 'next/link'

type AuditLog = {
  id: string
  organization_id: string | null
  user_id: string | null
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getActionColor(action: AuditLog['action']): string {
  switch (action) {
    case 'INSERT':
      return 'bg-green-100 text-green-800'
    case 'UPDATE':
      return 'bg-blue-100 text-blue-800'
    case 'DELETE':
      return 'bg-red-100 text-red-800'
  }
}

function getActionLabel(action: AuditLog['action']): string {
  switch (action) {
    case 'INSERT':
      return 'Created'
    case 'UPDATE':
      return 'Updated'
    case 'DELETE':
      return 'Deleted'
  }
}

function getTableLabel(tableName: string): string {
  const labels: Record<string, string> = {
    units: 'Unit',
    tenants: 'Tenant',
    leases: 'Lease',
    transactions: 'Transaction',
    buildings: 'Building',
    organization_members: 'Team Member',
    organization_invitations: 'Invitation',
  }
  return labels[tableName] || tableName
}

function getChangeSummary(log: AuditLog): string {
  if (log.action === 'INSERT' && log.new_data) {
    const name = log.new_data.name || log.new_data.address ||
      (log.new_data.first_name && log.new_data.last_name
        ? `${log.new_data.first_name} ${log.new_data.last_name}`
        : null) ||
      log.new_data.description
    return name ? `Created "${name}"` : 'New record created'
  }

  if (log.action === 'DELETE' && log.old_data) {
    const name = log.old_data.name || log.old_data.address ||
      (log.old_data.first_name && log.old_data.last_name
        ? `${log.old_data.first_name} ${log.old_data.last_name}`
        : null)
    return name ? `Deleted "${name}"` : 'Record deleted'
  }

  if (log.action === 'UPDATE' && log.old_data && log.new_data) {
    const changedFields = Object.keys(log.new_data).filter(
      key => key !== 'updated_at' && JSON.stringify(log.old_data?.[key]) !== JSON.stringify(log.new_data?.[key])
    )
    if (changedFields.length === 0) return 'Record updated'
    if (changedFields.length <= 2) {
      return `Updated ${changedFields.join(', ')}`
    }
    return `Updated ${changedFields.length} fields`
  }

  return 'Record modified'
}

export default async function AuditLogsPage() {
  const supabase = await createClient()

  // Get user's organization
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get organization membership
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const membershipData = membership as { organization_id: string; role: string } | null
  const orgId = membershipData?.organization_id
  const userRole = membershipData?.role

  // Only owners can view audit logs
  if (userRole !== 'owner') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-gray-500">Activity history for your organization</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <History className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Access Restricted</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Only organization owners can view audit logs.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!orgId) {
    return null
  }

  // Fetch audit logs
  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-gray-500">Activity history for your organization</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-red-600">Failed to load audit logs: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const auditLogs = (logs || []) as AuditLog[]

  // Group logs by date
  const groupedLogs = auditLogs.reduce((groups, log) => {
    const date = new Date(log.created_at).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(log)
    return groups
  }, {} as Record<string, AuditLog[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500">Activity history for your organization</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity History
          </CardTitle>
          <CardDescription>
            Showing the last 100 changes across your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No activity yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Changes to units, tenants, leases, and transactions will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedLogs).map(([date, dateLogs]) => (
                <div key={date}>
                  <h3 className="text-sm font-medium text-gray-500 mb-4">{date}</h3>
                  <div className="space-y-3">
                    {dateLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-4 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                      >
                        <Badge className={getActionColor(log.action)} variant="secondary">
                          {getActionLabel(log.action)}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {getTableLabel(log.table_name)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {getChangeSummary(log)}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
