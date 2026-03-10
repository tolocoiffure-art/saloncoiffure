import type { APIRoute } from 'astro';

import { getAgencyContext } from '~/utils/backend/context';
import { handleApiError, ok, serviceUnavailable } from '~/utils/backend/http';
import { computeOrderMetrics, listOrders } from '~/utils/backend/services/orders';
import { ORDER_STATUSES } from '~/utils/backend/validation';
import { withAuth } from '~/utils/supabase/auth';
import { getTenantFromContext } from '~/utils/tenant';

export const prerender = false;

const SUPABASE_ERROR = 'Supabase admin client is not configured';

function parseLimit(url: URL) {
  const value = Number(url.searchParams.get('limit') ?? '50');
  if (Number.isNaN(value) || value <= 0) return 50;
  return Math.min(Math.floor(value), 200);
}

function normalizeStatusFilter(raw: string | null): string[] | undefined {
  if (!raw) return undefined;
  const normalized = raw.trim().toLowerCase();
  const allowed = new Set<string>([...ORDER_STATUSES, 'canceled']);
  if (!allowed.has(normalized)) return undefined;
  if (normalized === 'cancelled' || normalized === 'canceled') {
    return ['cancelled', 'canceled'];
  }
  return [normalized];
}

export const GET: APIRoute = withAuth(async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const limit = parseLimit(url);
    const statusFilters = normalizeStatusFilter(url.searchParams.get('status'));
    const tenant = getTenantFromContext({ request, locals });

    const { agency, client, admin } = await getAgencyContext(locals);
    const db = admin ?? client;
    const orders = await listOrders(db, agency.id, { limit, statuses: statusFilters }, tenant.slug);
    const metrics = await computeOrderMetrics(db, agency.id, statusFilters, tenant.slug);

    return ok({
      orders,
      metrics,
    });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in GET /api/backend/orders');
  }
});
