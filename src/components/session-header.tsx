import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ROLE_LABELS } from '@/domain/user';
import { useSessionStore } from '@/stores/session-store';
import { SyncStatusBar } from '@/components/sync-status-bar';

export function SessionHeader() {
  const user = useSessionStore((s) => s.user);
  const signOut = useSessionStore((s) => s.signOut);
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
          <View className="rounded-full bg-brand-600 px-3 py-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-white">
              {ROLE_LABELS[user.role]}
            </Text>
          </View>
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {user.name}
          </Text>
        </View>
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
      <SyncStatusBar />
    </View>
  );
}
