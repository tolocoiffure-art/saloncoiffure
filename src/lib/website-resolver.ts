import { ENV } from './env';
import { getSupabaseAdmin } from './supabase';

type Website = {
  id: string;
  slug: string;
  name: string;
  status?: string | null;
  plan?: string | null;
  published_at?: string | null;
  domain?: string | null;
  preview_url?: string | null;
  production_url?: string | null;
  google_doc_id?: string | null;
  google_folder_id?: string | null;
  template_key?: string | null;
  metadata?: Record<string, unknown> | null;
  agency_id?: string | null;
  client_id?: string | null;
};

type WebsiteSection = {
  id: string;
  section_key: string;
  heading?: string | null;
  content?: string | null;
  media?: any;
  google_doc_id?: string | null;
  google_doc_heading?: string | null;
};

export type ResolvedWebsite = {
  website: Website;
  sections: WebsiteSection[];
  domains: { domain: string; is_primary: boolean }[];
  primaryDomain: string | null;
  matchedDomain: string | null;
};

function normalizeHost(raw: string | null | undefined) {
  return (raw || '').toLowerCase().split(':')[0];
}

function isSubdomainOf(host: string, root: string) {
  return host.endsWith(`.${root}`) && host.length > root.length + 1;
}

export async function getWebsiteByHost(host: string | null | undefined): Promise<ResolvedWebsite | null> {
  const cleanHost = normalizeHost(host);
  if (!cleanHost) return null;

  const sb = getSupabaseAdmin();
  if (!sb) return null;

  const variants = Array.from(new Set([cleanHost, cleanHost.replace(/^www\./, '')])).filter(Boolean);

  // 1) Direct domain match
  let domainMatch: { domain: string; is_primary: boolean; website_id: string } | null = null;
  if (variants.length) {
    const { data, error } = await sb
      .from('website_domains')
      .select('domain, is_primary, website_id')
      .in('domain', variants)
      .order('is_primary', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data) {
      domainMatch = data;
    }
  }

  // 2) Subdomain of DOMAIN_ROOT -> derive slug
  let slugFromRoot: string | null = null;
  const root = ENV.DOMAIN_ROOT?.toLowerCase() || '';
  if (!domainMatch && root && isSubdomainOf(cleanHost, root)) {
    slugFromRoot = cleanHost.replace(`.${root}`, '');
  }

  // Resolve website id
  let websiteId: string | null = domainMatch?.website_id ?? null;
  let matchedDomain: string | null = domainMatch?.domain ?? null;

  if (!websiteId && slugFromRoot) {
    const { data } = await sb
      .from('websites')
      .select('id')
      .eq('slug', slugFromRoot)
      .maybeSingle();
    websiteId = data?.id ?? null;
  }

  if (!websiteId) return null;

  const { data: website } = await sb
    .from('websites')
    .select(
      'id, slug, name, status, plan, published_at, domain, preview_url, production_url, google_doc_id, google_folder_id, template_key, metadata, agency_id, client_id'
    )
    .eq('id', websiteId)
    .maybeSingle();

  if (!website) return null;

  const { data: domains = [] } = await sb
    .from('website_domains')
    .select('domain, is_primary')
    .eq('website_id', websiteId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });

  const primaryDomain =
    domains.find((d) => d.is_primary)?.domain ||
    matchedDomain ||
    website.production_url?.replace(/^https?:\/\//, '') ||
    website.domain ||
    null;

  const { data: sections = [] } = await sb
    .from('website_sections')
    .select('id, section_key, heading, content, media, google_doc_id, google_doc_heading')
    .eq('website_id', websiteId)
    .order('created_at', { ascending: true });

  return {
    website,
    sections,
    domains: domains.map((d) => ({ domain: d.domain, is_primary: !!d.is_primary })),
    primaryDomain,
    matchedDomain,
  };
}
