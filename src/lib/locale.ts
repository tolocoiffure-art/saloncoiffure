import type { APIRoute } from 'astro';

const SUPPORTED = ['fr', 'en', 'de', 'it', 'ar', 'zh'] as const;
export type Locale = (typeof SUPPORTED)[number];

export const DEFAULT_LOCALE: Locale = 'fr';

export function resolveLocaleFromRequest(request: Request, fallback: Locale = DEFAULT_LOCALE): Locale {
  const cookie = request.headers.get('cookie') || '';
  const cookieMatch = cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('aw_lang='));
  const cookieLang = cookieMatch ? cookieMatch.split('=')[1] : '';

  const accept = (request.headers.get('accept-language') || '').slice(0, 2).toLowerCase();

  return (SUPPORTED.find((l) => l === cookieLang) ??
    SUPPORTED.find((l) => l === accept) ??
    fallback) as Locale;
}

export function detectRequestLocale(
  request: Request,
  url?: URL | string | null,
  fallback: Locale = DEFAULT_LOCALE
): Locale {
  const targetUrl =
    url instanceof URL
      ? url
      : url
        ? new URL(url, request.url)
        : new URL(request.url);

  const queryLang = (targetUrl.searchParams.get('lang') || '').toLowerCase();
  const pathMatch = targetUrl.pathname.match(/^\/(fr|en|de|it|ar|zh)(?=\/|$)/);
  const pathLang = (pathMatch?.[1] || '').toLowerCase();

  const cookie = request.headers.get('cookie') || '';
  const cookieLang = cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('aw_lang='))?.split('=')[1]
    ?.toLowerCase() || '';

  const accept = (request.headers.get('accept-language') || '').slice(0, 2).toLowerCase();

  const supported = SUPPORTED as readonly string[];
  const pick = (value: string) => supported.includes(value) ? (value as Locale) : undefined;

  return pick(queryLang) ?? pick(pathLang) ?? pick(cookieLang) ?? pick(accept) ?? fallback;
}

// Helper to expose locale to API routes (if needed later)
export type LocaleAwareAPIRoute = APIRoute & { locale?: Locale };
