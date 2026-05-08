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
  deleteDocument,
  getDocumentById,
  updateDocument,
} from '~/utils/backend/services/documents';
import { parseDocumentUpdate } from '~/utils/backend/validation';
import { withAuth } from '~/utils/supabase/auth';

export const prerender = false;

const SUPABASE_ERROR = 'Supabase admin client is not configured';

export const GET: APIRoute = withAuth(async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing document id');
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const document = await getDocumentById(client, agency.id, id);

    return ok({ document });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in GET /api/backend/documents/[id]');
  }
});

export const PUT: APIRoute = withAuth(async ({ locals, params, request }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing document id');
  }

  let payload: ReturnType<typeof parseDocumentUpdate>;

  try {
    payload = parseDocumentUpdate(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    return badRequest(message);
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const existing = await getDocumentById(client, agency.id, id);

    const metadata = payload.metadata ?? existing.metadata ?? {};
    const updated = await updateDocument(client, agency.id, id, { ...payload, metadata });

    await logAgencyActivity(client, agency.id, 'document_updated', 'document', updated.id, {
      title: updated.title,
      document_type: updated.document_type,
      status: updated.status,
    });

    return ok({ document: updated });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in PUT /api/backend/documents/[id]');
  }
});

export const DELETE: APIRoute = withAuth(async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing document id');
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const deleted = await deleteDocument(client, agency.id, id);

    await logAgencyActivity(client, agency.id, 'document_deleted', 'document', deleted.id, {
      title: deleted.title,
      document_type: deleted.document_type,
    });

    return noContent();
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in DELETE /api/backend/documents/[id]');
  }
});
