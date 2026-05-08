import type { APIRoute } from 'astro';

import { logAgencyActivity } from '~/utils/backend/activity';
import { getAgencyContext } from '~/utils/backend/context';
import {
  badRequest,
  handleApiError,
  noContent,
  ok,
  serviceUnavailable,
} from '~/utils/backend/http';
import {
  deleteSupportRequest,
  getSupportRequestById,
  updateSupportRequest,
} from '~/utils/backend/services/support';
import { parseSupportRequestUpdatePayload } from '~/utils/backend/validation';
import { withAuth } from '~/utils/supabase/auth';

export const prerender = false;

const SUPABASE_ERROR = 'Supabase admin client is not configured';

export const PATCH: APIRoute = withAuth(async ({ locals, params, request }) => {
  const ticketId = String(params.id || '');
  if (!ticketId) {
    return badRequest('Missing ticket id');
  }

  let payload: ReturnType<typeof parseSupportRequestUpdatePayload>;
  try {
    payload = parseSupportRequestUpdatePayload(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    return badRequest(message);
  }

  try {
    const { agency, client } = await getAgencyContext(locals);

    const existing = await getSupportRequestById(client, agency.id, ticketId);

    if (Object.keys(payload).length === 0) {
      return ok({ request: existing });
    }

    const updated = await updateSupportRequest(client, agency.id, ticketId, payload);

    await logAgencyActivity(client, agency.id, 'support_request_updated', 'support_request', ticketId, {
      before_status: existing.status,
      after_status: updated.status,
      priority: updated.priority,
    });

    return ok({ request: updated });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in PATCH /api/backend/support/[id]');
  }
});

export const DELETE: APIRoute = withAuth(async ({ locals, params }) => {
  const ticketId = String(params.id || '');
  if (!ticketId) {
    return badRequest('Missing ticket id');
  }

  try {
    const { agency, client } = await getAgencyContext(locals);

    const deleted = await deleteSupportRequest(client, agency.id, ticketId);

    await logAgencyActivity(client, agency.id, 'support_request_deleted', 'support_request', ticketId, {
      request_type: deleted.request_type,
      status: deleted.status,
    });

    return noContent();
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in DELETE /api/backend/support/[id]');
  }
});

