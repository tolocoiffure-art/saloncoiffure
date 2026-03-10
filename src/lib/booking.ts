import { ENV } from './env';
import { getStripe } from './stripe';
import { getSupabaseAdmin } from './supabase';
import { resolveLocaleFromRequest } from './locale';
import { resolveTenantFromRequest } from './tenants';
import { buildCancelUrl, buildSuccessUrl } from './urls.js';

type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export type BookingPayload = {
  tenantId: string;
  name: string;
  email: string;
  phone?: string;
  service?: string;
  address?: string;
  notes?: string;
  startTime: Date;
  endTime: Date;
  timezone?: string;
  locale?: string;
};

export type BookingRecord = {
  id: string;
  tenant_id: string;
  status: BookingStatus;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  service: string | null;
  address: string | null;
  notes: string | null;
  start_time: string;
  end_time: string;
  timezone: string | null;
  locale: string | null;
  stripe_session_id: string | null;
  amount_total: number | null;
  currency: string | null;
};

export function parseBookingPayload(request: Request, data: Record<string, any>): BookingPayload {
  const name = String(data.name || '').trim();
  const email = String(data.email || '').trim();
  const phone = String(data.phone || '').trim();
  const service = String(data.service || '').trim();
  const address = String(data.address || '').trim();
  const notes = String(data.notes || '').trim();
  const timezone = String(data.timezone || '').trim() || undefined;
  const startRaw = String(data.start_time || data.startTime || '').trim();
  const endRaw = String(data.end_time || data.endTime || '').trim();
  const locale = String(data.locale || '').trim() || resolveLocaleFromRequest(request, 'fr');

  if (!name || !email || !startRaw || !endRaw) {
    throw new Error('Missing required booking fields');
  }

  const startTime = new Date(startRaw);
  const endTime = new Date(endRaw);
  if (Number.isNaN(startTime.valueOf()) || Number.isNaN(endTime.valueOf())) {
    throw new Error('Invalid booking dates');
  }
  if (endTime <= startTime) {
    throw new Error('End time must be after start time');
  }

  const tenant = resolveTenantFromRequest(request);
  return {
    tenantId: tenant.slug,
    name,
    email,
    phone: phone || undefined,
    service: service || undefined,
    address: address || undefined,
    notes: notes || undefined,
    startTime,
    endTime,
    timezone,
    locale,
  };
}

export async function checkBookingConflicts(tenantId: string, startTime: Date, endTime: Date) {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const startIso = startTime.toISOString();
  const endIso = endTime.toISOString();
  const bookings = await sb
    .from('bookings')
    .select('id,start_time,end_time,status')
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'confirmed'])
    .lt('start_time', endIso)
    .gt('end_time', startIso);
  const blocks = await sb
    .from('booking_blocks')
    .select('id,start_time,end_time')
    .eq('tenant_id', tenantId)
    .lt('start_time', endIso)
    .gt('end_time', startIso);

  const conflicts: any[] = [];
  if (bookings.data?.length) conflicts.push(...bookings.data);
  if (blocks.data?.length) conflicts.push(...blocks.data);
  return conflicts;
}

export function resolveBookingAmountMinor(tenantId: string) {
  const price = Number(ENV.LAUSANNE_BOOKING_PRICE_CHF || 0);
  if (!Number.isFinite(price) || price <= 0) return null;
  return Math.round(price * 100);
}

export function resolveBookingCurrency() {
  return (ENV.LAUSANNE_BOOKING_CURRENCY || 'chf').toLowerCase();
}

export function resolveBookingProductName(tenantId: string) {
  if (ENV.LAUSANNE_BOOKING_PRODUCT_NAME) return ENV.LAUSANNE_BOOKING_PRODUCT_NAME;
  if (tenantId === 'lausanne') return 'Réservation déménagement – Lausanne';
  return 'Réservation';
}

export async function createBookingCheckoutSession(
  request: Request,
  payload: BookingPayload,
  bookingId: string
) {
  const stripe = await getStripe();
  if (!stripe) return null;
  const origin = ENV.ORIGIN || request.headers.get('origin') || new URL(request.url).origin;
  const tenant = resolveTenantFromRequest(request);
  const amount = resolveBookingAmountMinor(payload.tenantId);
  if (!amount) return null;
  const currency = resolveBookingCurrency();
  const productName = resolveBookingProductName(payload.tenantId);

  return stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: amount,
          product_data: {
            name: productName,
            description: payload.service ? `Service: ${payload.service}` : undefined,
          },
        },
        quantity: 1,
      },
    ],
    success_url: buildSuccessUrl(origin, tenant.basePath || ''),
    cancel_url: buildCancelUrl(origin, tenant.basePath || ''),
    metadata: {
      booking_id: bookingId,
      tenant_id: payload.tenantId,
      customer_email: payload.email,
      customer_name: payload.name,
      locale: payload.locale || '',
    },
    customer_email: payload.email,
  });
}

export async function createBookingRecord(payload: BookingPayload) {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb
    .from('bookings')
    .insert({
      tenant_id: payload.tenantId,
      status: 'pending',
      customer_name: payload.name,
      customer_email: payload.email,
      customer_phone: payload.phone || null,
      service: payload.service || null,
      address: payload.address || null,
      notes: payload.notes || null,
      start_time: payload.startTime.toISOString(),
      end_time: payload.endTime.toISOString(),
      timezone: payload.timezone || null,
      locale: payload.locale || null,
    })
    .select('*')
    .maybeSingle();
  if (error || !data) return null;
  return data as BookingRecord;
}

export async function finalizeBookingFromSession(session: any) {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const bookingId = session?.metadata?.booking_id;
  if (!bookingId) return null;
  const update = {
    status: 'confirmed',
    stripe_session_id: session.id,
    amount_total: session.amount_total ?? null,
    currency: session.currency ?? null,
  };
  const { data } = await sb.from('bookings').update(update).eq('id', bookingId).select('*').maybeSingle();
  return data as BookingRecord | null;
}

export function resolveBookingLocale(request: Request) {
  return resolveLocaleFromRequest(request, 'fr');
}
