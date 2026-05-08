import { createClient } from '@supabase/supabase-js';
import { ENV } from './env';

export function getSupabaseAdmin() {
  const url = ENV.SUPABASE_URL;
  const key = ENV.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function getSupabaseAnon() {
  const url = ENV.SUPABASE_URL;
  const key = ENV.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

