import type { APIRoute } from 'astro';

import { getDocumentSections } from '~/lib/google-docs';
import { sendProjectDelayedEmail, sendProjectReadyEmail } from '~/lib/email';
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
  deleteAllWebsiteSections,
  deleteWebsite,
  deleteWebsiteSections,
  getWebsiteWithSections,
  insertWebsiteSections,
  listWebsiteSections,
  replaceWebsiteSections,
  updateWebsite,
  updateWebsiteSection,
} from '~/utils/backend/services/websites';
import {
  parseWebsiteSectionPayload,
  parseWebsiteSectionUpdatePayload,
  parseWebsiteUpdatePayload,
} from '~/utils/backend/validation';
import { withAuth } from '~/utils/supabase/auth';

export const prerender = false;

const SUPABASE_ERROR = 'Supabase admin client is not configured';

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 64) || 'section';
}

export const GET: APIRoute = withAuth(async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing website id');
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const { website, sections, metrics } = await getWebsiteWithSections(client, agency.id, id);

    return ok({ website, sections, metrics });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in GET /api/backend/websites/[id]');
  }
});

export const PATCH: APIRoute = withAuth(async ({ locals, params, request }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing website id');
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON payload');
  }

  let updatePayload: ReturnType<typeof parseWebsiteUpdatePayload>;
  try {
    updatePayload = parseWebsiteUpdatePayload(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid website payload';
    return badRequest(message);
  }

  const syncFromDoc = Boolean(body?.syncFromDoc);
  const rawSections = syncFromDoc ? [] : Array.isArray(body?.sections) ? body.sections : [];
  const sectionsToInsert: ReturnType<typeof parseWebsiteSectionPayload>[] = [];
  const sectionsToUpdate: { id: string; data: ReturnType<typeof parseWebsiteSectionUpdatePayload> }[] = [];
  const sectionsToDelete: string[] = [];

  for (const rawSection of rawSections) {
    if (!rawSection || typeof rawSection !== 'object') continue;
    const action = typeof rawSection.action === 'string' ? rawSection.action : '';
    const sectionId = typeof rawSection.id === 'string' ? rawSection.id : '';

    if (action === 'delete' && sectionId) {
      sectionsToDelete.push(sectionId);
      continue;
    }

    if (sectionId) {
      try {
        const payload = parseWebsiteSectionUpdatePayload(rawSection);
        if (Object.keys(payload).length > 0) {
          if (payload.section_key) {
            payload.section_key = slugify(payload.section_key);
          } else if (payload.heading) {
            payload.section_key = slugify(payload.heading);
          }
          sectionsToUpdate.push({ id: sectionId, data: payload });
        }
      } catch (error) {
        console.warn('Skipping invalid website section update', error);
      }
      continue;
    }

    try {
      const sectionKey =
        typeof rawSection.section_key === 'string'
          ? rawSection.section_key
          : typeof rawSection.heading === 'string'
          ? slugify(rawSection.heading)
          : slugify('section');
      const payload = parseWebsiteSectionPayload({ ...rawSection, section_key: sectionKey });
      sectionsToInsert.push(payload);
    } catch (error) {
      console.warn('Skipping invalid website section payload', error);
    }
  }

  try {
    const { agency, client } = await getAgencyContext(locals);

    const { website: existing } = await getWebsiteWithSections(client, agency.id, id);

    let updatedWebsite = existing;
    if (Object.keys(updatePayload).length > 0) {
      updatedWebsite = await updateWebsite(client, agency.id, id, updatePayload);

      await logAgencyActivity(client, agency.id, 'website_updated', 'website', id, {
        before_status: existing.status,
        after_status: updatedWebsite.status,
      });
    }

    if (sectionsToInsert.length) {
      const prepared = sectionsToInsert.map((section) => ({
        ...section,
        section_key: slugify(section.section_key),
        google_doc_id: section.google_doc_id ?? updatedWebsite.google_doc_id ?? null,
        google_doc_heading: section.google_doc_heading ?? section.heading ?? null,
      }));
      await insertWebsiteSections(client, id, prepared);
    }

    for (const entry of sectionsToUpdate) {
      const payload = { ...entry.data };
      if (payload.section_key) {
        payload.section_key = slugify(String(payload.section_key));
      }
      try {
        await updateWebsiteSection(client, id, entry.id, payload);
      } catch (error) {
        console.error('Failed to update website section', { error, sectionId: entry.id });
      }
    }

    if (sectionsToDelete.length) {
      try {
        await deleteWebsiteSections(client, id, sectionsToDelete);
      } catch (error) {
        console.error('Failed to delete website sections', error);
      }
    }

    if (syncFromDoc && updatedWebsite.google_doc_id) {
      const docSections = await getDocumentSections(updatedWebsite.google_doc_id);
      if (docSections.length) {
        const normalizedSections = docSections.map((section) => ({
          section_key: slugify(section.heading),
          heading: section.heading,
          content: section.content,
          media: [],
          google_doc_id: updatedWebsite.google_doc_id,
          google_doc_heading: section.heading,
        }));
        await replaceWebsiteSections(client, id, normalizedSections);
        await logAgencyActivity(client, agency.id, 'website_synced', 'website', id, {
          google_doc_id: updatedWebsite.google_doc_id,
          sections: docSections.length,
        });
      }
    }

    if (updatePayload.status && updatePayload.status !== existing.status && existing.client_id) {
      const { data: clientRecord } = await client
        .from('clients')
        .select('email, company_name, primary_contact')
        .eq('id', existing.client_id)
        .maybeSingle();
      const recipient = clientRecord?.email ?? null;
      if (recipient) {
        if (['ready', 'live'].includes(updatePayload.status)) {
          const previewUrl = updatePayload.preview_url ?? updatedWebsite.preview_url ?? '';
          if (previewUrl) {
            await sendProjectReadyEmail({
              to: recipient,
              projectName: updatedWebsite.name,
              previewUrl,
            });
          }
        } else if (updatePayload.status === 'paused') {
          const metadata = (updatePayload.metadata ?? updatedWebsite.metadata ?? {}) as Record<string, unknown>;
          const eta = typeof metadata.delay_eta === 'string' ? (metadata.delay_eta as string) : '';
          if (eta) {
            await sendProjectDelayedEmail({
              to: recipient,
              projectName: updatedWebsite.name,
              newEta: eta,
            });
          }
        }
      }
    }

    const sections = await listWebsiteSections(client, id);
    return ok({ website: updatedWebsite, sections });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in PATCH /api/backend/websites/[id]');
  }
});

export const DELETE: APIRoute = withAuth(async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing website id');
  }

  try {
    const { agency, client } = await getAgencyContext(locals);

    const { website: existing } = await getWebsiteWithSections(client, agency.id, id);

    await deleteAllWebsiteSections(client, id);
    await deleteWebsite(client, agency.id, id);

    await logAgencyActivity(client, agency.id, 'website_deleted', 'website', id, { name: existing.name });

    return noContent();
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in DELETE /api/backend/websites/[id]');
  }
});
