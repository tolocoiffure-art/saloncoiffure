import type { APIRoute } from 'astro';

import { getStripe } from '~/lib/stripe';
import { maisonCortesConfig } from '~/tenants/maison-cortes/config';
import { SELECTION_COOKIE_NAME, SELECTION_TTL_MS, refreshReservation, releaseReservation } from '~/tenants/maison-cortes/inventory';
import { maisonCortesProducts } from '~/tenants/maison-cortes/products';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const sku = String(formData.get('sku') || '');
  const reservationId = String(formData.get('reservationId') || '');
  const product = maisonCortesProducts.find((item) => item.id === sku);

  if (!product) {
    return new Response('Produit introuvable', { status: 404 });
  }

  if (!reservationId) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: new URL('/maison-cortes?selection=missing', new URL(request.url).origin).toString(),
      },
    });
  }

  const stripe = await getStripe();
  if (!stripe) {
    return new Response('Stripe non configuré', { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const successUrl = new URL('/maison-cortes/confirmation', origin);
  successUrl.searchParams.set('status', 'ok');
  successUrl.searchParams.set('sku', product.id);
  if (reservationId) successUrl.searchParams.set('res', reservationId);
  successUrl.searchParams.set('ref', '{CHECKOUT_SESSION_ID}');

  const cancelUrl = new URL('/maison-cortes/confirmation', origin);
  cancelUrl.searchParams.set('status', 'cancelled');
  cancelUrl.searchParams.set('sku', product.id);
  if (reservationId) cancelUrl.searchParams.set('res', reservationId);

  const productName = `${product.city} / ${product.object} ${product.index}`;

  if (reservationId) {
    const refreshed = await refreshReservation(product.id, reservationId, SELECTION_TTL_MS / 2);
    if (!refreshed) {
      await releaseReservation(product.id, reservationId);
      return new Response(null, {
        status: 303,
        headers: {
          Location: new URL('/maison-cortes?selection=invalid', origin).toString(),
          'Set-Cookie': `${SELECTION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`,
        },
      });
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'chf',
    billing_address_collection: 'auto',
    shipping_address_collection: { allowed_countries: [maisonCortesConfig.shipping.country] },
    shipping_options: [
      {
        shipping_rate_data: {
          display_name: maisonCortesConfig.shipping.label,
          type: 'fixed_amount',
          fixed_amount: { amount: maisonCortesConfig.shipping.flatFee * 100, currency: 'chf' },
        },
      },
    ],
    allow_promotion_codes: false,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'chf',
          unit_amount: product.priceChf * 100,
          product_data: {
            name: productName,
            description: product.specs.join(' '),
            metadata: { tenant: 'maison-cortes', sku: product.id },
          },
        },
      },
    ],
    metadata: { tenant: 'maison-cortes', sku: product.id, city: product.city, reservationId },
    success_url: successUrl.toString(),
    cancel_url: cancelUrl.toString(),
  });

  return new Response(null, {
    status: 303,
    headers: { Location: session.url ?? successUrl },
  });
};

export const GET: APIRoute = async () =>
  new Response('Méthode non autorisée', {
    status: 405,
    headers: { Allow: 'POST' },
  });
