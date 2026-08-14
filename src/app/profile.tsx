import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';

import { BackButton } from '@/components/back-button';
import { RoleGuard } from '@/components/role-guard';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { Screen } from '@/components/ui/screen';
import { ROLE_LABELS } from '@/domain/user';
import { useSessionStore } from '@/stores/session-store';
import { THEME_LABELS, THEME_OPTIONS, useThemeStore } from '@/stores/theme-store';
import { ROLE_HOME_ROUTES } from '@/utils/routes';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const signOut = useSessionStore((s) => s.signOut);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
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
      Alert.alert('Could not sign out', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <RoleGuard roles={['admin', 'manager', 'cashier', 'washer']}>
      <Screen padded={false} scroll={false}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View className="flex-row items-center gap-3">
            <BackButton />
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
              Profile & settings
            </Text>
          </View>

          <Card className="mt-4 items-center gap-2 py-6">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-brand-600">
              <Text className="text-3xl font-black text-white">
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text className="text-xl font-bold text-neutral-900 dark:text-white">
              {user.name}
            </Text>
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              {user.email}
            </Text>
            <View className="mt-1 rounded-full bg-brand-100 px-3 py-1 dark:bg-brand-950">
              <Text className="text-xs font-bold uppercase tracking-wide text-brand-800 dark:text-brand-200">
                {ROLE_LABELS[user.role]}
              </Text>
            </View>
          </Card>

          <SectionHeader title="Appearance" />
          <Card>
            {THEME_OPTIONS.map((option, index) => {
              const active = option === theme;
              return (
                <Pressable
                  key={option}
                  onPress={() => setTheme(option)}
                  className={`flex-row items-center justify-between py-3 ${
                    index > 0 ? 'mt-2 border-t border-neutral-100 pt-3 dark:border-neutral-800' : ''
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <Ionicons
                      name={
                        option === 'light'
                          ? 'sunny-outline'
                          : option === 'dark'
                            ? 'moon-outline'
                            : 'contrast-outline'
                      }
                      size={20}
                      color={colorScheme === 'dark' ? '#67E8F9' : '#0E7490'}
                    />
                    <Text className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
                      {THEME_LABELS[option]}
                    </Text>
                  </View>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={22} color="#0891B2" />
                  ) : (
                    <View className="h-5 w-5 rounded-full border-2 border-neutral-300 dark:border-neutral-600" />
                  )}
                </Pressable>
              );
            })}
          </Card>

          <SectionHeader title="Offline & data" />
          <Card>
            <Pressable
              onPress={() => router.push('/sync')}
              className="flex-row items-center justify-between py-3"
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="cloud-outline" size={20} color="#0891B2" />
                <View>
                  <Text className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
                    Sync status
                  </Text>
                  <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                    Pending changes, retries, last sync
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/notifications')}
              className="mt-2 flex-row items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800"
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="notifications-outline" size={20} color="#0891B2" />
                <View>
                  <Text className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
                    Notifications
                  </Text>
                  <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                    Job updates, payments, day close
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>
            <Pressable
              onPress={() => router.push(ROLE_HOME_ROUTES[user.role])}
              className="mt-2 flex-row items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800"
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="home-outline" size={20} color="#0891B2" />
                <View>
                  <Text className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
                    Back to home
                  </Text>
                  <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                    {ROLE_LABELS[user.role]} workspace
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>
          </Card>

          <SectionHeader title="Account" />
          <Card>
            <Pressable
              onPress={handleSignOut}
              disabled={busy}
              className="flex-row items-center justify-center gap-2 py-3"
            >
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
              <Text className="text-base font-semibold text-red-600 dark:text-red-400">
                {busy ? 'Signing out…' : 'Sign out'}
              </Text>
            </Pressable>
          </Card>

          <Text className="mt-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
            WashFlow · offline-first car wash management
          </Text>
        </ScrollView>
      </Screen>
    </RoleGuard>
  );
}