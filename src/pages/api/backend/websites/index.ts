import type { APIRoute } from 'astro';

import { provisionWebsiteWorkspace, getDocumentSections } from '~/lib/google-docs';
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
  createWebsite,
  deleteWebsite,
  insertWebsiteSections,
  listWebsites,
} from '~/utils/backend/services/websites';
import {
  parseWebsitePayload,
  parseWebsiteSectionPayload,
  WEBSITE_STATUSES,
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

function normalizeClientId(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeSearch(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 64) || 'section';
}

function mapSectionInput(
  section: ReturnType<typeof parseWebsiteSectionPayload>,
  fallbackDocId: string | null,
) {
  const key = section.section_key ? slugify(section.section_key) : slugify(section.heading ?? 'section');
  return {
    ...section,
    section_key: key,
    google_doc_id: section.google_doc_id ?? fallbackDocId,
    google_doc_heading: section.google_doc_heading ?? section.heading ?? null,
  };
}

export const GET: APIRoute = withAuth(async ({ locals, url }) => {
  try {
    const { agency, client } = await getAgencyContext(locals);
    const search = normalizeSearch(url.searchParams.get('search') ?? url.searchParams.get('q'));
    const page = parsePositiveInteger(url.searchParams.get('page'), 1);
    const pageSize = parsePageSize(url.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);
    const status = normalizeEnum(url.searchParams.get('status'), WEBSITE_STATUSES);
    const clientId =
      normalizeClientId(url.searchParams.get('clientId')) ??
      normalizeClientId(url.searchParams.get('client_id'));

    const { websites, total } = await listWebsites(client, agency.id, {
      page,
      pageSize,
      status,
      clientId,
      search,
      includeSections: true,
    });

    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    return ok({
      websites,
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
    return handleApiError(error, 'Unexpected error in GET /api/backend/websites');
  }
});

export const POST: APIRoute = withAuth(async ({ locals, request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON payload');
  }

  let websitePayload: ReturnType<typeof parseWebsitePayload>;
  try {
    websitePayload = parseWebsitePayload(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid website payload';
    return badRequest(message);
  }

  let sectionPayloads: ReturnType<typeof parseWebsiteSectionPayload>[] = [];
  if (Array.isArray(body?.sections)) {
    try {
      sectionPayloads = body.sections.map((section: unknown) => parseWebsiteSectionPayload(section));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid section payload';
      return badRequest(message);
    }
  }

  try {
    const { agency, client } = await getAgencyContext(locals);

    let googleDocId = websitePayload.google_doc_id;
    let googleFolderId = websitePayload.google_folder_id;

    if (!googleDocId) {
      const workspace = await provisionWebsiteWorkspace(websitePayload.name);
      if (workspace.docId) googleDocId = workspace.docId;
      if (workspace.folderId) googleFolderId = workspace.folderId;
    }

    const website = await createWebsite(client, agency.id, {
      ...websitePayload,
      google_doc_id: googleDocId,
      google_folder_id: googleFolderId,
    });

    const sectionInputs: ReturnType<typeof mapSectionInput>[] = [];

    if (sectionPayloads.length) {
      sectionPayloads.forEach((section) => {
        sectionInputs.push(mapSectionInput(section, googleDocId));
      });
    } else if (googleDocId) {
      const docSections = await getDocumentSections(googleDocId);
      docSections.forEach((section) => {
        sectionInputs.push({
          section_key: slugify(section.heading),
          heading: section.heading,
          content: section.content,
          media: [],
          google_doc_id: googleDocId,
          google_doc_heading: section.heading,
        });
      });
    }

    let insertedSections;
    try {
      insertedSections = await insertWebsiteSections(client, website.id, sectionInputs);
    } catch (error) {
      try {
        await deleteWebsite(client, agency.id, website.id);
      } catch (cleanupError) {
        console.error('Failed to rollback website creation after section error', cleanupError);
      }
      throw error;
    }

    await logAgencyActivity(client, agency.id, 'website_created', 'website', website.id, {
      name: website.name,
      status: website.status,
    });

    return created({
      website,
      sections: insertedSections,
    });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in POST /api/backend/websites');
  }
});
