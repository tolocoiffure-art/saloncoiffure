// src/utils/supabase/auth.ts
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAnon } from '~/lib/supabase';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.PUBLIC_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  import.meta.env.PUBLIC_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
  '';

const fallbackClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

function createRequestClient(token: string) {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

/**
 * Middleware wrapper to ensure user is authenticated.
 */
export function withAuth(handler: APIRoute): APIRoute {
  return async (context) => {
    const authHeader = context.request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supabase = getSupabaseAnon() ?? fallbackClient;
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 503 });
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
    }

    context.locals.user = data.user;
    context.locals.accessToken = token;
    const requestClient = createRequestClient(token);
    if (requestClient) {
      context.locals.supabase = requestClient;
    }
    return handler(context);
  };
}

export const supabase = fallbackClient;
