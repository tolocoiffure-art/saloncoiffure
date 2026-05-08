// src/utils/backend/services/subscriptions.ts
import type { SupabaseClient } from '@supabase/supabase-js';

import { ApiError } from '../http';

export interface SubscriptionEventRecord {
  id: string;
  created_at: string;
  agency_id: string;
  subscription_id: string;
  customer_email: string | null;
  event_type: string;
  payload: Record<string, unknown>;
}

export interface ListSubscriptionEventsOptions {
  page: number;
  pageSize: number;
  subscriptionId?: string;
  eventType?: string;
  email?: string;
  search?: string | null;
}

export interface ListSubscriptionEventsResult {
  events: SubscriptionEventRecord[];
  total: number;
}

function sanitizeSearch(term: string): string {
  return term.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function listSubscriptionEvents(
  client: SupabaseClient,
  agencyId: string,
  options: ListSubscriptionEventsOptions,
): Promise<ListSubscriptionEventsResult> {
  const page = Math.max(1, options.page);
  const pageSize = Math.max(1, Math.min(options.pageSize, 200));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from('subscription_events')
    .select('*', { count: 'exact' })
    .eq('agency_id', agencyId);

  if (options.subscriptionId) {
    query = query.ilike('subscription_id', `%${options.subscriptionId.trim()}%`);
  }

  if (options.eventType) {
    query = query.eq('event_type', options.eventType.trim().toLowerCase());
  }

  if (options.email) {
    query = query.ilike('customer_email', `%${options.email.trim()}%`);
  }

  if (options.search) {
    const sanitized = sanitizeSearch(options.search);
    if (sanitized) {
      const pattern = `%${sanitized.replace(/[%_]/g, '')}%`;
      query = query.or(
        ['subscription_id', 'customer_email', 'event_type']
          .map((column) => `${column}.ilike.${pattern}`)
          .join(','),
      );
    }
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Failed to list subscription events', error);
    throw new ApiError(500, 'Unable to load subscription events');
  }

  return {
    events: (data ?? []) as SubscriptionEventRecord[],
    total: count ?? 0,
  };
}

export async function recordSubscriptionEvent(
  client: SupabaseClient,
  agencyId: string,
  subscriptionId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await client.from('subscription_events').insert({
      agency_id: agencyId,
      subscription_id: subscriptionId,
      customer_email: typeof payload.customer_email === 'string' ? payload.customer_email : null,
      event_type: eventType,
      payload,
    });
  } catch (error) {
    console.error('Failed to persist subscription event', error);
  }
}

