import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { useColorScheme } from 'nativewind';

import { useSessionStore } from '@/stores/session-store';
import { ROLE_HOME_ROUTES } from '@/utils/routes';
import { brand } from '@/theme/colors';

export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const role = useSessionStore((s) => s.user?.role);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (role && pathname === ROLE_HOME_ROUTES[role]) {
    return null;
  }

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (role) {
      router.replace(ROLE_HOME_ROUTES[role]);
    }
  };

  return (
    <Pressable
      onPress={goBack}
      accessibilityLabel="Go back"
      className="rounded-xl border border-neutral-200 p-2 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
    >
      <Ionicons name="arrow-back" size={18} color={isDark ? brand[400] : brand[700]} />
    </Pressable>
  );
}
