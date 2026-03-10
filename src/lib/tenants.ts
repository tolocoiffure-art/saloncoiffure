import type { BrandKey } from './brand.ts';
import { BRANDS } from './brands.config.ts';

export type TenantSlug = BrandKey | 'tonsiteweb' | 'maison-cortes';

export type TenantConfig = {
  slug: TenantSlug;
  brandKey?: BrandKey;
  domains: string[];
  basePath?: string;
  defaultLocale?: string;
  preserveBasePath?: boolean;
  skipHostRewrite?: boolean;
};

export type TenantMatchSource = 'path' | 'host' | 'query' | 'fallback';

export type TenantContext = TenantConfig & {
  source: TenantMatchSource;
  host?: string;
};

const brandTenants: TenantConfig[] = Object.values(BRANDS)
  .filter((brand) => brand.key !== 'maisoncortes')
  .map((brand) => ({
    slug: brand.key as TenantSlug,
    brandKey: brand.key as BrandKey,
    domains: [brand.domain, `www.${brand.domain}`].filter(Boolean) as string[],
    defaultLocale: 'fr',
    basePath:
      brand.key === 'ateliermemoire'
        ? '/atelier-memoire'
        : brand.key === 'tolo-coiffure'
          ? '/tolo-coiffure'
          : undefined,
    preserveBasePath: brand.key === 'ateliermemoire' || brand.key === 'tolo-coiffure',
  }));

const extraTenants: TenantConfig[] = [
  {
    slug: 'maison-cortes',
    brandKey: 'maisoncortes',
    domains: ['maisoncortes.ch', 'www.maisoncortes.ch', 'maisoncortes.local'],
    basePath: '/maison-cortes',
    preserveBasePath: true,
    defaultLocale: 'fr',
  },
  {
    slug: 'tonsiteweb',
    domains: ['tonsiteweb.ch', 'www.tonsiteweb.ch', 'tonwebsite.ch', 'www.tonwebsite.ch'],
    defaultLocale: 'fr',
  },
];

export const TENANTS: TenantConfig[] = [...brandTenants, ...extraTenants];

const tenantBySlug = Object.fromEntries(TENANTS.map((tenant) => [tenant.slug, tenant])) as Record<
  TenantSlug,
  TenantConfig | undefined
>;

const defaultTenant = tenantBySlug.pedro ?? TENANTS[0];

function normalizeHost(host: string | null | undefined) {
  return (host || '')
    .toLowerCase()
    .split(',')[0]
    .trim()
    .split(':')[0];
}

function hostCandidatesFromRequest(request: Request, url: URL) {
  const raw = [request.headers.get('x-forwarded-host'), request.headers.get('host'), url.host];
  const normalized = raw
    .flatMap((value) => (value || '').split(','))
    .map((value) => normalizeHost(value))
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function matchesHost(host: string, tenant: TenantConfig) {
  if (!host) return false;
  return (
    tenant.domains.some((domain) => !!domain && (host === domain || host.endsWith(`.${domain}`) || host.includes(domain))) ||
    host.startsWith(`${tenant.slug}.`) ||
    host.endsWith(`.${tenant.slug}.local`)
  );
}

/**
  * Resolve the tenant using hostname first, then explicit path prefix, then query param.
  * Falls back to the default tenant ("pedro") if nothing matches.
  */
export function resolveTenantFromRequest(request: Request, overrideSlug?: string): TenantContext {
  const url = new URL(request.url);
  const hosts = hostCandidatesFromRequest(request, url);
  const querySlug = overrideSlug || url.searchParams.get('tenant') || '';
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const pathSlug = pathSegments[0] as TenantSlug | undefined;

  const candidateByHost = TENANTS.find((tenant) => hosts.some((host) => matchesHost(host, tenant)));
  const candidateByQuery = (querySlug && tenantBySlug[querySlug as TenantSlug]) || undefined;
  const candidateByPath = (pathSlug && tenantBySlug[pathSlug]) || undefined;

  const tenant = candidateByHost || candidateByQuery || candidateByPath || defaultTenant;

  const source: TenantMatchSource = candidateByHost
    ? 'host'
    : candidateByQuery
      ? 'query'
      : candidateByPath
        ? 'path'
        : 'fallback';

  const matchedHost = candidateByHost ? hosts.find((host) => matchesHost(host, candidateByHost)) : undefined;
  return { ...tenant, source, host: matchedHost || hosts[0] };
}

export function getTenantBySlug(slug?: string | null): TenantContext {
  const tenant = tenantBySlug[slug as TenantSlug] || defaultTenant;
  return { ...tenant, source: slug ? 'path' : 'fallback' };
}

export function tenantBasePath(tenant?: TenantConfig) {
  return tenant?.basePath || '';
}

export function tenantBrand(tenant?: TenantConfig) {
  if (!tenant) return undefined;
  const key = (tenant.brandKey || tenant.slug) as BrandKey;
  return BRANDS[key];
}
