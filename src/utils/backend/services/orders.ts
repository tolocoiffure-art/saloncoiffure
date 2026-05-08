// src/utils/backend/services/orders.ts
import type { SupabaseClient } from '@supabase/supabase-js';

import { ApiError } from '../http';
import { ORDER_STATUSES, type OrderUpdateInput } from '../validation';

export interface OrderRecord {
  id: number;
  created_at: string;
  stripe_session_id: string | null;
  subscription_id: string | null;
  customer_email: string | null;
  amount_total: number | null;
  currency: string | null;
  mode: string | null;
  status: string | null;
}

export interface ListOrdersOptions {
  limit: number;
  statuses?: readonly string[];
}

export interface OrderMetrics {
  count: number;
  recurringCount: number;
  revenue: number;
  latest: OrderRecord | null;
}

const ORDER_DB_COLUMNS = new Set([
  'stripe_session_id',
  'subscription_id',
  'customer_email',
  'amount_total',
  'currency',
  'mode',
  'status',
]);

function normalizeStatusesForQuery(statuses?: readonly string[]): string[] | undefined {
  if (!statuses || statuses.length === 0) return undefined;

  const knownStatuses = new Set<string>(ORDER_STATUSES);
  const expanded = statuses.flatMap((status) => {
    if (status === 'canceled') {
      return ['cancelled', 'canceled'];
    }
    if (status === 'cancelled') {
      return ['cancelled', 'canceled'];
    }
    return knownStatuses.has(status) ? [status] : [];
  });

  if (expanded.length === 0) {
    return undefined;
  }

  return Array.from(new Set(expanded));
}

function applyStatusFilters(
  query: ReturnType<SupabaseClient['from']>,
  statuses?: readonly string[],
) {
  const normalized = normalizeStatusesForQuery(statuses);
  if (!normalized || normalized.length === 0) {
    return query;
  }

  if (normalized.length === 1) {
    return query.eq('status', normalized[0]);
  }

  return query.in('status', normalized);
}

function applyTenantFilter(query: ReturnType<SupabaseClient['from']>, tenantId?: string) {
  if (!tenantId) return query;
  return query.eq('tenant_id', tenantId);
}

export async function listOrders(
  client: SupabaseClient,
  agencyId: string,
  options: ListOrdersOptions,
  tenantId?: string,
): Promise<OrderRecord[]> {
  const limit = Math.max(1, Math.min(options.limit, 200));
  const baseQuery = () =>
    applyTenantFilter(
      client.from('orders').select('*').order('created_at', { ascending: false }).limit(limit),
      tenantId,
    );

  try {
    const queryWithAgency = applyStatusFilters(
      baseQuery().or(`agency_id.is.null,agency_id.eq.${agencyId}`),
      options.statuses,
    );
    let { data, error } = await queryWithAgency;

    // If the column agency_id does not exist in the live table, retry without the filter.
    if (error && String(error.message || '').toLowerCase().includes('agency_id')) {
      const fallbackQuery = applyStatusFilters(baseQuery(), options.statuses);
      ({ data, error } = await fallbackQuery);
    }

    if (error) {
      console.error('Failed to list orders', error);
      throw new ApiError(500, 'Unable to load orders');
    }

    return (data ?? []) as OrderRecord[];
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('Unexpected error while listing orders', error);
    throw new ApiError(500, 'Unable to load orders');
  }
}

export async function getOrderById(
  client: SupabaseClient,
  agencyId: string,
  id: number,
  tenantId?: string,
): Promise<OrderRecord> {
  const { data, error } = await applyTenantFilter(client.from('orders'), tenantId)
    .select('*')
    .eq('id', id)
    .or(`agency_id.is.null,agency_id.eq.${agencyId}`)
    .maybeSingle();

  if (error) {
    console.error('Failed to load order', error);
    throw new ApiError(500, 'Unable to load order');
  }

  if (!data) {
    throw new ApiError(404, 'Order not found');
  }

  return data as OrderRecord;
}

export async function updateOrder(
  client: SupabaseClient,
  agencyId: string,
  id: number,
  payload: OrderUpdateInput,
  tenantId?: string,
): Promise<OrderRecord> {
  const updatePayload = Object.fromEntries(
    Object.entries(payload).filter(([k]) => ORDER_DB_COLUMNS.has(k)),
  );

  const { data, error } = await applyTenantFilter(client.from('orders'), tenantId)
    .update(updatePayload)
    .eq('id', id)
    .or(`agency_id.is.null,agency_id.eq.${agencyId}`)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Failed to update order', error);
    throw new ApiError(500, 'Unable to update order');
  }

  if (!data) {
    throw new ApiError(404, 'Order not found');
  }

  return data as OrderRecord;
}

