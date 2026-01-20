import { StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native'
import { useEffect, useRef } from 'react'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Text, View } from '@/components/Themed'
import { useOfflineStore } from '@/src/store/offline'

interface OfflineIndicatorProps {
  position?: 'top' | 'bottom'
  showPendingCount?: boolean
}

export function OfflineIndicator({
  position = 'top',
  showPendingCount = true,
}: OfflineIndicatorProps) {
  const { isOnline, isSyncing, pendingSyncCount, processQueue } = useOfflineStore()
  const slideAnim = useRef(new Animated.Value(-60)).current

  useEffect(() => {
    if (!isOnline || (pendingSyncCount > 0 && isOnline)) {
      // Show indicator
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start()
    } else {
      // Hide indicator
      Animated.timing(slideAnim, {
        toValue: -60,
        duration: 300,
        useNativeDriver: true,
      }).start()
    }
  }, [isOnline, pendingSyncCount, slideAnim])

  // Don't render if online and no pending items
  if (isOnline && pendingSyncCount === 0) {
    return null
  }

  const handleSync = () => {
    if (isOnline && !isSyncing && pendingSyncCount > 0) {
      processQueue()
    }
  }

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'top' ? styles.top : styles.bottom,
        { transform: [{ translateY: slideAnim }] },
        !isOnline ? styles.offlineContainer : styles.pendingContainer,
      ]}
    >
      <View style={styles.content}>
        {!isOnline ? (
          <>
            <FontAwesome name="wifi" size={14} color="#fff" style={styles.icon} />
            <Text style={styles.text}>You're offline</Text>
          </>
        ) : (
          <>
            <FontAwesome name="cloud-upload" size={14} color="#fff" style={styles.icon} />
            <Text style={styles.text}>
              {pendingSyncCount} pending {pendingSyncCount === 1 ? 'change' : 'changes'}
            </Text>
          </>
        )}
      </View>

      {isOnline && pendingSyncCount > 0 && (
        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.syncButtonText}>Sync</Text>
          )}
        </TouchableOpacity>
      )}
    </Animated.View>
  )
}

// Compact banner version for embedding in headers
export function OfflineBanner() {
  const { isOnline, isSyncing, pendingSyncCount, processQueue } = useOfflineStore()

  if (isOnline && pendingSyncCount === 0) {
    return null
  }

  return (
    <TouchableOpacity
      style={[
        styles.banner,
        !isOnline ? styles.offlineBanner : styles.pendingBanner,
      ]}
      onPress={() => isOnline && pendingSyncCount > 0 && !isSyncing && processQueue()}
      disabled={!isOnline || isSyncing || pendingSyncCount === 0}
    >
      {!isOnline ? (
        <>
          <FontAwesome name="wifi" size={12} color="#fff" />
          <Text style={styles.bannerText}>Offline Mode</Text>
        </>
      ) : (
        <>
          {isSyncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <FontAwesome name="cloud-upload" size={12} color="#fff" />
          )}
          <Text style={styles.bannerText}>
            {isSyncing ? 'Syncing...' : `${pendingSyncCount} pending`}
          </Text>
        </>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1000,
  },
  top: {
    top: 50,
  },
  bottom: {
    bottom: 100,
  },
  offlineContainer: {
    backgroundColor: '#6b7280',
  },
  pendingContainer: {
    backgroundColor: '#2563eb',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'transparent',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  syncButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Banner styles
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  offlineBanner: {
    backgroundColor: '#6b7280',
  },
  pendingBanner: {
    backgroundColor: '#2563eb',
  },
  bannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
})
