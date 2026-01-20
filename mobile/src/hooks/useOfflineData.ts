import { useQuery, UseQueryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOfflineStore } from '../store/offline'
import { getCachedData, getCachedById, getCachedTasks, addToSyncQueue } from '../lib/offline'
import { supabase } from '../lib/supabase/client'
import { Tables } from '../types/database'

type Task = Tables<'tasks'>
type Unit = Tables<'units'>
type Contractor = Tables<'contractors'>

// Generic offline-first query hook
export function useOfflineQuery<T>(
  queryKey: string[],
  fetchFn: () => Promise<T>,
  getCacheFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>
) {
  const { isOnline } = useOfflineStore()

  return useQuery<T, Error>({
    queryKey,
    queryFn: async () => {
      if (isOnline) {
        try {
          // Try to fetch fresh data
          return await fetchFn()
        } catch (error) {
          console.log('[useOfflineQuery] Fetch failed, falling back to cache')
          // Fall back to cache on error
          return await getCacheFn()
        }
      } else {
        // Use cache when offline
        console.log('[useOfflineQuery] Offline, using cached data')
        return await getCacheFn()
      }
    },
    ...options,
  })
}

// Tasks with offline support
export function useOfflineTasks(
  organizationId: string | undefined,
  filter?: { status?: string[]; priority?: string }
) {
  const { isOnline } = useOfflineStore()

  return useQuery<Task[], Error>({
    queryKey: ['tasks', organizationId, filter?.status?.join(','), filter?.priority],
    queryFn: async () => {
      if (!organizationId) return []

      if (isOnline) {
        try {
          let query = supabase
            .from('tasks')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })

          if (filter?.status && filter.status.length > 0) {
            query = query.in('status', filter.status)
          }

          if (filter?.priority) {
            query = query.eq('priority', filter.priority)
          }

          const { data, error } = await query
          if (error) throw error
          return (data || []) as Task[]
        } catch (error) {
          console.log('[useOfflineTasks] Fetch failed, using cache')
          return await getCachedTasks(organizationId, filter) as Task[]
        }
      } else {
        console.log('[useOfflineTasks] Offline, using cache')
        return await getCachedTasks(organizationId, filter) as Task[]
      }
    },
    enabled: !!organizationId,
  })
}

// Single task with offline support
export function useOfflineTask(taskId: string | undefined) {
  const { isOnline } = useOfflineStore()

  return useQuery<Task | null, Error>({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) return null

      if (isOnline) {
        try {
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single()

          if (error) throw error
          return data as Task
        } catch (error) {
          console.log('[useOfflineTask] Fetch failed, using cache')
          return await getCachedById<Task>('tasks', taskId)
        }
      } else {
        console.log('[useOfflineTask] Offline, using cache')
        return await getCachedById<Task>('tasks', taskId)
      }
    },
    enabled: !!taskId,
  })
}

// Units with offline support
export function useOfflineUnits(organizationId: string | undefined) {
  const { isOnline } = useOfflineStore()

  return useQuery<Unit[], Error>({
    queryKey: ['units', organizationId],
    queryFn: async () => {
      if (!organizationId) return []

      if (isOnline) {
        try {
          const { data, error } = await supabase
            .from('units')
            .select('*')
            .eq('organization_id', organizationId)
            .order('address')

          if (error) throw error
          return (data || []) as Unit[]
        } catch (error) {
          console.log('[useOfflineUnits] Fetch failed, using cache')
          return await getCachedData<Unit>('units', organizationId)
        }
      } else {
        console.log('[useOfflineUnits] Offline, using cache')
        return await getCachedData<Unit>('units', organizationId)
      }
    },
    enabled: !!organizationId,
  })
}

