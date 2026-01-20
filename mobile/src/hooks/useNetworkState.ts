import { useState, useEffect, useCallback, useRef } from 'react'
import NetInfo, { NetInfoState } from '@react-native-community/netinfo'
import { getPendingSyncCount, processSync } from '../lib/offline'

interface NetworkState {
  isConnected: boolean
  isInternetReachable: boolean | null
  type: string
}

interface UseNetworkStateReturn {
  isOnline: boolean
  networkState: NetworkState
  pendingSyncCount: number
  isSyncing: boolean
  lastSyncResult: { success: number; failed: number } | null
  triggerSync: () => Promise<void>
}

export function useNetworkState(): UseNetworkStateReturn {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
  })
  const [pendingSyncCount, setPendingSyncCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<{ success: number; failed: number } | null>(null)

  const wasOffline = useRef(false)

  // Update pending sync count
  const updatePendingCount = useCallback(async () => {
    const count = await getPendingSyncCount()
    setPendingSyncCount(count)
  }, [])

  // Perform sync
  const triggerSync = useCallback(async () => {
    if (isSyncing || !networkState.isConnected) return

    setIsSyncing(true)
    try {
      const result = await processSync()
      setLastSyncResult(result)
      await updatePendingCount()
    } catch (error) {
      console.error('[NetworkState] Sync error:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, networkState.isConnected, updatePendingCount])

  // Listen for network state changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const newNetworkState: NetworkState = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      }

      setNetworkState(newNetworkState)

      // Check if we just came back online
      const isNowOnline = newNetworkState.isConnected && newNetworkState.isInternetReachable !== false

      if (wasOffline.current && isNowOnline) {
        console.log('[NetworkState] Back online, triggering sync')
        // Small delay to ensure connection is stable
        setTimeout(() => {
          triggerSync()
        }, 1000)
      }

      wasOffline.current = !isNowOnline
    })

    // Get initial state
    NetInfo.fetch().then((state) => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      })
      wasOffline.current = !(state.isConnected && state.isInternetReachable !== false)
    })

    return () => unsubscribe()
  }, [triggerSync])

  // Update pending count periodically and on mount
  useEffect(() => {
    updatePendingCount()

    // Update count every 30 seconds
    const interval = setInterval(updatePendingCount, 30000)

    return () => clearInterval(interval)
  }, [updatePendingCount])

  const isOnline = networkState.isConnected && networkState.isInternetReachable !== false

  return {
    isOnline,
    networkState,
    pendingSyncCount,
    isSyncing,
    lastSyncResult,
    triggerSync,
  }
}
