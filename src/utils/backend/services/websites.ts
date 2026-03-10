// src/utils/backend/services/websites.ts
import type { SupabaseClient } from '@supabase/supabase-js';

import { ApiError } from '../http';
import type { WebsiteInput, WebsiteSectionInput } from '../validation';

export interface WebsiteRecord extends WebsiteInput {
  id: string;
  agency_id: string;
  created_at: string;
  updated_at?: string;
}

export interface WebsiteSectionRecord extends WebsiteSectionInput {
  id: string;
  website_id: string;
  created_at: string;
  updated_at?: string;
  order_index?: number | null;
}

export interface WebsiteDetailMetrics {
  sectionCount: number;
  linkedDocs: number;
  lastUpdatedSection: string | null;
}

export interface WebsiteDetailResult {
  website: WebsiteRecord;
  sections: WebsiteSectionRecord[];
  metrics: WebsiteDetailMetrics;
}

export interface ListWebsitesOptions {
  page: number;
  pageSize: number;
  status?: string;
  clientId?: string;
  search?: string | null;
  includeSections?: boolean;
}

export interface ListWebsitesResult {
  websites: Array<WebsiteRecord & { sections: WebsiteSectionRecord[] }>;
  total: number;
}

function sanitizeSearchTerm(term: string): string {
  return term.replace(/[\n\r\t]+/g, ' ').trim();
}

export async function listWebsites(
  client: SupabaseClient,
  agencyId: string,
  options: ListWebsitesOptions,
): Promise<ListWebsitesResult> {
  const page = Math.max(1, options.page);
  const pageSize = Math.max(1, options.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from('websites')
    .select('*', { count: 'exact' })
    .eq('agency_id', agencyId);

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.clientId) {
    query = query.eq('client_id', options.clientId);
  }

  if (options.search) {
    const sanitized = sanitizeSearchTerm(options.search);
    if (sanitized) {
      const pattern = `%${sanitized.replace(/[%_]/g, '')}%`;
      query = query.or(
        ['name', 'domain', 'preview_url', 'production_url']
          .map((column) => `${column}.ilike.${pattern}`)
          .join(','),
      );
    }
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Failed to list websites', error);
    throw new ApiError(500, 'Unable to load websites');
  }

  const websites = (data ?? []) as WebsiteRecord[];

  if (!options.includeSections || websites.length === 0) {
    return {
      websites: websites.map((site) => ({ ...site, sections: [] })),
      total: count ?? 0,
    };
  }

  const websiteIds = websites.map((site) => site.id);
  const { data: sections, error: sectionsError } = await client
    .from('website_sections')
    .select('*')
    .in('website_id', websiteIds)
    .order('created_at', { ascending: true });

  if (sectionsError) {
    console.error('Failed to load website sections', sectionsError);
    throw new ApiError(500, 'Unable to load website sections');
  }

  const sectionMap = (sections ?? []).reduce<Record<string, WebsiteSectionRecord[]>>((acc, section) => {
    const key = section.website_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(section as WebsiteSectionRecord);
    return acc;
  }, {});

  return {
    websites: websites.map((site) => ({
      ...site,
      sections: sectionMap[site.id] ?? [],
    })),
    total: count ?? 0,
  };
}

export async function getWebsiteById(
  client: SupabaseClient,
  agencyId: string,
  id: string,
): Promise<WebsiteRecord> {
  const { data, error } = await client
    .from('websites')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Failed to load website', error);
    throw new ApiError(500, 'Unable to load website');
  }

  if (!data) {
    throw new ApiError(404, 'Website not found');
  }

  return data as WebsiteRecord;
}

export async function getWebsiteWithSections(
  client: SupabaseClient,
  agencyId: string,
  id: string,
): Promise<WebsiteDetailResult> {
  const [website, sections] = await Promise.all([
    getWebsiteById(client, agencyId, id),
    listWebsiteSections(client, id),
  ]);

  const sectionCount = sections.length;
  const linkedDocs = sections.filter((section) => Boolean(section.google_doc_id)).length;
  const lastUpdatedSection = sections
    .map((section) => section.updated_at)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => (a > b ? -1 : 1))[0] ?? null;

  return {
    website,
    sections,
    metrics: {
      sectionCount,
      linkedDocs,
      lastUpdatedSection,
    },
  };
}

