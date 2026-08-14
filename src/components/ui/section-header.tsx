import type { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';

interface SectionHeaderProps extends PropsWithChildren {
  title: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View className="mb-2 mt-6 flex-row items-center justify-between">
      <Text className="text-sm font-bold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {title}
      </Text>
      {action}
    </View>
  );
}