import type { APIRoute } from 'astro';

import {
  SELECTION_COOKIE_NAME,
  SELECTION_TTL_MS,
  formatSelectionCookie,
  parseSelectionCookie,
  releaseReservation,
  reserveSelection,
} from '~/tenants/maison-cortes/inventory';
import type { MaisonCortesSelectionEntry } from '~/tenants/maison-cortes/inventory';
import { maisonCortesProducts } from '~/tenants/maison-cortes/products';

export const prerender = false;

const serializeSelectionCookie = (value: string, maxAgeSeconds: number) =>
  `${SELECTION_COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;

const parseCookieHeader = (header: string | null): Record<string, string> => {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((part) => {
      const [key, ...rest] = part.trim().split('=');
      return [key, rest.join('=')];
    })
  );
};

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const sku = String(formData.get('sku') || '');
  const clear = String(formData.get('clear') || '');
  const redirect = String(formData.get('redirect') || '/maison-cortes/selection');
  const origin = new URL(request.url).origin;

  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const existingSelections = parseSelectionCookie(cookies[SELECTION_COOKIE_NAME]);

  // Clear all or specific sku
  if (clear === '1' && !sku) {
    for (const entry of existingSelections) {
      if (entry.reservationId) await releaseReservation(entry.sku, entry.reservationId);
    }
    return new Response(null, {
      status: 303,
      headers: {
        Location: new URL(redirect || '/maison-cortes', origin).toString(),
        'Set-Cookie': serializeSelectionCookie('', 0),
      },
    });
  }

  if (clear === '1' && sku) {
    const remaining: MaisonCortesSelectionEntry[] = [];
    for (const entry of existingSelections) {
      if (entry.sku === sku) {
        if (entry.reservationId) await releaseReservation(entry.sku, entry.reservationId);
      } else {
        remaining.push(entry);
      }
    }
    return new Response(null, {
      status: 303,
      headers: {
        Location: new URL(redirect || '/maison-cortes', origin).toString(),
        'Set-Cookie': serializeSelectionCookie(
          remaining.length ? formatSelectionCookie(remaining) : '',
          remaining.length ? SELECTION_TTL_MS / 1000 : 0
        ),
      },
    });
  }

  const product = maisonCortesProducts.find((item) => item.id === sku);
  if (!product) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: new URL('/maison-cortes?selection=invalid', origin).toString(),
        'Set-Cookie': serializeSelectionCookie('', 0),
      },
    });
  }

  const reservation = await reserveSelection(sku, SELECTION_TTL_MS);
  if (!reservation.ok) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: new URL('/maison-cortes?selection=unavailable', origin).toString(),
        'Set-Cookie': serializeSelectionCookie('', 0),
      },
    });
  }

  // Keep existing selections, drop duplicates for same sku
  const filtered = existingSelections.filter((entry) => entry.sku !== sku);
  const nextSelections: MaisonCortesSelectionEntry[] = [...filtered, { sku, reservationId: reservation.reservationId }];
  const cookieValue = formatSelectionCookie(nextSelections);

  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL(redirect, origin).toString(),
      'Set-Cookie': serializeSelectionCookie(cookieValue, reservation.ttlSeconds),
    },
  });
};

export const GET: APIRoute = async () =>
  new Response('Method not allowed', {
    status: 405,
    headers: { Allow: 'POST' },
  });