export async function listWebsiteSections(
  client: SupabaseClient,
  websiteId: string,
): Promise<WebsiteSectionRecord[]> {
  const { data, error } = await client
    .from('website_sections')
    .select('*')
    .eq('website_id', websiteId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load website sections', error);
    throw new ApiError(500, 'Unable to load website sections');
  }

  return (data ?? []) as WebsiteSectionRecord[];
}

export async function createWebsite(
  client: SupabaseClient,
  agencyId: string,
  payload: WebsiteInput,
): Promise<WebsiteRecord> {
  const { data, error } = await client
    .from('websites')
    .insert({ ...payload, agency_id: agencyId })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to create website', error);
    throw new ApiError(500, 'Unable to save website');
  }

  return data as WebsiteRecord;
}

export async function updateWebsite(
  client: SupabaseClient,
  agencyId: string,
  id: string,
  payload: Partial<WebsiteInput>,
): Promise<WebsiteRecord> {
  const updatePayload = {
    ...payload,
  } as Record<string, unknown>;

  const { data, error } = await client
    .from('websites')
    .update(updatePayload)
    .eq('agency_id', agencyId)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Failed to update website', error);
    throw new ApiError(500, 'Unable to update website');
  }

  if (!data) {
    throw new ApiError(404, 'Website not found');
  }

  return data as WebsiteRecord;
}

export async function deleteWebsite(
  client: SupabaseClient,
  agencyId: string,
  id: string,
): Promise<Pick<WebsiteRecord, 'id' | 'name'>> {
  const { data, error } = await client
    .from('websites')
    .delete()
    .eq('agency_id', agencyId)
    .eq('id', id)
    .select('id, name')
    .maybeSingle();

  if (error) {
    console.error('Failed to delete website', error);
    throw new ApiError(500, 'Unable to delete website');
  }

  if (!data) {
    throw new ApiError(404, 'Website not found');
  }

  return data as Pick<WebsiteRecord, 'id' | 'name'>;
}

export async function insertWebsiteSections(
  client: SupabaseClient,
  websiteId: string,
  sections: WebsiteSectionInput[],
): Promise<WebsiteSectionRecord[]> {
  if (!sections.length) {
    return [];
  }

  const insertPayload = sections.map((section) => ({
    ...section,
    website_id: websiteId,
  }));

  const { data, error } = await client
    .from('website_sections')
    .insert(insertPayload)
    .select('*');

  if (error) {
    console.error('Failed to insert website sections', error);
    throw new ApiError(500, 'Unable to save website sections');
  }

  return (data ?? []) as WebsiteSectionRecord[];
}

export async function updateWebsiteSection(
  client: SupabaseClient,
  websiteId: string,
  sectionId: string,
  payload: Partial<WebsiteSectionInput>,
): Promise<WebsiteSectionRecord> {
  const updatePayload = {
    ...payload,
  } as Record<string, unknown>;

  const { data, error } = await client
    .from('website_sections')
    .update(updatePayload)
    .eq('website_id', websiteId)
    .eq('id', sectionId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Failed to update website section', error);
    throw new ApiError(500, 'Unable to update website section');
  }

  if (!data) {
    throw new ApiError(404, 'Website section not found');
  }

  return data as WebsiteSectionRecord;
}

export async function deleteWebsiteSections(
  client: SupabaseClient,
  websiteId: string,
  sectionIds: string[],
): Promise<void> {
  if (!sectionIds.length) {
    return;
  }

  const { error } = await client
    .from('website_sections')
    .delete()
    .eq('website_id', websiteId)
    .in('id', sectionIds);

  if (error) {
    console.error('Failed to delete website sections', error);
    throw new ApiError(500, 'Unable to delete website sections');
  }
}

export async function deleteAllWebsiteSections(
  client: SupabaseClient,
  websiteId: string,
): Promise<void> {
  const { error } = await client.from('website_sections').delete().eq('website_id', websiteId);

  if (error) {
    console.error('Failed to delete website sections for website', { error, websiteId });
    throw new ApiError(500, 'Unable to delete website sections');
  }
}

export async function replaceWebsiteSections(
  client: SupabaseClient,
  websiteId: string,
  sections: WebsiteSectionInput[],
): Promise<WebsiteSectionRecord[]> {
  await deleteAllWebsiteSections(client, websiteId);
  if (!sections.length) {
    return [];
  }
  return insertWebsiteSections(client, websiteId, sections);
}
