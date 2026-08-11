import { Redirect } from 'expo-router';

import { useSessionStore } from '@/stores/session-store';
import { ROLE_HOME_ROUTES } from '@/utils/routes';

export default function AppIndex() {
  const user = useSessionStore((s) => s.user);

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  return <Redirect href={ROLE_HOME_ROUTES[user.role]} />;
}
