import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '~/lib/supabase';
import { assertRateLimit } from '~/lib/rate-limit';
import { detectRequestLocale } from '~/lib/locale';
import { sendDemoConfirmationEmail, sendDemoRequestEmail } from '~/lib/email';
import { getTenantFromContext } from '~/utils/tenant';

export const prerender = false;

export const POST: APIRoute = async ({ request, url, locals }) => {
  assertRateLimit(request, { key: 'demo', limit: 5, window: 60 });
  const tenant = getTenantFromContext({ request, locals });
  const data = await request.json().catch(() => ({}));
  const name = String(data.name || '').trim();
  const email = String(data.email || '').trim();
  const company = String(data.company || '').trim();
  const details = String(data.details || '').trim();
  const timeslot = String(data.timeslot || '').trim();
  const locale = detectRequestLocale(request, url);

  const sb = getSupabaseAdmin();
  if (sb) {
    await sb.from('leads').insert({ name, email, company, message: details, source: 'demo', locale, tenant_id: tenant.slug });
  }

  if (email) {
    await sendDemoRequestEmail({
      name,
      email,
      company,
      message: details,
      timeslot,
      locale,
      tenant,
    });
    await sendDemoConfirmationEmail({
      to: email,
      name,
      timeslot,
      locale,
      tenant,
    });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
