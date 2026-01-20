import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SETTINGS_STORAGE_KEY = '@landlord/settings'

interface SettingsState {
  // Location settings
  autoNavigateEnabled: boolean
  autoNavigateRadius: number // in meters, default 75

  // Internal state
  isInitialized: boolean

  // Actions
  initialize: () => Promise<void>
  setAutoNavigateEnabled: (enabled: boolean) => Promise<void>
  setAutoNavigateRadius: (radius: number) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  autoNavigateEnabled: true, // On by default for discoverability
  autoNavigateRadius: 75, // 75 meters default
  isInitialized: false,

  initialize: async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        set({
          autoNavigateEnabled: parsed.autoNavigateEnabled ?? true,
          autoNavigateRadius: parsed.autoNavigateRadius ?? 75,
          isInitialized: true,
        })
      } else {
        set({ isInitialized: true })
      }
    } catch (error) {
      console.error('[Settings] Error loading settings:', error)
      set({ isInitialized: true })
    }
  },

  setAutoNavigateEnabled: async (enabled: boolean) => {
    set({ autoNavigateEnabled: enabled })
    await persistSettings(get())
  },

  setAutoNavigateRadius: async (radius: number) => {
    // Clamp radius between 50 and 150 meters
    const clampedRadius = Math.min(Math.max(radius, 50), 150)
    set({ autoNavigateRadius: clampedRadius })
    await persistSettings(get())
  },
}))

async function persistSettings(state: SettingsState): Promise<void> {
  try {
    const toStore = {
      autoNavigateEnabled: state.autoNavigateEnabled,
      autoNavigateRadius: state.autoNavigateRadius,
    }
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(toStore))
  } catch (error) {
    console.error('[Settings] Error persisting settings:', error)
  }
}