export async function deleteOrder(
  client: SupabaseClient,
  agencyId: string,
  id: number,
  tenantId?: string,
): Promise<OrderRecord> {
  const { data, error } = await applyTenantFilter(client.from('orders'), tenantId)
    .delete()
    .eq('id', id)
    .or(`agency_id.is.null,agency_id.eq.${agencyId}`)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Failed to delete order', error);
    throw new ApiError(500, 'Unable to delete order');
  }

  if (!data) {
    throw new ApiError(404, 'Order not found');
  }

  return data as OrderRecord;
}

export async function computeOrderMetrics(
  client: SupabaseClient,
  agencyId: string,
  statuses?: readonly string[],
  tenantId?: string,
): Promise<OrderMetrics> {
  const normalized = normalizeStatusesForQuery(statuses);
  const base = applyTenantFilter(client.from('orders'), tenantId);

  try {
    const [totalResult, recurringResult, revenueResult, latestResult] = await Promise.all([
      applyStatusFilters(
        base.select('id', { count: 'exact', head: true }).or(`agency_id.is.null,agency_id.eq.${agencyId}`),
        normalized,
      ),
      applyStatusFilters(
        base
          .select('id', { count: 'exact', head: true })
          .or(`agency_id.is.null,agency_id.eq.${agencyId}`)
          .eq('mode', 'subscription'),
        normalized,
      ),
      applyStatusFilters(
        base.select('amount_total').or(`agency_id.is.null,agency_id.eq.${agencyId}`),
        normalized,
      ).in('status', ['paid', 'complete']),
      applyStatusFilters(
        base
          .select('*')
          .or(`agency_id.is.null,agency_id.eq.${agencyId}`)
          .order('created_at', { ascending: false })
          .limit(1),
        normalized,
      ).maybeSingle(),
    ]);

    const missingAgencyColumn =
      (totalResult.error && String(totalResult.error.message || '').toLowerCase().includes('agency_id')) ||
      (recurringResult.error && String(recurringResult.error.message || '').toLowerCase().includes('agency_id')) ||
      (revenueResult.error && String(revenueResult.error.message || '').toLowerCase().includes('agency_id')) ||
      (latestResult.error && String(latestResult.error.message || '').toLowerCase().includes('agency_id'));

    if (missingAgencyColumn) {
      const [totalFallback, recurringFallback, revenueFallback, latestFallback] = await Promise.all([
        applyStatusFilters(base.select('id', { count: 'exact', head: true }), normalized),
        applyStatusFilters(base.select('id', { count: 'exact', head: true }).eq('mode', 'subscription'), normalized),
        applyStatusFilters(base.select('amount_total'), normalized).in('status', ['paid', 'complete']),
        applyStatusFilters(base.select('*').order('created_at', { ascending: false }).limit(1), normalized).maybeSingle(),
      ]);

      totalResult.error = totalFallback.error;
      totalResult.count = totalFallback.count;
      recurringResult.error = recurringFallback.error;
      recurringResult.count = recurringFallback.count;
      revenueResult.error = revenueFallback.error;
      revenueResult.data = revenueFallback.data;
      latestResult.error = latestFallback.error;
      latestResult.data = latestFallback.data;
    }

    if (totalResult.error) {
      console.error('Failed to compute order count', totalResult.error);
    }
    if (recurringResult.error) {
      console.error('Failed to compute recurring order count', recurringResult.error);
    }
    if (revenueResult.error) {
      console.error('Failed to compute order revenue', revenueResult.error);
    }
    if (latestResult.error) {
      console.error('Failed to fetch latest order', latestResult.error);
    }

    const revenueRows = revenueResult.error ? [] : revenueResult.data ?? [];
    const revenue = revenueRows.reduce((sum, row) => sum + (Number(row?.amount_total) || 0), 0);

    return {
      count: totalResult.error ? 0 : totalResult.count ?? 0,
      recurringCount: recurringResult.error ? 0 : recurringResult.count ?? 0,
      revenue,
      latest: latestResult.error ? null : (latestResult.data as OrderRecord | null),
    };
  } catch (error) {
    console.error('Unexpected error while computing order metrics', error);
    return { count: 0, recurringCount: 0, revenue: 0, latest: null };
  }
}