// Single unit with offline support
export function useOfflineUnit(unitId: string | undefined) {
  const { isOnline } = useOfflineStore()

  return useQuery<Unit | null, Error>({
    queryKey: ['unit', unitId],
    queryFn: async () => {
      if (!unitId) return null

      if (isOnline) {
        try {
          const { data, error } = await supabase
            .from('units')
            .select('*')
            .eq('id', unitId)
            .single()

          if (error) throw error
          return data as Unit
        } catch (error) {
          console.log('[useOfflineUnit] Fetch failed, using cache')
          return await getCachedById<Unit>('units', unitId)
        }
      } else {
        console.log('[useOfflineUnit] Offline, using cache')
        return await getCachedById<Unit>('units', unitId)
      }
    },
    enabled: !!unitId,
  })
}

// Contractors with offline support
export function useOfflineContractors(organizationId: string | undefined) {
  const { isOnline } = useOfflineStore()

  return useQuery<Contractor[], Error>({
    queryKey: ['contractors', organizationId],
    queryFn: async () => {
      if (!organizationId) return []

      if (isOnline) {
        try {
          const { data, error } = await supabase
            .from('contractors')
            .select('*')
            .eq('organization_id', organizationId)
            .order('name')

          if (error) throw error
          return (data || []) as Contractor[]
        } catch (error) {
          console.log('[useOfflineContractors] Fetch failed, using cache')
          return await getCachedData<Contractor>('contractors', organizationId)
        }
      } else {
        console.log('[useOfflineContractors] Offline, using cache')
        return await getCachedData<Contractor>('contractors', organizationId)
      }
    },
    enabled: !!organizationId,
  })
}

// Single contractor with offline support
export function useOfflineContractor(contractorId: string | undefined) {
  const { isOnline } = useOfflineStore()

  return useQuery<Contractor | null, Error>({
    queryKey: ['contractor', contractorId],
    queryFn: async () => {
      if (!contractorId) return null

      if (isOnline) {
        try {
          const { data, error } = await supabase
            .from('contractors')
            .select('*')
            .eq('id', contractorId)
            .single()

          if (error) throw error
          return data as Contractor
        } catch (error) {
          console.log('[useOfflineContractor] Fetch failed, using cache')
          return await getCachedById<Contractor>('contractors', contractorId)
        }
      } else {
        console.log('[useOfflineContractor] Offline, using cache')
        return await getCachedById<Contractor>('contractors', contractorId)
      }
    },
    enabled: !!contractorId,
  })
}

// Mutation hook with offline queue support
export function useOfflineMutation<T extends { id?: string }>(
  tableName: string,
  options?: {
    onSuccess?: () => void
    onError?: (error: Error) => void
  }
) {
  const queryClient = useQueryClient()
  const { isOnline, refreshPendingCount } = useOfflineStore()

  return useMutation({
    mutationFn: async (params: {
      operation: 'INSERT' | 'UPDATE' | 'DELETE'
      data: T
      recordId?: string
    }) => {
      const { operation, data, recordId } = params
      const id = recordId || data.id || crypto.randomUUID()

      if (isOnline) {
        // Try to sync immediately
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const table = supabase.from(tableName as 'tasks')
          if (operation === 'INSERT') {
            const { error } = await (table as any).insert(data)
            if (error) throw error
          } else if (operation === 'UPDATE') {
            const { error } = await (table as any).update(data).eq('id', id)
            if (error) throw error
          } else if (operation === 'DELETE') {
            const { error } = await (table as any).delete().eq('id', id)
            if (error) throw error
          }
          return { id, queued: false }
        } catch (error) {
          // If online sync fails, queue for later
          console.log(`[useOfflineMutation] Online sync failed, queuing ${operation}`)
          await addToSyncQueue(operation, tableName, id, data as Record<string, unknown>)
          await refreshPendingCount()
          return { id, queued: true }
        }
      } else {
        // Offline - queue the operation
        console.log(`[useOfflineMutation] Offline, queuing ${operation}`)
        await addToSyncQueue(operation, tableName, id, data as Record<string, unknown>)
        await refreshPendingCount()
        return { id, queued: true }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] })
      options?.onSuccess?.()
    },
    onError: (error) => {
      options?.onError?.(error as Error)
    },
  })
}
