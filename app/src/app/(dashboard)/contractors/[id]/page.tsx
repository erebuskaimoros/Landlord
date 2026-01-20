import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ContractorDetailClient } from './contractor-detail-client'
import type { Tables } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

type TaskWithUnit = Tables<'tasks'> & {
  unit: Tables<'units'> | null
}

export default async function ContractorDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch contractor first
  const { data: contractorData, error: contractorError } = await supabase
    .from('contractors')
    .select('*')
    .eq('id', id)
    .single()

  if (contractorError || !contractorData) {
    notFound()
  }

  const contractor = contractorData as Tables<'contractors'>

  // Fetch tasks for this contractor
  const { data: tasksData } = await supabase
    .from('tasks')
    .select('*, unit:units(*)')
    .eq('assigned_contractor_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const tasks = (tasksData || []) as TaskWithUnit[]

  return (
    <ContractorDetailClient
      contractor={contractor}
      tasks={tasks}
    />
  )
}
