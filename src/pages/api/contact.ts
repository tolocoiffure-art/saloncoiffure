import type { APIRoute } from 'astro';
import { ENV } from '~/lib/env';
import { getSupabaseAdmin } from '~/lib/supabase';
import { sendContactConfirmationEmail, sendContactNotificationEmail } from '~/lib/email';
import { detectRequestLocale } from '~/lib/locale';
import { assertRateLimit } from '~/lib/rate-limit';
import { getTenantFromContext } from '~/utils/tenant';

export const prerender = false;

export const POST: APIRoute = async ({ request, url, locals }) => {
  try {
    assertRateLimit(request, { key: 'contact', limit: 5, window: 60 });
    const tenant = getTenantFromContext({ request, locals });
    const ctype = request.headers.get('content-type') || '';
    let name = '', email = '', company = '', message = '', source = 'contact';
    if (ctype.includes('application/json')) {
      const data = await request.json().catch(() => ({}));
      name = String(data.name || '').trim();
      email = String(data.email || '').trim();
      company = String(data.company || '').trim();
      message = String(data.message || '').trim();
      source = String(data.source || 'contact').trim();
    } else {
      const form = await request.formData();
      name = String(form.get('name') || '').trim();
      email = String(form.get('email') || '').trim();
      company = String(form.get('company') || '').trim();
      message = String(form.get('message') || form.get('textarea') || '').trim();
      source = String(form.get('source') || 'contact').trim();
    }

    const sb = getSupabaseAdmin();
    if (sb) {
      await sb.from('leads').insert({ name, email, company, message, source, tenant_id: tenant.slug });
    }

    const locale = detectRequestLocale(request, url);

    if (ENV.RESEND_API_KEY && email) {
      await sendContactNotificationEmail({
        name,
        email,
        company,
        message,
        source,
        locale,
        tenant,
      });
      await sendContactConfirmationEmail({
        to: email,
        name,
        message,
        locale,
        tenant,
      });
    }

    // Optional Zapier hook
    if (ENV.ZAPIER_WEBHOOK_URL) {
      try {
        await fetch(ENV.ZAPIER_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, company, message, source, tenant_id: tenant.slug }),
        });
      } catch {}
    }

    // Redirect HTML form submissions to a thank-you page
    if (!ctype.includes('application/json')) {
      const to = `${ENV.ORIGIN || url.origin}/thank-you`;
      return new Response(null, { status: 303, headers: { Location: to } });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    if (e instanceof Response) return e;
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 500 });
  }
};
