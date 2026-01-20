import * as Location from 'expo-location'
import { Tables } from '../types/database'

type Unit = Tables<'units'>

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface LocationResult {
  coords: Coordinates
  accuracy: number | null
  timestamp: number
}

export interface UnitWithDistance extends Unit {
  distance: number // distance in meters
}

// Request location permissions
export async function requestLocationPermission(): Promise<boolean> {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync()
  return foregroundStatus === 'granted'
}

// Check if location permission is granted
export async function hasLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync()
  return status === 'granted'
}

// Get current device position
export async function getCurrentPosition(): Promise<LocationResult | null> {
  try {
    const hasPermission = await hasLocationPermission()
    if (!hasPermission) {
      console.log('[Location] Permission not granted')
      return null
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })

    return {
      coords: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp,
    }
  } catch (error) {
    console.error('[Location] Error getting current position:', error)
    return null
  }
}

// Calculate distance between two coordinates using Haversine formula
// Returns distance in meters
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// Find units within a given radius of the current position
export function findNearbyUnits(
  position: Coordinates,
  units: Unit[],
  radiusMeters: number = 75
): UnitWithDistance[] {
  const unitsWithCoords = units.filter(
    (unit): unit is Unit & { latitude: number; longitude: number } =>
      unit.latitude !== null && unit.longitude !== null
  )

  if (unitsWithCoords.length === 0) {
    return []
  }

  const nearbyUnits: UnitWithDistance[] = []

  for (const unit of unitsWithCoords) {
    const distance = calculateDistance(
      position.latitude,
      position.longitude,
      unit.latitude,
      unit.longitude
    )

    if (distance <= radiusMeters) {
      nearbyUnits.push({
        ...unit,
        distance,
      })
    }
  }

  // Sort by distance (closest first)
  return nearbyUnits.sort((a, b) => a.distance - b.distance)
}

// Format distance for display
export function formatDistance(meters: number): string {
  if (meters < 100) {
    return `${Math.round(meters)}m`
  } else if (meters < 1000) {
    return `${Math.round(meters / 10) * 10}m`
  } else {
    return `${(meters / 1000).toFixed(1)}km`
  }
}

// Check if location accuracy is acceptable (100m or better)
export function isAccuracyAcceptable(accuracy: number | null): boolean {
  if (accuracy === null) return false
  return accuracy <= 100
}
