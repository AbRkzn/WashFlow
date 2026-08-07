import { Redirect } from 'expo-router';
import { Pressable, SafeAreaView, Text, View } from 'react-native';

import { useSessionStore } from '@/stores/session-store';

export default function SignInScreen() {
  const setUser = useSessionStore((s) => s.setUser);
  const user = useSessionStore((s) => s.user);

  if (user) {
    return <Redirect href="/" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <View className="flex-1 items-center justify-center px-8">
        <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-brand-600">
          <Text className="text-3xl font-bold text-white">W</Text>
        </View>
        <Text className="text-3xl font-bold text-neutral-900 dark:text-white">WashFlow</Text>
        <Text className="mt-2 text-center text-base text-neutral-500 dark:text-neutral-400">
          Offline-first car wash management. Sign in to continue.
        </Text>
        <Pressable
          onPress={() =>
            setUser({ id: 'demo-admin', name: 'Demo Admin', email: 'demo@washflow.app', role: 'admin' })
          }
          className="mt-8 w-full rounded-2xl bg-brand-600 px-6 py-4 active:opacity-80"
        >
          <Text className="text-center text-base font-semibold text-white">
            Sign in (demo placeholder)
          </Text>
        </Pressable>
        <Text className="mt-4 text-center text-xs text-neutral-400 dark:text-neutral-500">
          P0 skeleton — real Supabase auth lands in P2.
        </Text>
      </View>
    </SafeAreaView>
  );
}
