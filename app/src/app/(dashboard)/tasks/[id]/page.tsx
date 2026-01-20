import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { TaskDetailClient } from './task-detail-client'
import { getPhotosByTask, getPhotoUrl } from '@/services/photos'
import type { Tables } from '@/types/database'

interface TaskPageProps {
  params: Promise<{ id: string }>
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

export default async function TaskPage({ params }: TaskPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const organizationId = await getOrganizationId()

  if (!organizationId) {
    redirect('/login')
  }

  // Fetch task with unit and contractor info
  const { data: taskData, error } = await supabase
    .from('tasks')
    .select('*, unit:units(*), contractor:contractors(*)')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (error || !taskData) {
    notFound()
  }

  const task = taskData as Tables<'tasks'> & {
    unit: Tables<'units'> | null
    contractor: Tables<'contractors'> | null
  }

  // Fetch units for edit form
  const { data: unitsData } = await supabase
    .from('units')
    .select('*')
    .eq('organization_id', organizationId)
    .neq('status', 'sold')
    .order('address', { ascending: true })

  const units = (unitsData || []) as Tables<'units'>[]

  // Fetch contractors for edit form
  const { data: contractorsData } = await supabase
    .from('contractors')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })

  const contractors = (contractorsData || []) as Tables<'contractors'>[]

  // Fetch photos for this task
  const photos = await getPhotosByTask(id)

  // Generate signed URLs for photos
  const photoUrls: Record<string, string> = {}
  for (const photo of photos) {
    const url = await getPhotoUrl(photo.file_path)
    if (url) {
      photoUrls[photo.id] = url
    }
  }

  return (
    <TaskDetailClient
      task={task}
      units={units}
      contractors={contractors}
      photos={photos}
      photoUrls={photoUrls}
    />
  )
}
