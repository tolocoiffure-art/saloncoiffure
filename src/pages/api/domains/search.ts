import type { APIRoute } from 'astro';

import { getEnv } from '~/lib/env';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export const prerender = false;

function parseLimit(url: URL) {
  const raw = Number(url.searchParams.get('limit') || DEFAULT_LIMIT);
  if (Number.isNaN(raw) || raw <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(raw), MAX_LIMIT);
}

function parseMaxPrice(url: URL) {
  const raw = Number(url.searchParams.get('max'));
  if (Number.isNaN(raw) || raw <= 0) return null;
  return raw;
}

async function fetchFromGoDaddy(query: string, url: URL) {
  const key = getEnv('GODADDY_API_KEY');
  const secret = getEnv('GODADDY_API_SECRET');

  if (!key || !secret) return null;

  const params = new URLSearchParams();
  params.set('query', query);
  params.set('country', url.searchParams.get('country') || 'CH');
  const city = url.searchParams.get('city');
  if (city) params.set('city', city);
  params.set('sources', url.searchParams.get('sources') || 'SPONSORED');
  params.set('limit', String(parseLimit(url)));

  url.searchParams.getAll('tld').forEach((tld) => {
    if (tld) params.append('tlds', tld.replace(/^\./, ''));
  });

  const endpoint = `https://api.godaddy.com/v1/domains/suggest?${params.toString()}`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `sso-key ${key}:${secret}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GoDaddy API error (${response.status}): ${text || response.statusText}`);
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : Array.isArray(payload?.domains) ? payload.domains : [];
}

function normalisePrice(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  // GoDaddy returns price in the smallest currency unit (e.g. cents)
  return Math.round((value / 100) * 100) / 100;
}

function mapSuggestion(raw: any) {
  const price = normalisePrice(raw.price);
  return {
    domain: String(raw.domain || ''),
    price,
    currency: typeof raw.currency === 'string' ? raw.currency : 'USD',
    period: typeof raw.period === 'number' ? raw.period : 1,
    score: typeof raw.score === 'number' ? raw.score : null,
    available: Boolean(raw.available ?? true),
    isPremium: Boolean(raw.premium ?? false),
  };
}

function fallbackResults(query: string) {
  return [
    { domain: `${query}.ch`, price: 12.5, currency: 'CHF', period: 1, available: true, isPremium: false, score: null },
    { domain: `${query}.com`, price: 10.9, currency: 'CHF', period: 1, available: true, isPremium: false, score: null },
    { domain: `${query}.swiss`, price: 85.0, currency: 'CHF', period: 1, available: true, isPremium: true, score: null },
    { domain: `${query}-studio.ch`, price: 14.2, currency: 'CHF', period: 1, available: true, isPremium: false, score: null },
    { domain: `${query}.net`, price: 19.5, currency: 'CHF', period: 1, available: true, isPremium: false, score: null },
  ];
}

export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get('q') || '').trim();
  const maxPrice = parseMaxPrice(url);

  if (!q) {
    return new Response(JSON.stringify({ results: [] }), {
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const data = await fetchFromGoDaddy(q, url);
    const list = (data ?? fallbackResults(q)).map(mapSuggestion).filter((item) => item.domain);

    const filtered = typeof maxPrice === 'number'
      ? list.filter((item) => typeof item.price === 'number' && item.price <= maxPrice)
      : list;

    return new Response(
      JSON.stringify({ results: filtered.slice(0, parseLimit(url)) }),
      { headers: { 'content-type': 'application/json' } },
    );
  } catch (e: any) {
    console.error('Domain search failed', e);
    return new Response(
      JSON.stringify({ error: e?.message || 'search_failed' }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    );
  }
};

