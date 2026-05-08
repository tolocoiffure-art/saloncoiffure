import type { APIRoute } from 'astro';

import { logAgencyActivity } from '~/utils/backend/activity';
import { getAgencyContext } from '~/utils/backend/context';
import { badRequest, created, handleApiError, ok, serviceUnavailable } from '~/utils/backend/http';
import { createInvoice, listInvoices } from '~/utils/backend/services/invoices';
import { INVOICE_STATUSES, parseInvoicePayload } from '~/utils/backend/validation';
import { withAuth } from '~/utils/supabase/auth';

export const prerender = false;

const SUPABASE_ERROR = 'Supabase admin client is not configured';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
}

function parsePageSize(value: string | null, fallback: number): number {
  const parsed = parsePositiveInteger(value, fallback);
  return Math.min(parsed, MAX_PAGE_SIZE);
}

function normalizeStatus(value: string | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return (INVOICE_STATUSES as readonly string[]).includes(normalized) ? normalized : undefined;
}

function parseDateParam(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseBooleanParam(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export const GET: APIRoute = withAuth(async ({ locals, url }) => {
  try {
    const { agency, client } = await getAgencyContext(locals);

    const searchParam = url.searchParams.get('search') ?? url.searchParams.get('q');
    const search = searchParam ? searchParam.trim() : null;
    const page = parsePositiveInteger(url.searchParams.get('page'), 1);
    const pageSize = parsePageSize(url.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);
    const status = normalizeStatus(url.searchParams.get('status'));
    const clientIdParam = url.searchParams.get('clientId') ?? url.searchParams.get('client_id');
    const projectIdParam = url.searchParams.get('projectId') ?? url.searchParams.get('project_id');
    const clientId = clientIdParam ? clientIdParam.trim() : '';
    const projectId = projectIdParam ? projectIdParam.trim() : '';
    const issuedBefore = parseDateParam(url.searchParams.get('issuedBefore') ?? url.searchParams.get('issued_before'));
    const issuedAfter = parseDateParam(url.searchParams.get('issuedAfter') ?? url.searchParams.get('issued_after'));
    const dueBefore = parseDateParam(url.searchParams.get('dueBefore') ?? url.searchParams.get('due_before'));
    const dueAfter = parseDateParam(url.searchParams.get('dueAfter') ?? url.searchParams.get('due_after'));
    const includeSummaries = parseBooleanParam(url.searchParams.get('summaries'), true);

    const { invoices, total, summaries } = await listInvoices(client, agency.id, {
      page,
      pageSize,
      status,
      clientId: clientId.length ? clientId : undefined,
      projectId: projectId.length ? projectId : undefined,
      search,
      issuedBefore,
      issuedAfter,
      dueBefore,
      dueAfter,
      includeSummaries,
    });

    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    return ok({
      invoices,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
      summaries: includeSummaries
        ? summaries ?? { statusCounts: {}, outstandingAmount: 0, overdueAmount: 0, totalAmount: 0 }
        : undefined,
    });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in GET /api/backend/invoices');
  }
});

export const POST: APIRoute = withAuth(async ({ locals, request }) => {
  let payload: ReturnType<typeof parseInvoicePayload>;

  try {
    payload = parseInvoicePayload(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    return badRequest(message);
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const record = await createInvoice(client, agency.id, payload);

    await logAgencyActivity(client, agency.id, 'invoice_created', 'invoice', record.id, {
      invoice_number: record.invoice_number,
      status: record.status,
      amount: record.amount,
    });

    return created({ invoice: record });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in POST /api/backend/invoices');
  }
});
