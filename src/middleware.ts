import type { MiddlewareHandler } from 'astro';
import { resolveTenantFromRequest, tenantBasePath } from '~/lib/tenants';
import { getWebsiteByHost } from '~/lib/website-resolver';

const SKIP_PREFIXES = [
  '/api/',
  '/_astro',
  '/_image',
  '/favicon',
  '/assets',
  '/robots',
  '/sitemap',
  '/@fs',
  '/node_modules',
  '/auth',
  '/app',
  '/decapcms',
  '/__site',
];

const COUNTRY_HEADERS = ['x-vercel-ip-country', 'cf-ipcountry', 'x-country-code'] as const;

const isSwissIpOnlyEnabled = () => {
  if (import.meta.env.DEV) return false;
  if (process.env.SWISS_IP_ONLY === '0') return false;
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === 'production';
  return import.meta.env.PROD;
};

const countryFromRequest = (request: Request) => {
  for (const header of COUNTRY_HEADERS) {
    const value = request.headers.get(header)?.trim().toUpperCase();
    if (value) return value;
  }
  return '';
};

const forbiddenSwissOnlyResponse = () =>
  new Response(
    '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Acces restreint</title></head><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:2rem;line-height:1.5;"><h1 style="margin:0 0 .75rem;">Acces restreint</h1><p style="margin:0;">Ce site est accessible uniquement depuis la Suisse.</p></body></html>',
    {
      status: 403,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    }
  );

export const onRequest: MiddlewareHandler = async (context, next) => {
  const resolved = resolveTenantFromRequest(context.request);
  context.locals.tenant = resolved;

  const url = new URL(context.request.url);
  const hostCandidates = [context.request.headers.get('x-forwarded-host'), context.request.headers.get('host'), url.host]
    .flatMap((value) => (value || '').split(','))
    .map((value) => value.trim().toLowerCase().split(':')[0])
    .filter(Boolean);
  const hostLower = hostCandidates[0] || '';
  const isLocalHost = hostCandidates.some(
    (host) => host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')
  );
  const isToloHost =
    (resolved.source === 'host' && resolved.slug === 'tolo-coiffure') ||
    hostCandidates.some((host) => host.includes('tolocoiffure.ch'));
  const basePath = tenantBasePath(resolved);
  const shouldSkip = SKIP_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
  const headers = new Headers(context.request.headers);
  headers.set('x-tenant-id', resolved.slug);

  // Tenant traffic geo lock: only CH in production unless explicitly disabled.
  if (isSwissIpOnlyEnabled() && !shouldSkip && resolved.source !== 'fallback') {
    const country = countryFromRequest(context.request);
    const bypassToken = context.request.headers.get('x-geo-bypass-token');
    const bypassEnabled =
      !!process.env.SWISS_IP_BYPASS_TOKEN &&
      !!bypassToken &&
      bypassToken === process.env.SWISS_IP_BYPASS_TOKEN;

    if (!bypassEnabled && country !== 'CH') {
      return forbiddenSwissOnlyResponse();
    }
  }

  // Multi-tenant site resolver (customer sites)
  if (!shouldSkip && !isLocalHost) {
    const website = await getWebsiteByHost(resolved.host || hostLower);
    if (website && resolved.source === 'fallback') {
      context.locals.website = website;
      headers.set('x-website-id', website.website.id);
      const originalPath = url.pathname || '/';
      headers.set('x-original-path', originalPath);
      const targetPath = `/__site${originalPath === '/' ? '/index' : originalPath}`;
      url.pathname = targetPath;
      const init: RequestInit = {
        headers,
        method: context.request.method,
        redirect: context.request.redirect,
      };
      if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
        init.body = context.request.body;
      }
      return next(new Request(url.toString(), init));
    }
  }

  // Explicit host guard for Atelier Mémoire to avoid falling back to déménagement pages
  if (hostLower.includes('ateliermemoire.ch') && !url.pathname.startsWith('/atelier-memoire')) {
    const target = new URL(`/atelier-memoire${url.pathname === '/' ? '' : url.pathname}${url.search}`, url);
    return Response.redirect(target.toString(), 308);
  }

  // Canonicalize prefixed Tolo URLs to clean root paths.
  if (url.pathname.startsWith('/tolo-coiffure')) {
    const stripped = url.pathname.replace(/^\/tolo-coiffure/, '') || '/';
    const target = new URL(`${stripped}${url.search}`, url);
    return Response.redirect(target.toString(), 308);
  }

  // Keep clean root URLs on Tolo host while internally serving tenant pages.
  if (isToloHost && !shouldSkip && !url.pathname.startsWith('/tolo-coiffure')) {
    url.pathname = `/tolo-coiffure${url.pathname === '/' ? '' : url.pathname}`;
  }

  // Hard redirect Atelier Mémoire host to its dedicated base path to avoid falling back to generic content
  if (resolved.slug === 'ateliermemoire') {
    const shouldRedirect = !url.pathname.startsWith('/atelier-memoire');
    if (shouldRedirect) {
      const target = new URL(`/atelier-memoire${url.pathname === '/' ? '' : url.pathname}${url.search}`, url);
      return Response.redirect(target.toString(), 308);
    }
  }

  // Normalize legacy TonSiteWeb prefixed URLs to the host-based model
  if (resolved.slug === 'tonsiteweb' && url.pathname.startsWith('/tonsiteweb')) {
    const stripped = url.pathname.replace(/^\/tonsiteweb/, '') || '/';
    const target = new URL(stripped, url);
    return Response.redirect(target.toString(), 308);
  }

  if (!shouldSkip && basePath) {
    const hasPrefix = url.pathname.startsWith(basePath);
    const shouldStripPrefix = hasPrefix && resolved.preserveBasePath !== true;
    const shouldAddPrefix =
      basePath &&
      !hasPrefix &&
      resolved.source === 'host' &&
      resolved.skipHostRewrite !== true;

    if (shouldStripPrefix) {
      url.pathname = url.pathname.slice(basePath.length) || '/';
    } else if (shouldAddPrefix) {
      const merged = `${basePath}${url.pathname}`;
      url.pathname = merged !== '/' && merged.endsWith('/') ? merged.slice(0, -1) : merged;
    }
  }

  const init: RequestInit = {
    headers,
    method: context.request.method,
    redirect: context.request.redirect,
  };
  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    init.body = context.request.body;
  }

  return next(new Request(url.toString(), init));
};
