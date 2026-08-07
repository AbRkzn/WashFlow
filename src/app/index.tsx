import { Redirect } from 'expo-router';

import { useSessionStore } from '@/stores/session-store';

const roleHome = {
  admin: '/admin',
  manager: '/manager',
  cashier: '/cashier',
  washer: '/washer',
} as const;

export default function AppIndex() {
  const user = useSessionStore((s) => s.user);

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  return <Redirect href={roleHome[user.role]} />;
}
