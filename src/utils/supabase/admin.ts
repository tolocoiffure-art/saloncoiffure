// src/utils/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.PUBLIC_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  import.meta.env.PUBLIC_SUPABASE_URL ||
  '';

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
  '';

let cachedClient: SupabaseClient | null = null;

type ClientContext = {
  accessToken?: string;
  supabase?: SupabaseClient | null;
};

export function getAdminClient(locals?: ClientContext): SupabaseClient {
  if (!supabaseUrl) {
    throw new Error('Supabase admin client is not configured');
  }

  if (supabaseServiceRoleKey) {
    if (cachedClient) return cachedClient;

    cachedClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    return cachedClient;
  }

  if (locals?.supabase) {
    return locals.supabase;
  }

  const token = locals?.accessToken;
  if (!supabaseAnonKey || !token) {
    throw new Error('Supabase admin client is not configured');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export const adminClient = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getAdminClient() as any;
      return client[prop as keyof typeof client];
    },
  },
) as SupabaseClient;
