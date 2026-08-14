import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';

import { ROLE_LABELS } from '@/domain/user';
import { useSessionStore } from '@/stores/session-store';
import { useThemeStore } from '@/stores/theme-store';
import { SyncStatusBar } from '@/components/sync-status-bar';
import { BackButton } from '@/components/back-button';
import { brand } from '@/theme/colors';

const THEME_ICONS = {
  light: 'sunny',
  dark: 'moon',
  system: 'contrast',
} as const;

export function SessionHeader() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const signOut = useSessionStore((s) => s.signOut);
  const theme = useThemeStore((s) => s.theme);
  const cycleTheme = useThemeStore((s) => s.cycleTheme);
  const { colorScheme } = useColorScheme();
  const [busy, setBusy] = useState(false);

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center gap-2">
          <BackButton />
          <View className="rounded-full bg-brand-600 px-3 py-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-white">
              {ROLE_LABELS[user.role]}
            </Text>
          </View>
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {user.name}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={cycleTheme}
            accessibilityLabel="Toggle theme"
            className="rounded-xl border border-neutral-200 p-2 active:opacity-70 dark:border-neutral-700"
          >
            <Ionicons
              name={THEME_ICONS[theme]}
              size={18}
              color={colorScheme === 'dark' ? brand[400] : brand[700]}
            />
          </Pressable>
          <Pressable
            onPress={() => router.push('/notifications')}
            accessibilityLabel="Notifications"
            className="rounded-xl border border-neutral-200 p-2 active:opacity-70 dark:border-neutral-700"
          >
            <Ionicons
              name="notifications-outline"
              size={18}
              color={colorScheme === 'dark' ? brand[400] : brand[700]}
            />
          </Pressable>
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityLabel="Profile"
            className="rounded-xl border border-neutral-200 p-2 active:opacity-70 dark:border-neutral-700"
          >
            <Ionicons
              name="person-circle-outline"
              size={18}
              color={colorScheme === 'dark' ? brand[400] : brand[700]}
            />
          </Pressable>
          <Pressable
            onPress={handleSignOut}
            disabled={busy}
            className="rounded-xl px-3 py-1.5 active:opacity-70"
          >
            <Text className="text-sm font-medium text-red-600 dark:text-red-400">
              {busy ? '...' : 'Sign out'}
            </Text>
          </Pressable>
        </View>
      </View>
      <SyncStatusBar />
    </View>
  );
}
