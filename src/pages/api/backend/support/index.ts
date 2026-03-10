import type { APIRoute } from 'astro';

import { sendSupportTicketEmail, sendSupportConfirmationEmail } from '~/lib/email';
import { ENV } from '~/lib/env';
import { detectRequestLocale } from '~/lib/locale';
import { logAgencyActivity } from '~/utils/backend/activity';
import { getAgencyContext } from '~/utils/backend/context';
import {
  badRequest,
  created,
  handleApiError,
  ok,
  serviceUnavailable,
} from '~/utils/backend/http';
import {
  createSupportRequest,
  listSupportRequests,
} from '~/utils/backend/services/support';
import {
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  parseSupportRequestPayload,
} from '~/utils/backend/validation';
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

function normalizeEnum(value: string | null, allowed: readonly string[]): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : undefined;
}

function normalizeSearch(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export const GET: APIRoute = withAuth(async ({ locals, url }) => {
  try {
    const { agency, client } = await getAgencyContext(locals);

    const search = normalizeSearch(url.searchParams.get('search') ?? url.searchParams.get('q'));
    const page = parsePositiveInteger(url.searchParams.get('page'), 1);
    const pageSize = parsePageSize(url.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);
    const status = normalizeEnum(url.searchParams.get('status'), SUPPORT_STATUSES);
    const priority = normalizeEnum(url.searchParams.get('priority'), SUPPORT_PRIORITIES);
    const websiteId = url.searchParams.get('websiteId') ?? url.searchParams.get('website_id') ?? undefined;

    const { requests, total } = await listSupportRequests(client, agency.id, {
      page,
      pageSize,
      search,
      status,
      priority,
      websiteId: websiteId ? websiteId.trim() || undefined : undefined,
    });

    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    return ok({
      requests,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in GET /api/backend/support');
  }
});

export const POST: APIRoute = withAuth(async ({ locals, request }) => {
  let payload: ReturnType<typeof parseSupportRequestPayload>;

  try {
    const body = await request.json();
    payload = parseSupportRequestPayload(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    return badRequest(message);
  }

  try {
    const { agency, client } = await getAgencyContext(locals);

    const record = await createSupportRequest(client, agency.id, payload);

    await logAgencyActivity(client, agency.id, 'support_request_created', 'support_request', record.id, {
      request_type: record.request_type,
      priority: record.priority,
    });

    const locale = detectRequestLocale(request, new URL(request.url));

    if (ENV.SUPPORT_EMAIL) {
      const summary = payload.description || payload.request_type;
      await sendSupportTicketEmail({
        to: ENV.SUPPORT_EMAIL,
        ticketId: record.id,
        summary,
        customerName: payload.customer_name,
        priority: payload.priority,
        locale,
      });
    }

    if (payload.customer_email) {
      const summary = payload.description || payload.request_type;
      await sendSupportConfirmationEmail({
        to: payload.customer_email,
        ticketId: record.id,
        summary,
        locale,
      });
    }

    return created({ request: record });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in POST /api/backend/support');
  }
});

