import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Users, FileText, DollarSign, TrendingUp, TrendingDown, AlertCircle, Calendar } from 'lucide-react'
import Link from 'next/link'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function DashboardPage() {
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

  const orgId = (membership as { organization_id: string; role: string } | null)?.organization_id
  const userRole = (membership as { organization_id: string; role: string } | null)?.role

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-xl font-semibold text-gray-900">No Organization Found</h2>
        <p className="mt-2 text-gray-500">Please complete onboarding to set up your organization.</p>
      </div>
    )
  }

  // Fetch all dashboard data in parallel using optimized RPC functions
  const [
    dashboardStats,
    financialTotals,
    upcomingExpirations,
    recentActivity,
  ] = await Promise.all([
    // Dashboard stats in single DB call
    supabase.rpc('get_dashboard_stats', { org_id: orgId } as never),
    // Financial totals in single DB call
    supabase.rpc('get_financial_totals', { org_id: orgId } as never),
    // Leases expiring in next 60 days
    supabase
      .from('leases')
      .select('id, end_date, tenant:tenants(first_name, last_name), unit:units(address)')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .not('end_date', 'is', null)
      .gte('end_date', new Date().toISOString().split('T')[0])
      .lte('end_date', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('end_date', { ascending: true })
      .limit(5),
    // Recent audit log activity
    supabase
      .from('audit_logs')
      .select('id, table_name, action, created_at, record_id')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Extract stats from RPC response
  type DashboardStats = {
    total_units: number
    vacant_units: number
    total_tenants: number
    active_leases: number
    total_transactions: number
    vacancy_rate: number
  }
  const stats_data = (dashboardStats.data as DashboardStats[] | null)?.[0] || {
    total_units: 0,
    vacant_units: 0,
    total_tenants: 0,
    active_leases: 0,
    total_transactions: 0,
    vacancy_rate: 0,
  }

  // Extract financial totals from RPC response
  type FinancialTotals = {
    total_income: number
    total_expense: number
    net_income: number
  }
  const finance_data = (financialTotals.data as FinancialTotals[] | null)?.[0] || {
    total_income: 0,
    total_expense: 0,
    net_income: 0,
  }

  const income = finance_data.total_income
  const expense = finance_data.total_expense
  const netIncome = finance_data.net_income

  // Use stats from optimized RPC call
  const totalUnits = stats_data.total_units
  const vacantUnits = stats_data.vacant_units
  const vacancyRate = stats_data.vacancy_rate.toFixed(1)

  const stats = [
    {
      name: 'Total Units',
      value: totalUnits,
      icon: Building2,
      href: '/units',
      subtext: `${vacantUnits} vacant`,
    },
    {
      name: 'Tenants',
      value: stats_data.total_tenants,
      icon: Users,
      href: '/tenants',
    },
    {
      name: 'Active Leases',
      value: stats_data.active_leases,
      icon: FileText,
      href: '/leases',
    },
    {
      name: 'Transactions',
      value: stats_data.total_transactions,
      icon: DollarSign,
      href: '/transactions',
    },
  ]

  // Type the upcoming expirations data
  type LeaseExpiration = {
    id: string
    end_date: string
    tenant: { first_name: string; last_name: string } | null
    unit: { address: string } | null
  }
  const expirations = (upcomingExpirations.data || []) as LeaseExpiration[]

  // Type the activity data
  type ActivityLog = {
    id: string
    table_name: string
    action: 'INSERT' | 'UPDATE' | 'DELETE'
    created_at: string
    record_id: string
  }
  const activities = (recentActivity.data || []) as ActivityLog[]

  const canViewFinancials = userRole === 'owner'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome to your property management dashboard</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.subtext && (
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Financial Overview - Only for owners */}
      {canViewFinancials && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(income)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(expense)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Income</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netIncome)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vacancy Rate Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Vacancy Rate
            </CardTitle>
            <CardDescription>Current portfolio occupancy status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold">{vacancyRate}%</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {vacantUnits} of {totalUnits} units vacant
                </p>
              </div>
              <div className="h-16 w-16">
                <div
                  className="h-16 w-16 rounded-full border-8 flex items-center justify-center"
                  style={{
                    borderColor: Number(vacancyRate) > 10 ? '#ef4444' : '#22c55e',
                    borderRightColor: '#e5e7eb',
                    borderBottomColor: '#e5e7eb',
                    transform: `rotate(${Math.min(Number(vacancyRate) * 3.6, 180)}deg)`,
                  }}
                >
                  <span className="text-xs font-medium" style={{ transform: `rotate(-${Math.min(Number(vacancyRate) * 3.6, 180)}deg)` }}>
                    {100 - Number(vacancyRate)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Lease Expirations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Expirations
            </CardTitle>
            <CardDescription>Leases expiring in the next 60 days</CardDescription>
          </CardHeader>
          <CardContent>
            {expirations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No leases expiring soon</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expirations.map((lease) => (
                  <Link
                    key={lease.id}
                    href={`/leases/${lease.id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {lease.tenant?.first_name} {lease.tenant?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lease.unit?.address}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0">
                      {formatDate(lease.end_date)}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest changes across your portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => {
                const actionColors = {
                  INSERT: 'bg-green-100 text-green-800',
                  UPDATE: 'bg-blue-100 text-blue-800',
                  DELETE: 'bg-red-100 text-red-800',
                }
                const actionLabels = {
                  INSERT: 'Created',
                  UPDATE: 'Updated',
                  DELETE: 'Deleted',
                }
                const tableLabels: Record<string, string> = {
                  units: 'Unit',
                  tenants: 'Tenant',
                  leases: 'Lease',
                  transactions: 'Transaction',
                  buildings: 'Building',
                }
                return (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={actionColors[activity.action]} variant="secondary">
                        {actionLabels[activity.action]}
                      </Badge>
                      <span className="text-sm text-gray-900">
                        {tableLabels[activity.table_name] || activity.table_name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(activity.created_at)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="mt-4 pt-4 border-t">
            <Link
              href="/settings/audit-logs"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all activity →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
