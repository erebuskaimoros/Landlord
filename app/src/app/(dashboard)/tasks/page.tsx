import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TasksClient } from './tasks-client'
import type { Tables } from '@/types/database'

type TaskWithRelations = Tables<'tasks'> & {
  unit: Tables<'units'> | null
  contractor: Tables<'contractors'> | null
}

type RecurringTaskWithRelations = Tables<'recurring_tasks'> & {
  unit: Tables<'units'> | null
  contractor: Tables<'contractors'> | null
}

async function getOrganizationId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const membershipData = membership as { organization_id: string } | null
  return membershipData?.organization_id || null
}

export default async function TasksPage() {
  const supabase = await createClient()
  const organizationId = await getOrganizationId()

  if (!organizationId) {
    redirect('/login')
  }

  const today = new Date().toISOString().split('T')[0]

  // Fetch tasks, recurring tasks, units, contractors, and counts in parallel
  const [
    tasksResult,
    recurringTasksResult,
    unitsResult,
    contractorsResult,
    openResult,
    inProgressResult,
    completedResult,
    overdueResult,
    recurringActiveResult,
    recurringPausedResult,
  ] = await Promise.all([
    supabase
      .from('tasks')
      .select('*, unit:units(*), contractor:contractors(*)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false }),
    supabase
      .from('recurring_tasks')
      .select('*, unit:units(*), contractor:contractors(*)')
      .eq('organization_id', organizationId)
      .order('next_due_date', { ascending: true }),
    supabase
      .from('units')
      .select('*')
      .eq('organization_id', organizationId)
      .neq('status', 'sold')
      .order('address', { ascending: true }),
    supabase
      .from('contractors')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true }),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'open'),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'in_progress'),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'completed'),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('status', ['open', 'in_progress'])
      .lt('due_date', today),
    supabase
      .from('recurring_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true),
    supabase
      .from('recurring_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', false),
  ])

  const tasks = (tasksResult.data || []) as TaskWithRelations[]
  const recurringTasks = (recurringTasksResult.data || []) as RecurringTaskWithRelations[]
  const units = (unitsResult.data || []) as Tables<'units'>[]
  const contractors = (contractorsResult.data || []) as Tables<'contractors'>[]

  const counts = {
    open: openResult.count || 0,
    in_progress: inProgressResult.count || 0,
    completed: completedResult.count || 0,
    overdue: overdueResult.count || 0,
  }

  const recurringCounts = {
    active: recurringActiveResult.count || 0,
    paused: recurringPausedResult.count || 0,
  }

  return (
    <TasksClient
      tasks={tasks}
      recurringTasks={recurringTasks}
      units={units}
      contractors={contractors}
      counts={counts}
      recurringCounts={recurringCounts}
    />
  )
}
