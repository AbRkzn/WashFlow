import { supabase } from '@/api/supabase';
import type { UserRole } from '@/domain/user';

const FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/provision-user`;

export interface ProvisionUserInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface ProvisionUserResult {
  id: string;
  email: string;
  role: UserRole;
}

export async function provisionUser(input: ProvisionUserInput): Promise<ProvisionUserResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not signed in');
  }

  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json().catch(() => null)) as
    | Partial<ProvisionUserResult> & { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? `Provisioning failed (${response.status})`);
  }

  return payload as ProvisionUserResult;
}
