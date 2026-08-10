import { createClient } from 'npm:@supabase/supabase-js@2';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

const jwks = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

interface SendPushRequest {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  try {
    // Any authenticated staff member may push to a coworker (washer assignment).
    const callerSub = await getCallerSub(req);
    if (!callerSub) {
      return json({ error: 'Authentication required' }, 401, CORS_HEADERS);
    }

    const body = (await req.json()) as SendPushRequest;
    if (!body.userId || !body.title || !body.body) {
      return json({ error: 'userId, title, and body are required' }, 400, CORS_HEADERS);
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: tokens, error: tokenError } = await adminClient
      .from('push_tokens')
      .select('token')
      .eq('user_id', body.userId);
    if (tokenError) {
      return json({ error: tokenError.message }, 400, CORS_HEADERS);
    }
    if (!tokens || tokens.length === 0) {
      return json({ sent: 0, note: 'No registered devices for user' }, 200, CORS_HEADERS);
    }

    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        tokens.map(({ token }) => ({
          to: token,
          sound: 'default',
          title: body.title,
          body: body.body,
          data: body.data ?? {},
        })),
      ),
    });
    if (!response.ok) {
      return json({ error: `Expo push service responded ${response.status}` }, 502, CORS_HEADERS);
    }
    const result = (await response.json()) as { data: { status: string; message?: string }[] };
    const failed = result.data.filter((entry) => entry.status === 'error');
    if (failed.length > 0) {
      console.warn('Expo push partial failures', JSON.stringify(failed));
    }
    return json({ sent: result.data.length, failed: failed.length }, 200, CORS_HEADERS);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      500,
      CORS_HEADERS,
    );
  }
});

function json(payload: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

async function getCallerSub(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(authHeader.slice('Bearer '.length), jwks, {
      issuer: `${SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
    });
    return (payload.sub as string | undefined) ?? null;
  } catch (error) {
    console.error('Caller JWT verification failed', error);
    return null;
  }
}
