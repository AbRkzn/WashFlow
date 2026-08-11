import type { UserRole } from '@/domain/user';

export const ROLE_HOME_ROUTES: Record<UserRole, '/admin' | '/manager' | '/cashier' | '/washer'> = {
  admin: '/admin',
  manager: '/manager',
  cashier: '/cashier',
  washer: '/washer',
};
