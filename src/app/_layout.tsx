import '@/global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
import { StatusBar, Text, View } from 'react-native';

import { db, initDatabase } from '@/data/db';
import { seedIfEmpty } from '@/data/seed';
import { configureNotifications } from '@/services/notifications';
import { SplashScreen } from '@/components/splash-screen';
import { useSessionStore } from '@/stores/session-store';
import { useThemeStore } from '@/stores/theme-store';
import { useAutoSync } from '@/sync/hooks';

const queryClient = new QueryClient();

function AppContent() {
  const { colorScheme } = useColorScheme();
  useAutoSync();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <StatusBar
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={colorScheme === 'dark' ? '#0A0A0A' : '#FAFAFA'}
        />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="manager" />
          <Stack.Screen name="cashier" />
          <Stack.Screen name="washer" />
        </Stack>
      </View>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const { setColorScheme } = useColorScheme();
  const theme = useThemeStore((s) => s.theme);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState(false);

  useEffect(() => {
    setColorScheme(theme);
  }, [theme, setColorScheme]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initDatabase();
        if (cancelled) return;
        if (__DEV__) {
          try {
            await seedIfEmpty(db);
          } catch (error) {
            console.warn('Seed failed (non-fatal)', error);
          }
        }
        setDatabaseReady(true);
      } catch (error) {
        console.error('Database init failed', error);
        if (!cancelled) {
          setDatabaseError(true);
        }
        return;
      }
      try {
        await configureNotifications();
      } catch (error) {
        console.warn('Notification setup failed (non-fatal)', error);
      }
      await useSessionStore.getState().hydrate();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {databaseError ? (
        <View className="flex-1 items-center justify-center bg-neutral-50 px-8 dark:bg-neutral-950">
          <Text className="text-lg font-semibold text-red-600 dark:text-red-400">
            Database initialization failed
          </Text>
          <Text className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Restart the app. If it persists, clear the app data and reload.
          </Text>
        </View>
      ) : databaseReady ? (
        <AppContent />
      ) : (
        <SplashScreen />
      )}
    </QueryClientProvider>
  );
}
