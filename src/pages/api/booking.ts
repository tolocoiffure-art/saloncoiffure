import type { APIRoute } from 'astro';
import { assertRateLimit } from '~/lib/rate-limit';
import { resolveTenantFromRequest } from '~/lib/tenants';
import { getSupabaseAdmin } from '~/lib/supabase';
import {
  checkBookingConflicts,
  createBookingCheckoutSession,
  createBookingRecord,
  parseBookingPayload,
  resolveBookingLocale,
} from '~/lib/booking';

export const prerender = false;

function isJsonRequest(request: Request) {
  return (request.headers.get('content-type') || '').includes('application/json');
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const tenant = resolveTenantFromRequest(request);
  const date = url.searchParams.get('date');
  if (!date) {
    return new Response(JSON.stringify({ error: 'Missing date' }), { status: 400 });
  }
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
    return new Response(JSON.stringify({ error: 'Invalid date' }), { status: 400 });
  }

  const sb = getSupabaseAdmin();
  if (!sb) return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 501 });

  const { data: bookings } = await sb
    .from('bookings')
    .select('id,start_time,end_time,status')
    .eq('tenant_id', tenant.slug)
    .in('status', ['pending', 'confirmed'])
    .gte('start_time', start.toISOString())
    .lte('start_time', end.toISOString());

  const { data: blocks } = await sb
    .from('booking_blocks')
    .select('id,start_time,end_time')
    .eq('tenant_id', tenant.slug)
    .gte('start_time', start.toISOString())
    .lte('start_time', end.toISOString());

  return new Response(
    JSON.stringify({
      tenant: tenant.slug,
      date,
      bookings: bookings || [],
      blocks: blocks || [],
    }),
    { status: 200 }
  );
};

export const POST: APIRoute = async ({ request }) => {
  assertRateLimit(request, { key: 'booking', limit: 6, window: 60 });

  let payloadData: Record<string, any> = {};
  if (isJsonRequest(request)) {
    payloadData = await request.json().catch(() => ({}));
  } else {
    const form = await request.formData();
    payloadData = Object.fromEntries(form.entries());
  }

  let payload;
  try {
    payload = parseBookingPayload(request, payloadData);
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Invalid booking payload' }), { status: 400 });
  }

  const conflicts = await checkBookingConflicts(payload.tenantId, payload.startTime, payload.endTime);
  if (conflicts.length) {
    return new Response(JSON.stringify({ error: 'Requested slot is unavailable', conflicts }), { status: 409 });
  }

  const sb = getSupabaseAdmin();
  if (!sb) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 501 });
  }

  const record = await createBookingRecord(payload);
  if (!record) {
    return new Response(JSON.stringify({ error: 'Failed to create booking' }), { status: 500 });
  }

  const session = await createBookingCheckoutSession(request, payload, record.id);
  if (!session?.url) {
    return new Response(JSON.stringify({ error: 'Stripe not configured for bookings' }), { status: 501 });
  }

  const locale = resolveBookingLocale(request);
  const responseBody = { bookingId: record.id, checkoutUrl: session.url, locale };

  if (!isJsonRequest(request)) {
    return new Response(null, { status: 303, headers: { Location: session.url } });
  }

  return new Response(JSON.stringify(responseBody), { status: 200 });
};
