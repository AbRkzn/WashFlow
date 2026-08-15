import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/stores/session-store';
import { ROLE_HOME_ROUTES } from '@/utils/routes';

/**
 * Empty state shown when a job detail screen can't find the job on the
 * user's board (e.g. after a reassignment). Centered icon + copy + CTA back.
 */
export function JobNotFound({ title = 'Job not found' }: { title?: string }) {
  const router = useRouter();
  const role = useSessionStore((s) => s.user?.role);

  const goHome = () => {
    if (role) {
      router.replace(ROLE_HOME_ROUTES[role]);
    } else {
      router.replace('/');
    }
  };

  return (
    <View className="items-center px-6 py-20">
      <View className="h-20 w-20 items-center justify-center rounded-3xl bg-neutral-100 dark:bg-neutral-900">
        <Ionicons name="car-sport-outline" size={36} color="#94A3B8" />
      </View>
      <Text className="mt-5 text-xl font-bold text-neutral-900 dark:text-white">
        {title}
      </Text>
      <Text className="mt-2 max-w-[260px] text-center text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
        This job is no longer on your board. It may have been reassigned or released while you were working.
      </Text>
      <View className="mt-6 w-full">
        <Button
          label="Back to my jobs"
          icon="arrow-back-outline"
          onPress={goHome}
        />
      </View>
    </View>
  );
}