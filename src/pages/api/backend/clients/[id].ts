import type { APIRoute } from 'astro';

import { logAgencyActivity } from '~/utils/backend/activity';
import { getAgencyContext } from '~/utils/backend/context';
import { badRequest, handleApiError, noContent, ok, serviceUnavailable } from '~/utils/backend/http';
import { deleteClient, getClientById, updateClient } from '~/utils/backend/services/clients';
import { parseClientUpdate } from '~/utils/backend/validation';
import { withAuth } from '~/utils/supabase/auth';

export const prerender = false;

const SUPABASE_ERROR = 'Supabase admin client is not configured';

export const GET: APIRoute = withAuth(async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing client id');
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const record = await getClientById(client, agency.id, id);

    return ok({ client: record });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in GET /api/backend/clients/[id]');
  }
});

export const PATCH: APIRoute = withAuth(async ({ locals, params, request }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing client id');
  }

  let payload: ReturnType<typeof parseClientUpdate>;

  try {
    payload = parseClientUpdate(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    return badRequest(message);
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const updated = await updateClient(client, agency.id, id, payload);

    await logAgencyActivity(client, agency.id, 'client_updated', 'client', updated.id, {
      company_name: updated.company_name,
      status: updated.status,
    });

    return ok({ client: updated });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in PATCH /api/backend/clients/[id]');
  }
});

export const DELETE: APIRoute = withAuth(async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing client id');
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const deleted = await deleteClient(client, agency.id, id);

    await logAgencyActivity(client, agency.id, 'client_deleted', 'client', deleted.id, {
      company_name: deleted.company_name,
    });

    return noContent();
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in DELETE /api/backend/clients/[id]');
  }
});
