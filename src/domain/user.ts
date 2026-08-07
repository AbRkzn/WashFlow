export const USER_ROLES = ['admin', 'manager', 'cashier', 'washer'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  cashier: 'Cashier',
  washer: 'Washer',
};
