import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '~/lib/supabase';
import { logger } from '~/lib/logger.js';
import { sendWelcomeEmail, sendAdminUserSignupEmail } from '~/lib/email';
import { assertRateLimit } from '~/lib/rate-limit';
import { resolveAppOrigin } from '~/utils/auth/origin';
import { getTenantFromContext } from '~/utils/tenant';

export const prerender = false;

function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email);
}

function checkPasswordPolicy(password: string) {
  const rules: Array<{ test: RegExp; message: string }> = [
    { test: /.{12,}/, message: 'Password must be at least 12 characters long' },
    { test: /[a-z]/, message: 'Password must include a lowercase letter' },
    { test: /[A-Z]/, message: 'Password must include an uppercase letter' },
    { test: /\d/, message: 'Password must include a number' },
    { test: /[^A-Za-z0-9]/, message: 'Password must include a symbol' },
  ];

  const failedRule = rules.find((rule) => !rule.test.test(password));
  return failedRule?.message ?? '';
}

export const POST: APIRoute = async ({ request, locals }) => {
  assertRateLimit(request, { key: 'auth:signup', limit: 5, window: 300 });
  const tenant = getTenantFromContext({ request, locals });
  const payload = await request.json().catch(() => null);
  const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const password = typeof payload?.password === 'string' ? payload.password : '';
  const fullName = typeof payload?.name === 'string' ? payload.name.trim() : '';
  const phone = typeof payload?.phone === 'string' ? payload.phone.trim() : '';
  const plan = typeof payload?.plan === 'string' ? payload.plan.trim() : '';
  const template = typeof payload?.template === 'string' ? payload.template.trim() : '';
  const nextPath = typeof payload?.next === 'string' ? payload.next.trim() : '';

  const baseOrigin = resolveAppOrigin(request);
  let redirectTo = `${baseOrigin}/auth/callback`;
  if (nextPath && /^\/[a-zA-Z0-9\-_/]*$/.test(nextPath) && !nextPath.includes('..')) {
    try {
      const url = new URL('/auth/callback', baseOrigin);
      if (nextPath !== '/auth/callback') {
        url.searchParams.set('next', nextPath);
      }
      redirectTo = url.toString();
    } catch (error) {
      logger.warn('Unable to compute redirect for signup confirmation', { error });
    }
  }

  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400 });
  }

  const passwordError = checkPasswordPolicy(password);
  if (passwordError) {
    return new Response(JSON.stringify({ error: passwordError }), { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 503 });
  }

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      phone,
      user_metadata: { full_name: fullName, phone, tenant_id: tenant.slug },
    });

    if (error) {
      const status = error.status === 409 ? 409 : 400;
      return new Response(JSON.stringify({ error: error.message }), { status });
    }

    let verifyUrl = '';
    try {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'signup',
        email,
        password,
        options: { redirectTo },
      });
      if (!linkError) {
        verifyUrl = linkData?.properties?.action_link ?? '';
      }
    } catch (linkError: any) {
      logger.error(linkError, { where: 'auth.signup.generateLink' });
    }

    if (verifyUrl) await sendWelcomeEmail(email, fullName || null, verifyUrl);
    else await sendWelcomeEmail(email, fullName || null);

    // Notify support of the new signup (includes optional plan/template if provided)
    try {
      await sendAdminUserSignupEmail({
        email,
        name: fullName || null,
        phone: phone || null,
        plan: plan || null,
        template: template || null,
        tenant,
      });
    } catch (e) {
      logger.warn('Failed to send admin signup notification');
    }

    return new Response(
      JSON.stringify({ id: data?.user?.id, email: data?.user?.email, status: 'pending_confirmation' }),
      { status: 201 },
    );
  } catch (error: any) {
    logger.error(error, { where: 'auth.signup' });
    return new Response(JSON.stringify({ error: 'Unable to create account' }), { status: 500 });
  }
};
