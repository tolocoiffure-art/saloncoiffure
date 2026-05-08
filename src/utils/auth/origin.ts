import { ENV } from '~/lib/env';

const LOCALHOST_PATTERN = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i;
const DEFAULT_PUBLIC_ORIGIN = 'http://www.pedrodemenagement.ch';

export function normalizeOrigin(value: string) {
  if (!value) return '';
  try {
    const url = value.includes('://') ? new URL(value) : new URL(`http://${value}`);
    return url.origin;
  } catch {
    return '';
  }
}

export function resolveAppOrigin(request?: Request | null) {
  const configured = normalizeOrigin((ENV.ORIGIN || '').trim());
  if (configured) {
    try {
      const hostname = new URL(configured).hostname;
      if (!LOCALHOST_PATTERN.test(hostname)) {
        return configured;
      }
    } catch {
      // ignore malformed configured origins
    }
  }

  if (request) {
    const forwardedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
    const host = forwardedHost.split(',')[0]?.trim() ?? '';
    const forwardedProto = request.headers.get('x-forwarded-proto') ?? '';
    const protoCandidate = forwardedProto.split(',')[0]?.trim() ?? '';
    const proto = protoCandidate || (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https');

    if (host) {
      const derived = normalizeOrigin(`${proto}://${host}`);
      if (derived) return derived;
    }

    try {
      return new URL(request.url).origin;
    } catch {
      // ignore parsing failures
    }
  }

  return DEFAULT_PUBLIC_ORIGIN;
}
