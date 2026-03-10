import type { APIRoute } from 'astro';
import { withAuth } from '~/utils/supabase/auth';
import { getStripe } from '~/lib/stripe';
import { updateOrderStatusBySubscriptionId } from '~/lib/orders';
import { logger } from '~/lib/logger.js';
import { getTenantFromContext } from '~/utils/tenant';

export const prerender = false;

export const DELETE: APIRoute = withAuth(async ({ params, locals, request }) => {
  const subscriptionId = params.id;
  if (!subscriptionId) {
    return new Response(JSON.stringify({ error: 'Missing subscription id' }), { status: 400 });
  }
  const tenant = getTenantFromContext({ request, locals });

  const stripe = await getStripe();
  if (!stripe) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 503 });
  }

  try {
    const canceled = await stripe.subscriptions.cancel(subscriptionId);
    await updateOrderStatusBySubscriptionId(
      subscriptionId,
      'cancelled',
      {
        stripe_status: canceled.status,
        cancel_at_period_end: canceled.cancel_at_period_end,
      },
      tenant.slug,
    );

    return new Response(JSON.stringify({ success: true, subscription: canceled }), { status: 200 });
  } catch (error: any) {
    logger.error(error, { where: 'subscriptions.cancel', subscriptionId });
    return new Response(JSON.stringify({ error: error?.message || 'Unable to cancel subscription' }), { status: 500 });
  }
});

export const PATCH: APIRoute = withAuth(async ({ params, request, locals }) => {
  const subscriptionId = params.id;
  if (!subscriptionId) {
    return new Response(JSON.stringify({ error: 'Missing subscription id' }), { status: 400 });
  }
  const tenant = getTenantFromContext({ request, locals });

  const stripe = await getStripe();
  if (!stripe) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 503 });
  }

  const payload = await request.json().catch(() => null);
  const priceId = typeof payload?.priceId === 'string' ? payload.priceId.trim() : '';
  const cancelAtPeriodEnd =
    typeof payload?.cancelAtPeriodEnd === 'boolean' ? payload.cancelAtPeriodEnd : undefined;

  try {
    let subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (priceId) {
      const item = subscription.items.data[0];
      if (!item) {
        return new Response(JSON.stringify({ error: 'Subscription has no price item' }), { status: 400 });
      }
      subscription = await stripe.subscriptions.update(subscriptionId, {
        items: [{ id: item.id, price: priceId }],
        proration_behavior: 'create_prorations',
      });
    }

    if (typeof cancelAtPeriodEnd === 'boolean') {
      subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      });
    }

    await updateOrderStatusBySubscriptionId(
      subscriptionId,
      'active',
      {
        stripe_status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        price_id: subscription.items.data[0]?.price?.id ?? null,
      },
      tenant.slug,
    );

    return new Response(JSON.stringify({ success: true, subscription }), { status: 200 });
  } catch (error: any) {
    logger.error(error, { where: 'subscriptions.update', subscriptionId });
    return new Response(JSON.stringify({ error: error?.message || 'Unable to update subscription' }), { status: 500 });
  }
});
