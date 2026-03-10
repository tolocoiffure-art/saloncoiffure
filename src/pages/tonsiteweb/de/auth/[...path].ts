import type { APIRoute } from 'astro';

export const prerender = false;

// Routes that must pass through directly
const AUTH_DIRECT = new Set([
  'signin',
  'signup',
  'forgot',
  'reset',
  'callback',
  'verify'
]);

export const GET: APIRoute = ({ params, request }) => {
  const p = params.path as string[] | string | undefined;
  const rest = Array.isArray(p) ? p.join('/') : (p ?? '');
  const qs = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
  const base = new URL(request.url);

  // If user goes to localized auth callback/verify/signin/signup/etc
  if (AUTH_DIRECT.has(rest)) {
    // Redirect to non-localized blade
    return Response.redirect(new URL(`/auth/${rest}${qs}`, base.origin), 302);
  }

  // Fallback = capture localized route → forward to base /auth/*
  return Response.redirect(new URL(`/auth/${rest}${qs}`, base.origin), 302);
};
