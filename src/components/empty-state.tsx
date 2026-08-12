import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="mb-3 rounded-full bg-brand-50 p-5 dark:bg-brand-950">
        <Ionicons name={icon} size={36} color="#0891B2" />
      </View>
      <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{title}</Text>
      <Text className="mt-2 text-center text-base text-neutral-500 dark:text-neutral-400">
        {subtitle}
      </Text>
    </View>
  );
}