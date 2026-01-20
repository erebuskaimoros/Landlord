'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, ClipboardList, AlertTriangle, RefreshCw } from 'lucide-react'
import { TaskForm } from '@/components/forms/task-form'
import { RecurringTaskForm } from '@/components/forms/recurring-task-form'
import { TasksTable } from '@/components/tables/tasks-table'
import { RecurringTasksTable } from '@/components/tables/recurring-tasks-table'
import { useUserRole } from '@/hooks/useUserRole'
import type { Tables } from '@/types/database'

type TaskWithRelations = Tables<'tasks'> & {
  unit: Tables<'units'> | null
  contractor: Tables<'contractors'> | null
}

type RecurringTaskWithRelations = Tables<'recurring_tasks'> & {
  unit: Tables<'units'> | null
  contractor: Tables<'contractors'> | null
}

interface TasksClientProps {
  tasks: TaskWithRelations[]
  recurringTasks: RecurringTaskWithRelations[]
  units: Tables<'units'>[]
  contractors: Tables<'contractors'>[]
  counts: {
    open: number
    in_progress: number
    completed: number
    overdue: number
  }
  recurringCounts: {
    active: number
    paused: number
  }
}

export function TasksClient({
  tasks,
  recurringTasks,
  units,
  contractors,
  counts,
  recurringCounts
}: TasksClientProps) {
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [recurringFormOpen, setRecurringFormOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('tasks')
  const { canEdit } = useUserRole()

  const totalActive = counts.open + counts.in_progress
  const totalRecurring = recurringCounts.active + recurringCounts.paused

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500">
            {totalActive > 0
              ? `${totalActive} active task${totalActive === 1 ? '' : 's'}${counts.overdue > 0 ? ` (${counts.overdue} overdue)` : ''}`
              : 'Manage maintenance and work orders'}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {activeTab === 'recurring' ? (
              <Button onClick={() => setRecurringFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Recurring Task
              </Button>
            ) : (
              <Button onClick={() => setTaskFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {(counts.open > 0 || counts.in_progress > 0 || counts.overdue > 0 || totalRecurring > 0) && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Open</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{counts.open}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{counts.in_progress}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{counts.completed}</p>
            </CardContent>
          </Card>
          <Card className={counts.overdue > 0 ? 'border-red-200 bg-red-50' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-medium ${counts.overdue > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                <div className="flex items-center gap-1">
                  {counts.overdue > 0 && <AlertTriangle className="h-4 w-4" />}
                  Overdue
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${counts.overdue > 0 ? 'text-red-600' : ''}`}>
                {counts.overdue}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                <div className="flex items-center gap-1">
                  <RefreshCw className="h-4 w-4" />
                  Recurring
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{recurringCounts.active}</p>
              {recurringCounts.paused > 0 && (
                <p className="text-xs text-gray-500">{recurringCounts.paused} paused</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">
            Tasks {tasks.length > 0 && `(${tasks.length})`}
          </TabsTrigger>
          <TabsTrigger value="recurring">
            Recurring {totalRecurring > 0 && `(${totalRecurring})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          {tasks.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  No tasks yet
                </CardTitle>
                <CardDescription>
                  {canEdit
                    ? 'Create tasks to track maintenance and work orders'
                    : 'No tasks have been created yet'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Tasks help you track maintenance requests, repairs, and other work orders.
                  Assign contractors and set due dates to stay organized.
                </p>
                {canEdit && (
                  <Button onClick={() => setTaskFormOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Task
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <TasksTable tasks={tasks} units={units} contractors={contractors} />
          )}
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4">
          {recurringTasks.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  No recurring tasks yet
                </CardTitle>
                <CardDescription>
                  {canEdit
                    ? 'Set up tasks that repeat on a schedule'
                    : 'No recurring tasks have been created yet'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Recurring tasks automatically generate work orders on a schedule.
                  Use them for routine maintenance like HVAC filter changes, inspections, or lawn care.
                </p>
                {canEdit && (
                  <Button onClick={() => setRecurringFormOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Recurring Task
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <RecurringTasksTable
              recurringTasks={recurringTasks}
              units={units}
              contractors={contractors}
            />
          )}
        </TabsContent>
      </Tabs>

      {canEdit && (
        <>
          <TaskForm
            open={taskFormOpen}
            onOpenChange={setTaskFormOpen}
            units={units}
            contractors={contractors}
          />
          <RecurringTaskForm
            open={recurringFormOpen}
            onOpenChange={setRecurringFormOpen}
            units={units}
            contractors={contractors}
          />
        </>
      )}
    </div>
  )
}
