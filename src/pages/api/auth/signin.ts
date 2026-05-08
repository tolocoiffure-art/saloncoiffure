import type { APIRoute } from 'astro';
import { getSupabaseAnon } from '~/lib/supabase';
import { logger } from '~/lib/logger.js';
import { assertRateLimit } from '~/lib/rate-limit';

export const prerender = false;

function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email);
}

export const POST: APIRoute = async ({ request }) => {
  assertRateLimit(request, { key: 'auth:signin', limit: 10, window: 60 });
  const payload = await request.json().catch(() => null);
  const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const password = typeof payload?.password === 'string' ? payload.password : '';

  if (!isValidEmail(email) || password.length < 1) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 400 });
  }

  const supabase = getSupabaseAnon();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 503 });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    // Handle unconfirmed emails explicitly so the user sees the right call-to-action
    const isUnconfirmed =
      (error?.code && String(error.code).includes('confirm')) ||
      (error?.message && error.message.toLowerCase().includes('confirm')) ||
      (!!data?.user && !data.user.email_confirmed_at);

    if (isUnconfirmed) {
      return new Response(JSON.stringify({ error: 'Please confirm your email before signing in.' }), { status: 403 });
    }

    if (error || !data?.session) {
      return new Response(JSON.stringify({ error: 'Incorrect email or password' }), { status: 401 });
    }

    return new Response(
      JSON.stringify({
        user: data.user,
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
        },
      }),
      { status: 200 },
    );
  } catch (error: any) {
    logger.error(error, { where: 'auth.signin' });
    return new Response(JSON.stringify({ error: 'Unable to sign in' }), { status: 500 });
  }
};
