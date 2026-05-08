import type { APIRoute } from 'astro';

import { ENV } from '~/lib/env';
import { getStripe } from '~/lib/stripe';
import { completeReservation, releaseReservation } from '~/tenants/maison-cortes/inventory';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const stripe = await getStripe();
  const webhookSecret = ENV.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return new Response('Stripe not configured', { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  let event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return new Response('Invalid signature', { status: 400 });
  }

  const session = event.data?.object as any;
  const tenant = session?.metadata?.tenant;
  const sku = session?.metadata?.sku;
  const reservationId = session?.metadata?.reservationId;

  if (tenant !== 'maison-cortes' || !sku) {
    return new Response('ignored', { status: 200 });
  }

  if (event.type === 'checkout.session.completed') {
    if (reservationId) {
      await completeReservation(sku, reservationId);
    }
    return new Response('ok', { status: 200 });
  }

  if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
    if (reservationId) {
      await releaseReservation(sku, reservationId);
    }
    return new Response('released', { status: 200 });
  }

  return new Response('noop', { status: 200 });
};

export const GET: APIRoute = async () =>
  new Response('Method not allowed', {
    status: 405,
    headers: { Allow: 'POST' },
  });
