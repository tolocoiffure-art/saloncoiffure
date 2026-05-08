import type { APIRoute } from 'astro';

import { sendSubscriptionUpdateEmail } from '~/lib/email';
import { getStripe } from '~/lib/stripe';
import { logAgencyActivity } from '~/utils/backend/activity';
import { getAgencyContext } from '~/utils/backend/context';
import { ApiError, badRequest, handleApiError, noContent, ok, serviceUnavailable } from '~/utils/backend/http';
import { recordSubscriptionEvent } from '~/utils/backend/services/subscriptions';
import { parseSubscriptionUpdatePayload } from '~/utils/backend/validation';
import { withAuth } from '~/utils/supabase/auth';

export const prerender = false;

const SUPABASE_ERROR = 'Supabase admin client is not configured';

export const PATCH: APIRoute = withAuth(async ({ locals, params, request }) => {
  const subscriptionId = String(params.id || '');
  if (!subscriptionId) {
    return badRequest('Missing subscription id');
  }

  let payload: ReturnType<typeof parseSubscriptionUpdatePayload>;
  try {
    payload = parseSubscriptionUpdatePayload(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    return badRequest(message);
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const stripe = await getStripe();
    if (!stripe) {
      return serviceUnavailable('Stripe not configured');
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (!subscription) {
      throw new ApiError(404, 'Subscription not found');
    }

    const params: {
      items?: Array<{ id: string; price: string }>;
      cancel_at_period_end?: boolean;
    } = {};
    let hasUpdates = false;
    if (payload.priceId) {
      const items = subscription.items?.data ?? [];
      const firstItem = items[0];
      if (!firstItem?.id) {
        return badRequest('Unable to update price for this subscription');
      }
      params.items = [{ id: firstItem.id, price: payload.priceId }];
      hasUpdates = true;
    }
    if (payload.cancelAtPeriodEnd !== undefined) {
      params.cancel_at_period_end = payload.cancelAtPeriodEnd;
      hasUpdates = true;
    }

    if (!hasUpdates) {
      return ok({ subscription });
    }

    const updated = await stripe.subscriptions.update(subscriptionId, params);

    await recordSubscriptionEvent(client, agency.id, subscriptionId, 'updated', {
      cancel_at_period_end: updated.cancel_at_period_end,
      price: payload.priceId ?? null,
      customer_email: updated.customer_email ?? null,
    });

    await logAgencyActivity(client, agency.id, 'subscription_updated', 'subscription', subscriptionId, {
      cancel_at_period_end: updated.cancel_at_period_end,
      price: payload.priceId ?? null,
    });

    const recipient = updated.customer_email || subscription.customer_email || null;
    if (recipient) {
      await sendSubscriptionUpdateEmail({
        to: recipient,
        subscriptionId,
        action: 'updated',
      });
    }

    return ok({ subscription: updated });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in PATCH /api/backend/subscriptions/[id]');
  }
});

export const DELETE: APIRoute = withAuth(async ({ locals, params }) => {
  const subscriptionId = String(params.id || '');
  if (!subscriptionId) {
    return badRequest('Missing subscription id');
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const stripe = await getStripe();
    if (!stripe) {
      return serviceUnavailable('Stripe not configured');
    }

    const deleted = await stripe.subscriptions.cancel(subscriptionId, { invoice_now: false, prorate: false });

    await recordSubscriptionEvent(client, agency.id, subscriptionId, 'canceled', {
      cancel_at_period_end: deleted.cancel_at_period_end,
      customer_email: deleted.customer_email ?? null,
    });

    await logAgencyActivity(client, agency.id, 'subscription_canceled', 'subscription', subscriptionId, {
      cancel_at_period_end: deleted.cancel_at_period_end,
    });

    const recipient = deleted.customer_email ?? null;
    if (recipient) {
      await sendSubscriptionUpdateEmail({
        to: recipient,
        subscriptionId,
        action: 'canceled',
      });
    }

    return noContent();
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in DELETE /api/backend/subscriptions/[id]');
  }
});

