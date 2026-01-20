import { useState, useEffect, useCallback, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { useRouter, useSegments, usePathname } from 'expo-router'
import {
  getCurrentPosition,
  findNearbyUnits,
  hasLocationPermission,
  requestLocationPermission,
  isAccuracyAcceptable,
  UnitWithDistance,
} from '../services/location'
import { useAuthStore } from '../store/auth'
import { useOfflineStore } from '../store/offline'
import { getCachedData, getCachedUnitsWithCoordinates } from '../lib/offline/database'
import { supabase } from '../lib/supabase/client'
import { Tables } from '../types/database'

type Unit = Tables<'units'>

interface UseLocationNavigationOptions {
  enabled: boolean
  radiusMeters?: number
  cooldownMs?: number
}

interface UseLocationNavigationResult {
  nearbyUnits: UnitWithDistance[]
  isChecking: boolean
  checkNow: () => Promise<void>
  dismissUntilNextSession: () => void
  isDismissed: boolean
  permissionDenied: boolean
}

const DEFAULT_COOLDOWN_MS = 30000 // 30 seconds
const DEFAULT_RADIUS_METERS = 75

export function useLocationNavigation(
  options: UseLocationNavigationOptions
): UseLocationNavigationResult {
  const { enabled, radiusMeters = DEFAULT_RADIUS_METERS, cooldownMs = DEFAULT_COOLDOWN_MS } = options

  const [nearbyUnits, setNearbyUnits] = useState<UnitWithDistance[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)

  const lastCheckRef = useRef<number>(0)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)

  const { organization } = useAuthStore()
  const { isOnline } = useOfflineStore()
  const router = useRouter()
  const segments = useSegments()
  const pathname = usePathname()

  // Check if user is already on a unit detail page
  const isOnUnitDetailPage = pathname.startsWith('/units/')

  // Get units with coordinates (from network or cache)
  const getUnitsWithCoordinates = useCallback(async (): Promise<Unit[]> => {
    if (!organization?.id) return []

    try {
      if (isOnline) {
        // Fetch from network
        const { data, error } = await supabase
          .from('units')
          .select('*')
          .eq('organization_id', organization.id)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)

        if (error) throw error
        return data || []
      } else {
        // Use cached data for offline mode
        return await getCachedUnitsWithCoordinates(organization.id)
      }
    } catch (error) {
      console.error('[LocationNav] Error fetching units:', error)
      // Fallback to cache on error
      return await getCachedUnitsWithCoordinates(organization.id)
    }
  }, [organization?.id, isOnline])

  // Perform location check
  const checkLocation = useCallback(async () => {
    // Skip if disabled, dismissed, or already on unit page
    if (!enabled || isDismissed || isOnUnitDetailPage) {
      return
    }

    // Check cooldown
    const now = Date.now()
    if (now - lastCheckRef.current < cooldownMs) {
      console.log('[LocationNav] Skipping check - cooldown active')
      return
    }

    // Check permission
    const hasPermission = await hasLocationPermission()
    if (!hasPermission) {
      const granted = await requestLocationPermission()
      if (!granted) {
        setPermissionDenied(true)
        return
      }
    }
    setPermissionDenied(false)

    setIsChecking(true)
    lastCheckRef.current = now

    try {
      // Get current position
      const position = await getCurrentPosition()
      if (!position) {
        console.log('[LocationNav] Could not get position')
        return
      }

      // Check accuracy
      if (!isAccuracyAcceptable(position.accuracy)) {
        console.log('[LocationNav] GPS accuracy too low:', position.accuracy)
        return
      }

      // Get units with coordinates
      const units = await getUnitsWithCoordinates()
      if (units.length === 0) {
        console.log('[LocationNav] No units with coordinates')
        return
      }

      // Find nearby units
      const nearby = findNearbyUnits(position.coords, units, radiusMeters)
      console.log(`[LocationNav] Found ${nearby.length} nearby units`)

      setNearbyUnits(nearby)

      // Auto-navigate if exactly one unit is nearby
      if (nearby.length === 1) {
        console.log('[LocationNav] Auto-navigating to unit:', nearby[0].id)
        router.push(`/units/${nearby[0].id}`)
        setNearbyUnits([]) // Clear after navigation
      }
      // If multiple units, the modal will be shown by the component
    } catch (error) {
      console.error('[LocationNav] Error during location check:', error)
    } finally {
      setIsChecking(false)
    }
  }, [enabled, isDismissed, isOnUnitDetailPage, cooldownMs, radiusMeters, getUnitsWithCoordinates, router])

  // Manual check trigger
  const checkNow = useCallback(async () => {
    lastCheckRef.current = 0 // Reset cooldown
    await checkLocation()
  }, [checkLocation])

  // Dismiss until next session
  const dismissUntilNextSession = useCallback(() => {
    setIsDismissed(true)
    setNearbyUnits([])
  }, [])

  // Listen for app state changes (foreground)
  useEffect(() => {
    if (!enabled) return

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // Check when app comes to foreground
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[LocationNav] App came to foreground, checking location')
        checkLocation()
      }
      appStateRef.current = nextAppState
    })

    return () => subscription.remove()
  }, [enabled, checkLocation])

  // Initial check when enabled
  useEffect(() => {
    if (enabled && organization?.id) {
      // Delay initial check slightly to let auth/data settle
      const timer = setTimeout(() => {
        checkLocation()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [enabled, organization?.id])

  return {
    nearbyUnits,
    isChecking,
    checkNow,
    dismissUntilNextSession,
    isDismissed,
    permissionDenied,
  }
}
