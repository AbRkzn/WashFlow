import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/api/supabase';
import { db } from '@/data/db';
import { UserRepository } from '@/data/repositories';
import { type AppUser, type UserRole, USER_ROLES } from '@/domain/user';
import { logAudit } from '@/services/audit';

const FALLBACK_ROLE: UserRole = 'washer';
const userRepository = new UserRepository(db);

async function upsertLocalUser(user: AppUser): Promise<void> {
  try {
    await userRepository.upsert({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.warn('Local user upsert failed (non-fatal)', error);
  }
}

export function isUserRole(value: string | undefined): value is UserRole {
  return value !== undefined && (USER_ROLES as readonly string[]).includes(value);
}

export function mapSupabaseUser(user: User): AppUser {
  const role: UserRole = isUserRole(user.app_metadata?.role as string | undefined)
    ? (user.app_metadata.role as UserRole)
    : FALLBACK_ROLE;
  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'User';
  return { id: user.id, name, email: user.email ?? '', role };
}

export function sessionToUser(session: Session | null): AppUser | null {
  if (!session?.user) {
    return null;
  }
  return mapSupabaseUser(session.user);
}

export async function signInWithPassword(email: string, password: string): Promise<AppUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
  const user = sessionToUser(data.session);
  if (!user) {
    throw new Error('Sign-in succeeded but no session was returned');
  }
  await logAudit({
    actorId: user.id,
    action: 'sign-in',
    entity: 'session',
    details: { email: user.email },
  });
  await upsertLocalUser(user);
  return user;
}

export async function signOut(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const user = sessionToUser(data.session);
  if (user) {
    await logAudit({ actorId: user.id, action: 'sign-out', entity: 'session' });
  }
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getStoredUser(): Promise<AppUser | null> {
  const { data } = await supabase.auth.getSession();
  const user = sessionToUser(data.session);
  if (user) {
    await upsertLocalUser(user);
  }
  return user;
}
