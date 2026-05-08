import type { APIRoute } from 'astro';

import { logAgencyActivity } from '~/utils/backend/activity';
import { getAgencyContext } from '~/utils/backend/context';
import { badRequest, handleApiError, noContent, ok, serviceUnavailable } from '~/utils/backend/http';
import { deleteInvoice, getInvoiceById, updateInvoice } from '~/utils/backend/services/invoices';
import { parseInvoiceUpdate } from '~/utils/backend/validation';
import { withAuth } from '~/utils/supabase/auth';

export const prerender = false;

const SUPABASE_ERROR = 'Supabase admin client is not configured';

export const GET: APIRoute = withAuth(async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing invoice id');
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const record = await getInvoiceById(client, agency.id, id);

    return ok({ invoice: record });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in GET /api/backend/invoices/[id]');
  }
});

export const PATCH: APIRoute = withAuth(async ({ locals, params, request }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing invoice id');
  }

  let payload: ReturnType<typeof parseInvoiceUpdate>;

  try {
    payload = parseInvoiceUpdate(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    return badRequest(message);
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const previous = await getInvoiceById(client, agency.id, id);
    const updated = await updateInvoice(client, agency.id, id, payload);

    await logAgencyActivity(client, agency.id, 'invoice_updated', 'invoice', updated.id, {
      invoice_number: updated.invoice_number,
      previous_status: previous.status,
      status: updated.status,
      amount: updated.amount,
    });

    return ok({ invoice: updated });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in PATCH /api/backend/invoices/[id]');
  }
});

export const DELETE: APIRoute = withAuth(async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing invoice id');
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const deleted = await deleteInvoice(client, agency.id, id);

    await logAgencyActivity(client, agency.id, 'invoice_deleted', 'invoice', deleted.id, {
      invoice_number: deleted.invoice_number,
    });

    return noContent();
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in DELETE /api/backend/invoices/[id]');
  }
});
