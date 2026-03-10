import type { APIRoute } from 'astro';
import { ENV } from '~/lib/env';
import { getStripe } from '~/lib/stripe';
import { getSupabaseAdmin } from '~/lib/supabase';

export const prerender = false;

export const GET: APIRoute = async () => {
  const out: any = {
    ok: true,
    env: {
      SITE_URL: !!ENV.ORIGIN,
      SUPABASE_URL: !!ENV.SUPABASE_URL,
      SUPABASE_ANON_KEY: !!ENV.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!ENV.SUPABASE_SERVICE_ROLE_KEY,
      STRIPE_SECRET_KEY: !!ENV.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: !!ENV.STRIPE_WEBHOOK_SECRET,
      RESEND_API_KEY: !!ENV.RESEND_API_KEY,
      SENDER_EMAIL: !!ENV.SUPPORT_EMAIL,
    },
    checks: {} as Record<string, unknown>,
  };

  try {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { error } = await sb.from('leads').select('id').limit(1);
      out.checks.supabase = error ? { ok: false, error: error.message } : { ok: true };
    } else {
      out.checks.supabase = { ok: false, error: 'not configured' };
    }
  } catch (e: any) {
    out.checks.supabase = { ok: false, error: e.message };
  }

  try {
    const stripe = await getStripe();
    if (stripe) {
      // simple call to verify key works (no data leaked)
      const balance = await stripe.balance.retrieve().catch(() => null);
      out.checks.stripe = { ok: !!balance };
    } else {
      out.checks.stripe = { ok: false, error: 'not configured' };
    }
  } catch (e: any) {
    out.checks.stripe = { ok: false, error: e.message };
  }

  return new Response(JSON.stringify(out), { status: 200, headers: { 'content-type': 'application/json' } });
};

