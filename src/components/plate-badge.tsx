import { Text, View } from 'react-native';

export function PlateBadge({ plate, size = 'sm' }: { plate: string; size?: 'sm' | 'lg' }) {
  return (
    <View
      className={`rounded-xl bg-neutral-900 px-3 py-1 dark:bg-white ${
        size === 'lg' ? '' : 'self-start'
      }`}
    >
      <Text
        className={`font-bold tracking-widest ${
          size === 'lg' ? 'text-xl' : 'text-base'
        } text-white dark:text-neutral-900`}
      >
        {plate}
      </Text>
    </View>
  );
}