import '@/global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { db, initDatabase } from '@/data/db';
import { seedIfEmpty } from '@/data/seed';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const [databaseReady, setDatabaseReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    initDatabase()
      .then(async () => {
        if (cancelled) return;
        if (__DEV__) {
          await seedIfEmpty(db);
        }
        setDatabaseReady(true);
      })
      .catch((error) => {
        console.error('Database init failed', error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style="auto" />
        {databaseReady ? (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="admin" />
            <Stack.Screen name="manager" />
            <Stack.Screen name="cashier" />
            <Stack.Screen name="washer" />
          </Stack>
        ) : (
          <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
            <Text className="text-2xl font-bold text-brand-700 dark:text-brand-400">WashFlow</Text>
          </View>
        )}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
