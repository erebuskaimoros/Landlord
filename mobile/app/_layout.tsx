import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useColorScheme } from '@/components/useColorScheme';
import { useAuthStore } from '@/src/store/auth';
import { useOfflineStore } from '@/src/store/offline';
import { useSettingsStore } from '@/src/store/settings';
import { OfflineIndicator } from '@/src/components/ui/OfflineIndicator';
import { useLocationNavigation } from '@/src/hooks/useLocationNavigation';
import { NearbyUnitsModal } from '@/src/components/location/NearbyUnitsModal';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const { initialize: initAuth, isInitialized: authInitialized } = useAuthStore();
  const { initialize: initSettings, isInitialized: settingsInitialized } = useSettingsStore();

  // Initialize auth and settings on mount
  useEffect(() => {
    initAuth();
    initSettings();
  }, []);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  const isFullyInitialized = loaded && authInitialized && settingsInitialized;

  useEffect(() => {
    if (isFullyInitialized) {
      SplashScreen.hideAsync();
    }
  }, [isFullyInitialized]);

  if (!isFullyInitialized) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, isLoading, organization } = useAuthStore();
  const { initialize: initOffline, syncData, isOnline } = useOfflineStore();
  const { autoNavigateEnabled, autoNavigateRadius } = useSettingsStore();
  const segments = useSegments();
  const router = useRouter();

  // Initialize offline store
  useEffect(() => {
    initOffline();
  }, []);

  // Sync data when organization is available and online
  useEffect(() => {
    if (organization?.id && isOnline) {
      syncData(organization.id);
    }
  }, [organization?.id, isOnline]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Redirect to main app if authenticated
      router.replace('/(tabs)');
    }
  }, [session, segments, isLoading]);

  // Location-based auto-navigation (only when authenticated)
  const isAuthenticated = !!session && !!organization;
  const {
    nearbyUnits,
    dismissUntilNextSession,
  } = useLocationNavigation({
    enabled: autoNavigateEnabled && isAuthenticated,
    radiusMeters: autoNavigateRadius,
  });

  // Show modal when multiple units are nearby
  const showNearbyModal = nearbyUnits.length > 1;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="tasks/[id]" options={{ title: 'Task Details' }} />
        <Stack.Screen name="units/[id]" options={{ title: 'Unit Details' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <OfflineIndicator position="bottom" />
      <NearbyUnitsModal
        visible={showNearbyModal}
        units={nearbyUnits}
        onDismiss={dismissUntilNextSession}
      />
    </ThemeProvider>
  );
}
