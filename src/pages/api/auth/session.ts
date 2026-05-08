import type { APIRoute } from 'astro';
import { getSupabaseAnon } from '~/lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = getSupabaseAnon();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 503 });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }

  return new Response(JSON.stringify({ user: data.user }), { status: 200 });
};

export const DELETE: APIRoute = async () => {
  // Tokens are stored client-side; respond 204 so the client can clear them and redirect.
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
};
