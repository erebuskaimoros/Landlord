import { create } from 'zustand'
import NetInfo from '@react-native-community/netinfo'
import {
  cacheData,
  getCachedData,
  getCachedTasks,
  getPendingSyncCount,
  processSync,
  clearCache,
  clearSyncQueue,
} from '../lib/offline'
import { supabase } from '../lib/supabase/client'

interface OfflineState {
  isOnline: boolean
  isSyncing: boolean
  pendingSyncCount: number
  lastSyncAt: string | null

  // Actions
  initialize: () => Promise<void>
  setOnline: (online: boolean) => void
  syncData: (organizationId: string) => Promise<void>
  processQueue: () => Promise<{ success: number; failed: number }>
  refreshPendingCount: () => Promise<void>
  clearAllCache: (organizationId?: string) => Promise<void>
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOnline: true,
  isSyncing: false,
  pendingSyncCount: 0,
  lastSyncAt: null,

  initialize: async () => {
    // Get initial network state
    const netState = await NetInfo.fetch()
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false)

    set({ isOnline })

    // Listen for network changes
    NetInfo.addEventListener((state) => {
      const wasOffline = !get().isOnline
      const nowOnline = state.isConnected && state.isInternetReachable !== false

      set({ isOnline: nowOnline ?? false })

      // Auto-sync when coming back online
      if (wasOffline && nowOnline) {
        console.log('[OfflineStore] Reconnected, auto-syncing...')
        setTimeout(() => {
          get().processQueue()
        }, 1000)
      }
    })

    // Get initial pending count
    await get().refreshPendingCount()
  },

  setOnline: (online: boolean) => {
    set({ isOnline: online })
  },

  syncData: async (organizationId: string) => {
    const { isOnline, isSyncing } = get()

    if (!isOnline || isSyncing) {
      console.log('[OfflineStore] Skip sync - offline or already syncing')
      return
    }

    set({ isSyncing: true })

    try {
      // Fetch and cache units
      const { data: units } = await supabase
        .from('units')
        .select('*')
        .eq('organization_id', organizationId)

      if (units) {
        await cacheData('units', organizationId, units)
      }

      // Fetch and cache tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', organizationId)

      if (tasks) {
        await cacheData('tasks', organizationId, tasks)
      }

      // Fetch and cache contractors
      const { data: contractors } = await supabase
        .from('contractors')
        .select('*')
        .eq('organization_id', organizationId)

      if (contractors) {
        await cacheData('contractors', organizationId, contractors)
      }

      // Fetch and cache tenants
      const { data: tenants } = await supabase
        .from('tenants')
        .select('*')
        .eq('organization_id', organizationId)

      if (tenants) {
        await cacheData('tenants', organizationId, tenants)
      }

      // Fetch and cache active leases
      const { data: leases } = await supabase
        .from('leases')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')

      if (leases) {
        await cacheData('leases', organizationId, leases)
      }

      set({ lastSyncAt: new Date().toISOString() })
      console.log('[OfflineStore] Data sync complete')
    } catch (error) {
      console.error('[OfflineStore] Sync error:', error)
    } finally {
      set({ isSyncing: false })
    }
  },

  processQueue: async () => {
    const { isSyncing, isOnline } = get()

    if (!isOnline || isSyncing) {
      return { success: 0, failed: 0 }
    }

    set({ isSyncing: true })

    try {
      const result = await processSync()
      await get().refreshPendingCount()
      return result
    } finally {
      set({ isSyncing: false })
    }
  },

  refreshPendingCount: async () => {
    const count = await getPendingSyncCount()
    set({ pendingSyncCount: count })
  },

  clearAllCache: async (organizationId?: string) => {
    await clearCache(organizationId)
    await clearSyncQueue()
    set({ pendingSyncCount: 0, lastSyncAt: null })
  },
}))
