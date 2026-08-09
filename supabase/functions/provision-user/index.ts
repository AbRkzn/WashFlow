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

interface ProvisionRequest {
  email: string;
  password: string;
  name: string;
  role: Role;
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

    const body = (await req.json()) as ProvisionRequest;
    const email = body.email?.trim().toLowerCase();
    const role = body.role;
    const name = body.name?.trim() ?? email?.split('@')[0] ?? 'User';

    if (!email || !body.password || body.password.length < 6) {
      return json({ error: 'email, password (6+ chars) required' }, 400, CORS_HEADERS);
    }
    if (!VALID_ROLES.includes(role)) {
      return json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, 400, CORS_HEADERS);
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: name },
      app_metadata: { role },
    });

    if (error) {
      return json({ error: error.message }, 400, CORS_HEADERS);
    }
    return json({ id: data.user.id, email: data.user.email, role }, 200, CORS_HEADERS);
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
