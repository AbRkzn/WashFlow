import { createClient } from 'npm:@supabase/supabase-js@2';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5';

const VALID_ROLES = ['admin', 'manager', 'cashier', 'washer'] as const;
type Role = (typeof VALID_ROLES)[number];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const jwks = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

interface AdminUsersRequest {
  action: 'list' | 'update';
  userId?: string;
  role?: Role;
  password?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  try {
    // Verify the caller's JWT against the project JWKS and enforce admin role.
    const callerRole = await getCallerRole(req);
    if (callerRole !== 'admin') {
      return json({ error: 'Admin role required' }, 403, CORS_HEADERS);
    }

    const body = (await req.json()) as AdminUsersRequest;
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    if (body.action === 'list') {
      const { data, error } = await adminClient.auth.admin.listUsers();
      if (error) {
        return json({ error: error.message }, 400, CORS_HEADERS);
      }
      const users = (data.users ?? []).map((user) => ({
        id: user.id,
        email: user.email,
        name: (user.user_metadata?.full_name as string | undefined) ??
          user.email?.split('@')[0] ??
          'User',
        role: (user.app_metadata?.role as Role | undefined) ?? 'washer',
      }));
      return json({ users }, 200, CORS_HEADERS);
    }

    if (body.action === 'update') {
      if (!body.userId) {
        return json({ error: 'userId required' }, 400, CORS_HEADERS);
      }
      const patch: Record<string, unknown> = {};
      if (body.role !== undefined) {
        if (!VALID_ROLES.includes(body.role)) {
          return json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, 400, CORS_HEADERS);
        }
        patch.app_metadata = { role: body.role };
      }
      if (body.password !== undefined) {
        if (typeof body.password !== 'string' || body.password.length < 6) {
          return json({ error: 'password must be 6+ characters' }, 400, CORS_HEADERS);
        }
        patch.password = body.password;
      }
      if (Object.keys(patch).length === 0) {
        return json({ error: 'nothing to update' }, 400, CORS_HEADERS);
      }

      const { data, error } = await adminClient.auth.admin.updateUserById(body.userId, patch);
      if (error) {
        return json({ error: error.message }, 400, CORS_HEADERS);
      }
      return json(
        {
          id: data.user.id,
          email: data.user.email,
          name:
            (data.user.user_metadata?.full_name as string | undefined) ??
            data.user.email?.split('@')[0] ??
            'User',
          role: (data.user.app_metadata?.role as Role | undefined) ?? 'washer',
        },
        200,
        CORS_HEADERS,
      );
    }

    return json({ error: 'unknown action' }, 400, CORS_HEADERS);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500, CORS_HEADERS);
  }
});

function json(payload: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

interface JwtPayload {
  sub?: string;
  email?: string;
  role?: string;
  app_metadata?: Record<string, unknown>;
}

async function getCallerRole(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(authHeader.slice('Bearer '.length), jwks, {
      issuer: `${SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
    });
    const claims = payload as JwtPayload;
    return claims.app_metadata?.role ?? null;
  } catch (error) {
    console.error('Caller JWT verification failed', error);
    return null;
  }
}
