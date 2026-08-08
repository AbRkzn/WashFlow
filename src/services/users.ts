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

/** All locally-known users (signed-in sessions + provisioned accounts). */
export async function listAllUsers(): Promise<User[]> {
  return userRepository.listAll();
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
