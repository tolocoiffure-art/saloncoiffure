import { logger } from './logger.js';

export type RateLimitOptions = {
  /**
   * Unique bucket identifier. Defaults to "global" but you should scope per endpoint.
   */
  key?: string;
  /**
   * Maximum number of requests allowed during the window.
   */
  limit: number;
  /**
   * Window length in seconds.
   */
  window: number;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  reset: number;
  retryAfter?: number;
};

const store = new Map<string, { count: number; expiresAt: number }>();

function getClientIdentifier(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

function makeBucketKey(request: Request, key?: string) {
  return `${key || 'global'}:${getClientIdentifier(request)}`;
}

export function rateLimit(request: Request, options: RateLimitOptions): RateLimitResult {
  const { key, limit, window } = options;
  const now = Math.floor(Date.now() / 1000);
  const bucketKey = makeBucketKey(request, key);
  const entry = store.get(bucketKey);

  if (!entry || entry.expiresAt <= now) {
    const expiresAt = now + window;
    store.set(bucketKey, { count: 1, expiresAt });
    return { ok: true, remaining: limit - 1, reset: expiresAt };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.max(entry.expiresAt - now, 1);
    return { ok: false, remaining: 0, reset: entry.expiresAt, retryAfter };
  }

  entry.count += 1;
  store.set(bucketKey, entry);
  return { ok: true, remaining: Math.max(limit - entry.count, 0), reset: entry.expiresAt };
}

export function assertRateLimit(request: Request, options: RateLimitOptions) {
  const result = rateLimit(request, options);
  if (result.ok) return result;

  logger.warn('Rate limit exceeded', {
    bucket: options.key || 'global',
    identifier: getClientIdentifier(request),
    limit: options.limit,
    window: options.window,
  });

  throw new Response(JSON.stringify({ error: 'Too many requests. Try again later.' }), {
    status: 429,
    headers: {
      'Retry-After': String(result.retryAfter ?? 60),
      'X-RateLimit-Limit': String(options.limit),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(result.reset),
      'Content-Type': 'application/json',
    },
  });
}

