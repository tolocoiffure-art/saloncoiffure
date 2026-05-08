import type { APIRoute } from 'astro';

import { logAgencyActivity } from '~/utils/backend/activity';
import { getAgencyContext } from '~/utils/backend/context';
import {
  badRequest,
  created,
  handleApiError,
  ok,
  serviceUnavailable,
} from '~/utils/backend/http';
import { createDocument, listDocuments } from '~/utils/backend/services/documents';
import { DOCUMENT_STATUSES, DOCUMENT_TYPES, parseDocumentPayload } from '~/utils/backend/validation';
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
    const status = normalizeEnum(url.searchParams.get('status'), DOCUMENT_STATUSES);
    const type = normalizeEnum(url.searchParams.get('type') ?? url.searchParams.get('document_type'), DOCUMENT_TYPES);

    const { documents, total } = await listDocuments(client, agency.id, {
      page,
      pageSize,
      search,
      status,
      type,
    });

    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    return ok({
      documents,
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
    return handleApiError(error, 'Unexpected error in GET /api/backend/documents');
  }
});

export const POST: APIRoute = withAuth(async ({ locals, request }) => {
  let payload: ReturnType<typeof parseDocumentPayload>;

  try {
    payload = parseDocumentPayload(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    return badRequest(message);
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const document = await createDocument(client, agency.id, payload);

    await logAgencyActivity(client, agency.id, 'document_created', 'document', document.id, {
      title: document.title,
      document_type: document.document_type,
    });

    return created({ document });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in POST /api/backend/documents');
  }
});
