import { randomBytes } from 'crypto';

import { getSupabaseAdmin } from './supabase';
import { logger } from './logger.js';

const ORDER_PREFIX = 'TSW';
const ORDER_RANDOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function formatUtcDatePart(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function randomOrderSuffix(length: number) {
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i += 1) {
    const index = bytes[i] % ORDER_RANDOM_ALPHABET.length;
    result += ORDER_RANDOM_ALPHABET.charAt(index);
  }
  return result;
}

export async function generateOrderNumber() {
  const base = `${ORDER_PREFIX}-${formatUtcDatePart(new Date())}`;
  // No DB uniqueness check since 'order_number' is not persisted in the live schema.
  // Use a sufficiently random suffix to minimize collisions for display-only purposes.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = randomOrderSuffix(4 + attempt);
    const candidate = `${base}-${suffix}`;
    return candidate;
  }
  return `${base}-${Date.now().toString(36).toUpperCase()}`;
}

export type OrderStatus = 'pending' | 'paid' | 'active' | 'cancelled' | 'unpaid' | 'refunded';

// Columns currently present in live Supabase 'orders' table
const ORDER_DB_COLUMNS = new Set([
  'order_number',
  'agency_id',
  'tenant_id',
  'stripe_session_id',
  'subscription_id',
  'customer_email',
  'customer_name',
  'company',
  'phone',
  'plan',
  'template_key',
  'amount_total',
  'currency',
  'mode',
  'status',
  'metadata',
]);

export function sanitizeOrderDbPayload(obj: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj || {})) {
    if (ORDER_DB_COLUMNS.has(k)) out[k] = obj[k];
  }
  return out;
}

export async function insertOrder(data: Record<string, any>) {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const payload = sanitizeOrderDbPayload({ ...data });
  const { data: row, error } = await sb.from('orders').insert(payload).select('*').single();
  if (error) throw error;
  return row;
}

export async function updateOrder(orderId: number | string, fields: Record<string, any>) {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const update = sanitizeOrderDbPayload(fields);
  const { data: row, error } = await sb.from('orders').update(update).eq('id', orderId).select('*').single();
  if (error) throw error;
  return row;
}

export async function fetchOrderBySessionId(sessionId: string) {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data: row } = await sb.from('orders').select('*').eq('stripe_session_id', sessionId).single();
  return row;
}

export async function updateOrderStatusInSupabase(
  sessionId: string,
  status: OrderStatus,
  extra?: Record<string, any>,
  tenantId?: string,
) {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const update = sanitizeOrderDbPayload({ status, ...(extra || {}) });
  let query = sb.from('orders').update(update).eq('stripe_session_id', sessionId);
  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }
  const { data: row, error } = await query.select('*').single();
  if (error) throw error;
  return row;
}

export async function updateOrderStatusBySubscriptionId(
  subscriptionId: string,
  status: OrderStatus,
  extra?: Record<string, any>,
  tenantId?: string,
) {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const update = sanitizeOrderDbPayload({ status, ...(extra || {}) });
  let query = sb.from('orders').update(update).eq('subscription_id', subscriptionId);
  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }
  const { data: row, error } = await query.select('*').maybeSingle();
  if (error) throw error;
  return row;
}

export function extractMetadataFromSession(session: any) {
  try {
    const md = session?.metadata || {};
    return {
      plan: String(md.plan || '').toLowerCase(),
      template: String(md.template || ''),
      name: String(md.name || ''),
      email: String(md.email || session?.customer_details?.email || ''),
      company: String(md.company || ''),
      phone: String(md.phone || ''),
      clientSlug: String(md.clientSlug || ''),
      agencyId: String(md.agencyId || md.agency_id || ''),
      tenantId: String(md.tenant_id || md.tenantId || md.tenant || ''),
    };
  } catch (e) {
    logger.error(e as any, { where: 'extractMetadataFromSession' });
    return {
      plan: '',
      template: '',
      name: '',
      email: '',
      company: '',
      phone: '',
      clientSlug: '',
      agencyId: '',
      tenantId: '',
    };
  }
}

export function buildOrderDraftFromSession(session: any, tenantId?: string) {
  const metadata = extractMetadataFromSession(session);
  const amount = typeof session?.amount_total === 'number' ? session.amount_total : null;
  const tenant = metadata.tenantId || tenantId || null;

  return {
    order_number: null,
    agency_id: metadata.agencyId || null,
    tenant_id: tenant,
    stripe_session_id: session?.id ?? null,
    subscription_id: (session as any)?.subscription ?? null,
    customer_email: metadata.email || session?.customer_details?.email || null,
    customer_name: metadata.name || session?.customer_details?.name || null,
    company: metadata.company || null,
    phone: metadata.phone || null,
    plan: metadata.plan || null,
    template_key: metadata.template || null,
    amount_total: amount,
    currency: session?.currency || null,
    mode: session?.mode || null,
    status: session?.payment_status || null,
    metadata: { ...metadata, tenant_id: tenant || undefined },
  };
}

export async function logSystemEvent(eventType: string, payload: any) {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  await sb.from('webhooks').insert({ provider: 'system', type: eventType, payload });
}
