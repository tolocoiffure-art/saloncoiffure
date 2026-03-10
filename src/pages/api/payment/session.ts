import type { APIRoute } from 'astro';
import { getStripe } from '~/lib/stripe';
import {
  buildOrderDraftFromSession,
  fetchOrderBySessionId,
  generateOrderNumber,
  sanitizeOrderDbPayload,
} from '~/lib/orders';
import { getSupabaseAdmin } from '~/lib/supabase';
import { sendAdminNotificationEmail, sendClientConfirmationEmail } from '~/lib/email';
import { getTenantFromContext } from '~/utils/tenant';

export const prerender = false;

export const GET: APIRoute = async ({ request, url, locals }) => {
  const sessionId = url.searchParams.get('session_id') || '';
  if (!sessionId) return new Response('Missing session_id', { status: 400 });

  const stripe = await getStripe();
  if (!stripe) return new Response('Stripe not configured', { status: 501 });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const tenantId = (session.metadata?.tenant_id as string) || getTenantFromContext({ request, locals }).slug;
    const admin = getSupabaseAdmin();
    let order = await fetchOrderBySessionId(sessionId);
    let orderNumber = order?.order_number || session.metadata?.order_number || null;

    if (!order && admin) {
      const draft = buildOrderDraftFromSession(session, tenantId);
      orderNumber = orderNumber || (await generateOrderNumber());
      const payload = {
        ...draft,
        order_number: orderNumber,
      };
      const { data, error } = await admin
        .from('orders')
        .upsert(sanitizeOrderDbPayload(payload), { onConflict: 'stripe_session_id' })
        .select('*')
        .maybeSingle();
      if (!error && data) order = data;
      else if (error && !orderNumber) orderNumber = await generateOrderNumber();
    } else if (order && !order.order_number && admin) {
      orderNumber = await generateOrderNumber();
      const { data } = await admin
        .from('orders')
        .update({ order_number: orderNumber, tenant_id: tenantId })
        .eq('id', order.id)
        .select('*')
        .maybeSingle();
      if (data) order = data;
    } else {
      orderNumber = orderNumber || (await generateOrderNumber());
    }

    const responsePayload = {
      id: session.id,
      customer_email: session.customer_details?.email || null,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
      metadata: session.metadata || {},
      order_number: order?.order_number ?? orderNumber ?? null,
      amount_total_order: order?.amount_total ?? session.amount_total ?? null,
      plan: order?.plan ?? session.metadata?.plan ?? null,
      template: order?.template_key ?? session.metadata?.template ?? null,
      locale: order?.metadata?.locale ?? session.metadata?.locale ?? null,
      tenant_id: tenantId,
    };

    try {
      const emailOrder = {
        ...(order || {}),
        customer_email: responsePayload.customer_email,
        plan: responsePayload.plan,
        template_key: responsePayload.template,
        order_number: responsePayload.order_number,
        amount_total: responsePayload.amount_total_order,
        currency: responsePayload.currency,
        status: responsePayload.payment_status,
        metadata: order?.metadata ?? session.metadata ?? {},
      };
      await Promise.allSettled([
        sendAdminNotificationEmail(emailOrder),
        sendClientConfirmationEmail(emailOrder),
      ]);
    } catch (_) {
      // ignore email errors in this endpoint
    }

    return new Response(JSON.stringify(responsePayload), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Not found' }), { status: 404 });
  }
};
