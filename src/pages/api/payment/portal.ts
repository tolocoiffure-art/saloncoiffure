import type { APIRoute } from 'astro';
import { ENV } from '~/lib/env';
import { getStripe } from '~/lib/stripe';
import { getTenantFromContext } from '~/utils/tenant';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const tenant = getTenantFromContext({ request, locals });
  const data = await request.json().catch(() => ({}));
  const customerId = String(data.customerId || '');
  const origin = ENV.ORIGIN || request.headers.get('origin') || 'http://localhost:4321';
  const basePath = tenant.basePath || '';

  const stripe = await getStripe();
  if (!stripe) return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 501 });
  if (!customerId) return new Response(JSON.stringify({ error: 'Missing customerId' }), { status: 400 });

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}${basePath}/account`,
  });
  return new Response(JSON.stringify({ url: session.url }), { status: 200 });
};
