import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

interface StatCardProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint?: string;
  trend?: string;
}

export function StatCard({ label, value, icon, tint = '#0891B2', trend }: StatCardProps) {
  return (
    <View className="flex-1 rounded-3xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <View
        className="h-9 w-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${tint}1A` }}
      >
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text className="mt-3 text-2xl font-bold text-neutral-900 dark:text-white">{value}</Text>
      <Text className="mt-0.5 text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {label}
      </Text>
      {trend ? (
        <Text className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {trend}
        </Text>
      ) : null}
    </View>
  );
}