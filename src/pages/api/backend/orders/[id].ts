import type { APIRoute } from 'astro';

import { logAgencyActivity } from '~/utils/backend/activity';
import { getAgencyContext } from '~/utils/backend/context';
import { badRequest, handleApiError, noContent, ok, serviceUnavailable } from '~/utils/backend/http';
import { deleteOrder, getOrderById, updateOrder } from '~/utils/backend/services/orders';
import { parseOrderUpdatePayload } from '~/utils/backend/validation';
import { withAuth } from '~/utils/supabase/auth';
import { getTenantFromContext } from '~/utils/tenant';

export const prerender = false;

const SUPABASE_ERROR = 'Supabase admin client is not configured';

function parseOrderId(value: string | undefined) {
  if (!value) {
    throw new Error('Missing order id');
  }
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new Error('Invalid order id');
  }
  return numeric;
}

export const GET: APIRoute = withAuth(async ({ locals, params, request }) => {
  let orderId: number;
  try {
    orderId = parseOrderId(params.id ? String(params.id) : undefined);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : 'Invalid order id');
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const tenant = getTenantFromContext({ request, locals });
    const order = await getOrderById(client, agency.id, orderId, tenant.slug);

    return ok({ order });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in GET /api/backend/orders/[id]');
  }
});

export const PATCH: APIRoute = withAuth(async ({ locals, params, request }) => {
  let orderId: number;
  try {
    orderId = parseOrderId(params.id ? String(params.id) : undefined);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : 'Invalid order id');
  }

  let payload: ReturnType<typeof parseOrderUpdatePayload>;
  try {
    payload = parseOrderUpdatePayload(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    return badRequest(message);
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const tenant = getTenantFromContext({ request, locals });
    const existing = await getOrderById(client, agency.id, orderId, tenant.slug);
    const updated = await updateOrder(client, agency.id, orderId, payload, tenant.slug);

    await logAgencyActivity(client, agency.id, 'order_updated', 'order', String(orderId), {
      before_status: existing.status ?? null,
      after_status: updated.status ?? null,
    });

    return ok({ order: updated });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in PATCH /api/backend/orders/[id]');
  }
});

export const DELETE: APIRoute = withAuth(async ({ locals, params, request }) => {
  let orderId: number;
  try {
    orderId = parseOrderId(params.id ? String(params.id) : undefined);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : 'Invalid order id');
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const tenant = getTenantFromContext({ request, locals });
    const deleted = await deleteOrder(client, agency.id, orderId, tenant.slug);

    await logAgencyActivity(client, agency.id, 'order_deleted', 'order', String(orderId), {});

    return noContent();
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in DELETE /api/backend/orders/[id]');
  }
});
