import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <View className="min-w-0 flex-1 flex-row items-center gap-3">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityLabel="Go back"
          className="rounded-xl border border-neutral-200 p-2 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
        >
          <Ionicons name="arrow-back" size={18} color="#0E7490" />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text className="text-lg font-bold text-neutral-900 dark:text-white">{title}</Text>
          {subtitle ? (
            <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {right ? <View className="ml-3">{right}</View> : null}
    </View>
  );
}
