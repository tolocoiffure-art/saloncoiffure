import type { MiddlewareHandler } from 'astro';

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
];
const COUNTRY_HEADERS = ['x-vercel-ip-country', 'cf-ipcountry', 'x-country-code'] as const;

const isSwissIpOnlyEnabled = () => {
  if (import.meta.env.DEV) return false;
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
    '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Acces restreint</title></head><body style="font-family:sans-serif;padding:2rem;"><h1>Acces restreint</h1><p>Ce site est accessible uniquement depuis la Suisse.</p></body></html>',
    { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } }
  );

export const onRequest: MiddlewareHandler = async (context, next) => {
  const url = new URL(context.request.url);
  const shouldSkip = SKIP_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

  if (isSwissIpOnlyEnabled() && !shouldSkip) {
    const country = countryFromRequest(context.request);
    const bypassToken = context.request.headers.get('x-geo-bypass-token');
    const isBypass = !!bypassToken && bypassToken === import.meta.env.SWISS_IP_BYPASS_TOKEN;

    if (!isBypass && country !== 'CH' && country !== '') {
      return forbiddenSwissOnlyResponse();
    }
  }

  if (!shouldSkip) {
    if (url.pathname.startsWith('/tolo-coiffure')) {
      const stripped = url.pathname.replace(/^\/tolo-coiffure/, '') || '/';
      return Response.redirect(new URL(`${stripped}${url.search}`, url).toString(), 308);
    }

    url.pathname = `/tolo-coiffure${url.pathname === '/' ? '' : url.pathname}`;
  }

  return next(new Request(url.toString(), context.request));
};
