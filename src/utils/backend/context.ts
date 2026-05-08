// src/utils/backend/context.ts
import type { APIContext } from 'astro';
import type { SupabaseClient, User } from '@supabase/supabase-js';

import { getAdminClient } from '../supabase/admin';

async function ensureAgency(client: SupabaseClient, user: User) {
  const { data, error } = await client
    .from('agencies')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Failed to load agency', error);
    throw error;
  }

  if (data) return data;

  const name = String(user.user_metadata?.full_name || user.email || 'Pedro Déménagement');
  const { data: inserted, error: insertError } = await client
    .from('agencies')
    .insert({ owner_id: user.id, name })
    .select('*')
    .single();

  if (insertError) {
    console.error('Failed to create agency', insertError);
    throw insertError;
  }

  return inserted;
}

async function syncAgencyMember(client: SupabaseClient, agencyId: string, user: User) {
  const payload = {
    agency_id: agencyId,
    user_id: user.id,
    full_name: user.user_metadata?.full_name ?? null,
    email: user.email ?? null,
    role: 'owner',
  };

  const { error } = await client
    .from('agency_members')
    .upsert(payload, { onConflict: 'agency_id,user_id' });

  if (error) {
    console.error('Failed to sync agency member', error);
    throw error;
  }
}

type Locals = APIContext['locals'] & { supabase?: SupabaseClient | null };

export async function getAgencyContext(locals: Locals) {
  const user = locals.user;
  if (!user?.id) throw new Error('Missing user');

  const admin = getAdminClient(locals);
  const tenantClient = locals.supabase ?? admin;

  const agency = await ensureAgency(admin, user);
  await syncAgencyMember(admin, agency.id, user);

  return { agency, user, client: tenantClient, admin };
}
