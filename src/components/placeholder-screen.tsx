import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PlaceholderScreenProps {
  title: string;
  description: string;
  badge?: string;
  header?: ReactNode;
}

export function PlaceholderScreen({ title, description, badge, header }: PlaceholderScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {header}
      <View className="flex-1 items-center justify-center px-8">
        {badge ? (
          <View className="mb-4 rounded-full bg-brand-600 px-4 py-1.5">
            <Text className="text-xs font-semibold uppercase tracking-wider text-white">
              {badge}
            </Text>
          </View>
        ) : null}
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{title}</Text>
        <Text className="mt-2 text-center text-base text-neutral-500 dark:text-neutral-400">
          {description}
        </Text>
      </View>
    </SafeAreaView>
  );
}
