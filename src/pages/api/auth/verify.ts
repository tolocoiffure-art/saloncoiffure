import type { APIRoute } from 'astro';
import type { SupabaseClient, User } from '@supabase/supabase-js';

import { getSupabaseAnon, getSupabaseAdmin } from '~/lib/supabase';
import { logger } from '~/lib/logger.js';
import { createClient as createClientRecord } from '~/utils/backend/services/clients';
import { parseClientPayload } from '~/utils/backend/validation';
import { ApiError } from '~/utils/backend/http';

export const prerender = false;

function normalizeNext(value: unknown) {
  if (typeof value !== 'string') return null;
  if (!/^\/[a-zA-Z0-9\-_/]*$/.test(value)) return null;
  if (value.includes('..')) return null;
  return value || null;
}

async function ensureAgency(client: SupabaseClient, user: User) {
  const { data, error } = await client
    .from('agencies')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const name = String(user.user_metadata?.full_name || user.email || 'TonSiteWeb Agency');
  const { data: inserted, error: insertError } = await client
    .from('agencies')
    .insert({ owner_id: user.id, name })
    .select('*')
    .single();

  if (insertError) throw insertError;
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

  const { error } = await client.from('agency_members').upsert(payload, { onConflict: 'agency_id,user_id' });
  if (error) throw error;
}

async function createClientFromPayload(admin: SupabaseClient, user: User, raw: unknown) {
  if (!raw || typeof raw !== 'object') return null;

  const rawBody = raw as Record<string, unknown>;
  const hasCompany = typeof rawBody.company_name === 'string' && rawBody.company_name.trim().length > 0;
  if (!hasCompany) return null;

  const normalized = { ...rawBody };
  if (typeof rawBody.services === 'string') {
    normalized.services = (rawBody.services as string)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const agency = await ensureAgency(admin, user);
  await syncAgencyMember(admin, agency.id, user);
  const payload = parseClientPayload(normalized);
  return createClientRecord(admin, agency.id, payload);
}

export const POST: APIRoute = async ({ request }) => {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== 'object') {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
  }

  const accessToken = typeof payload.accessToken === 'string' ? payload.accessToken.trim() : '';
  const refreshToken = typeof payload.refreshToken === 'string' ? payload.refreshToken.trim() : '';
  const otpToken = typeof payload.token === 'string' ? payload.token.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const expiresAt = Number(payload.expiresAt) || null;
  const requestedType = typeof payload.type === 'string' ? payload.type.trim() : 'signup';
  const allowedTypes = ['signup', 'invite', 'magiclink', 'recovery', 'email_change'] as const;
  type VerifyType = (typeof allowedTypes)[number];
  const type: VerifyType = allowedTypes.includes(requestedType as VerifyType)
    ? ((requestedType as VerifyType) ?? 'signup')
    : 'signup';
  const next = normalizeNext((payload as Record<string, unknown>).next);

  const supabase = getSupabaseAnon();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 503 });
  }

  try {
    let user: User | null = null;
    let session: {
      accessToken: string;
      refreshToken: string | null;
      expiresAt: number | null;
    } | null = null;
    let clientRecord: Record<string, unknown> | null = null;

    if (accessToken) {
      const { data, error } = await supabase.auth.getUser(accessToken);
      if (error || !data?.user) {
        return new Response(JSON.stringify({ error: 'Verification token expired. Please request a new email.' }), {
          status: 401,
        });
      }
      user = data.user;
      session = {
        accessToken,
        refreshToken: refreshToken || null,
        expiresAt,
      };
    } else if (otpToken && email) {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otpToken, type });
      if (error || !data?.user) {
        logger.warn('OTP verification failed', { error, email, type });
        return new Response(JSON.stringify({ error: 'Invalid or expired confirmation code.' }), { status: 401 });
      }
      user = data.user;
      if (data.session?.access_token) {
        session = {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token ?? null,
          expiresAt: data.session.expires_at ?? null,
        };
      }
    } else {
      return new Response(JSON.stringify({ error: 'Missing verification token' }), { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (admin && user && user.id && !user.email_confirmed_at) {
      const currentUser = user;
      try {
        const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(currentUser.id, {
          email_confirm: true,
        });
        if (!updateError && updated?.user) {
          user = updated.user;
        }
      } catch (error) {
        logger.warn('Unable to force email confirmation', { error, userId: currentUser.id });
      }
    }

    if (admin && user && payload.client) {
      try {
        clientRecord = await createClientFromPayload(admin, user, payload.client);
      } catch (error: any) {
        const status = error instanceof ApiError ? error.status : 500;
        const message = error instanceof Error ? error.message : 'Unable to save client';
        return new Response(JSON.stringify({ error: message }), { status });
      }
    }

    return new Response(
      JSON.stringify({
        user,
        session,
        next: next ?? '/app',
        client: clientRecord,
      }),
      { status: 200 },
    );
  } catch (error) {
    logger.error(error, { where: 'auth.verify' });
    return new Response(JSON.stringify({ error: 'Unable to verify account' }), { status: 500 });
  }
};
