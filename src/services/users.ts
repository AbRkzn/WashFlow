import { supabase } from '@/api/supabase';
import { db } from '@/data/db';
import { UserRepository } from '@/data/repositories';
import type { User } from '@/data/schema';
import { logAudit } from '@/services/audit';
import { provisionUser } from '@/services/provisioning';
import type { UserRole } from '@/domain/user';

const userRepository = new UserRepository(db);

export interface ProvisionUserInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

const ADMIN_USERS_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-users`;

interface RemoteUserPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AdminUsersResponse {
  users?: RemoteUserPayload[];
  id?: string;
  email?: string;
  name?: string;
  role?: UserRole;
  error?: string;
}

async function adminUsersCall(body: Record<string, unknown>): Promise<AdminUsersResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not signed in');
  }

  const response = await fetch(ADMIN_USERS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as AdminUsersResponse | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? `User management failed (${response.status})`);
  }
  return payload ?? {};
}

/**
 * All users, mirroring the full Supabase Auth user list locally. Falls back to
 * the local mirror when offline so the screen still shows known accounts.
 */
export async function listAllUsers(): Promise<User[]> {
  try {
    const { users: remote = [] } = await adminUsersCall({ action: 'list' });
    for (const remoteUser of remote) {
      const existing = await userRepository.findById(remoteUser.id);
      if (
        existing &&
        existing.email === remoteUser.email &&
        existing.name === remoteUser.name &&
        existing.role === remoteUser.role
      ) {
        continue;
      }
      await userRepository.upsert({
        id: remoteUser.id,
        email: remoteUser.email,
        name: remoteUser.name,
        role: remoteUser.role,
      });
    }
    return userRepository.listAll();
  } catch (error) {
    console.warn('Remote user list unavailable, using local users', error);
    return userRepository.listAll();
  }
}

/** Lists users straight from Supabase Auth without touching the local mirror. */
export async function listRemoteUsers(): Promise<RemoteUserPayload[]> {
  const { users = [] } = await adminUsersCall({ action: 'list' });
  return users;
}

/** Changes a user's role on the server, mirrors it locally, and audits. */
export async function updateRemoteUserRole(
  userId: string,
  role: UserRole,
  adminId: string,
): Promise<User> {
  const result = await adminUsersCall({ action: 'update', userId, role });
  const user = await userRepository.upsert({
    id: result.id ?? userId,
    email: result.email ?? '',
    name: result.name ?? '',
    role: result.role ?? role,
  });
  await logAudit({
    actorId: adminId,
    action: 'user-role-changed',
    entity: 'user',
    entityId: user.id,
    details: { role },
  });
  return user;
}

/** Resets a user's password on the server and audits. */
export async function resetRemoteUserPassword(
  userId: string,
  password: string,
  adminId: string,
): Promise<void> {
  await adminUsersCall({ action: 'update', userId, password });
  await logAudit({
    actorId: adminId,
    action: 'user-password-reset',
    entity: 'user',
    entityId: userId,
  });
}

/**
 * Provisions a new account on the server (admin-only RPC), then mirrors the
 * user locally so the device knows about them even before their first sign-in.
 */
export async function provisionUserOnServer(
  input: ProvisionUserInput,
  adminId: string,
): Promise<User> {
  const result = await provisionUser(input);
  const user = await userRepository.upsert({
    id: result.id,
    email: result.email,
    name: input.name,
    role: result.role,
  });
  await logAudit({
    actorId: adminId,
    action: 'user-provisioned',
    entity: 'user',
    entityId: user.id,
    details: { email: user.email, role: user.role },
  });
  return user;
}
