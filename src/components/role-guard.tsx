import { Redirect } from 'expo-router';
import type { PropsWithChildren } from 'react';

import type { UserRole } from '@/domain/user';
import { useSessionStore } from '@/stores/session-store';

interface RoleGuardProps extends PropsWithChildren {
  roles: UserRole[];
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
