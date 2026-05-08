import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '~/lib/supabase';
import { ENV } from '~/lib/env';
import { logger } from '~/lib/logger.js';
import { sendFeedbackNotificationEmail } from '~/lib/email';
import { detectRequestLocale } from '~/lib/locale';
import { assertRateLimit } from '~/lib/rate-limit';
import { getTenantFromContext } from '~/utils/tenant';

export const prerender = false;

const TABLE_NAME = 'project_feedback';

export const POST: APIRoute = async ({ request, url, locals }) => {
  assertRateLimit(request, { key: 'feedback', limit: 10, window: 60 });
  const tenant = getTenantFromContext({ request, locals });
  const payload = await request.json().catch(() => null);
  const message = typeof payload?.message === 'string' ? payload.message.trim() : '';
  const projectId = typeof payload?.projectId === 'string' ? payload.projectId.trim() : '';
  let orderId: string | number | null = null;
  if (typeof payload?.orderId === 'number') {
    orderId = payload.orderId;
  } else if (typeof payload?.orderId === 'string' && payload.orderId.trim()) {
    orderId = payload.orderId.trim();
  }
  const authorName = typeof payload?.authorName === 'string' ? payload.authorName.trim() : '';
  const authorEmail = typeof payload?.authorEmail === 'string' ? payload.authorEmail.trim() : '';

  if (message.length < 3) {
    return new Response(JSON.stringify({ error: 'Message too short' }), { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 503 });
  }

  try {
    const insertPayload = {
      message,
      project_id: projectId || null,
      order_id: orderId,
      author_name: authorName || null,
      author_email: authorEmail || null,
      tenant_id: tenant.slug,
    };

    const { data, error } = await supabase.from(TABLE_NAME).insert(insertPayload).select('*').single();
    if (error) {
      logger.error(error, { where: 'feedback.insert', table: TABLE_NAME });
      return new Response(JSON.stringify({ error: 'Unable to store feedback' }), { status: 500 });
    }

    const locale = detectRequestLocale(request, url);

    await sendFeedbackNotificationEmail({
      to: ENV.SUPPORT_EMAIL,
      message,
      project: projectId || `order-${orderId ?? data?.order_id ?? 'n/a'}`,
      author: authorName || authorEmail || undefined,
      locale,
      tenant,
    });

    return new Response(JSON.stringify({ success: true, feedback: data }), { status: 201 });
  } catch (error: any) {
    logger.error(error, { where: 'feedback' });
    return new Response(JSON.stringify({ error: 'Unable to submit feedback' }), { status: 500 });
  }
};
