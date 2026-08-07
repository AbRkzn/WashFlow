import { Redirect } from 'expo-router';
import type { PropsWithChildren } from 'react';

import { useSessionStore, type Role } from '@/stores/session-store';

interface RoleGuardProps extends PropsWithChildren {
  roles: Role[];
}

export function RoleGuard({ roles, children }: RoleGuardProps) {
  const user = useSessionStore((s) => s.user);

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  if (!roles.includes(user.role)) {
    return <Redirect href="/" />;
  }

  return children;
}
