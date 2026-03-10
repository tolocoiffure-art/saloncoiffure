import type { MiddlewareHandler } from 'astro';

// We define the tenant locally to avoid importing the Node-heavy '~/lib/tenants'
const TOLO_TENANT = {
  slug: 'tolo-coiffure',
  source: 'host',
  host: 'tolocoiffure.ch',
  basePath: '/tolo-coiffure'
};

const SKIP_PREFIXES = [
  '/api/', '/_astro', '/_image', '/favicon', '/assets',
  '/robots', '/sitemap', '/@fs', '/node_modules',
  '/auth', '/app', '/decapcms', '/__site',
];

const COUNTRY_HEADERS = ['x-vercel-ip-country', 'cf-ipcountry', 'x-country-code'] as const;

// Helper to check Geo-locking (Swiss only)
const isSwissIpOnlyEnabled = () => {
  if (import.meta.env.DEV) return false;
  // Use import.meta.env for better compatibility with Astro/Vercel
  if (import.meta.env.SWISS_IP_ONLY === '0') return false;
  return true; 
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
    '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Accès restreint</title></head><body style="font-family:sans-serif;padding:2rem;"><h1>Accès restreint</h1><p>Ce site est accessible uniquement depuis la Suisse.</p></body></html>',
    { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } }
  );

export const onRequest: MiddlewareHandler = async (context, next) => {
  const url = new URL(context.request.url);
  const shouldSkip = SKIP_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
  
  // 1. Set the tenant context for the rest of the app
  context.locals.tenant = TOLO_TENANT;

  // 2. Geo-Blocking Logic
  if (isSwissIpOnlyEnabled() && !shouldSkip) {
    const country = countryFromRequest(context.request);
    const bypassToken = context.request.headers.get('x-geo-bypass-token');
    const isBypass = !!bypassToken && bypassToken === import.meta.env.SWISS_IP_BYPASS_TOKEN;

    if (!isBypass && country !== 'CH' && country !== '') { // Empty string allowed for local dev
      return forbiddenSwissOnlyResponse();
    }
  }

  // 3. Routing Logic for tolocoiffure.ch
  if (!shouldSkip) {
    // Redirect /tolo-coiffure/about -> /about (Canonical URL)
    if (url.pathname.startsWith('/tolo-coiffure')) {
      const stripped = url.pathname.replace(/^\/tolo-coiffure/, '') || '/';
      return Response.redirect(new URL(`${stripped}${url.search}`, url).toString(), 308);
    }

    // Internal Rewrite: /services -> /pages/tolo-coiffure/services.astro
    // This keeps the URL clean in the browser but serves the correct tenant files
    url.pathname = `/tolo-coiffure${url.pathname === '/' ? '' : url.pathname}`;
  }

  // 4. Prepare Request for next()
  const headers = new Headers(context.request.headers);
  headers.set('x-tenant-id', TOLO_TENANT.slug);

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