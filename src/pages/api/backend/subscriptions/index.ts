import type { APIRoute } from 'astro';

import { getAgencyContext } from '~/utils/backend/context';
import { handleApiError, ok, serviceUnavailable } from '~/utils/backend/http';
import { listSubscriptionEvents } from '~/utils/backend/services/subscriptions';
import { withAuth } from '~/utils/supabase/auth';

export const prerender = false;

const SUPABASE_ERROR = 'Supabase admin client is not configured';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
}

function parsePageSize(value: string | null, fallback: number): number {
  const parsed = parsePositiveInteger(value, fallback);
  return Math.min(parsed, MAX_PAGE_SIZE);
}

function normalizeOptional(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const GET: APIRoute = withAuth(async ({ locals, url }) => {
  try {
    const page = parsePositiveInteger(url.searchParams.get('page'), 1);
    const pageSize = parsePageSize(url.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);
    const subscriptionId = normalizeOptional(url.searchParams.get('subscriptionId')) ??
      normalizeOptional(url.searchParams.get('subscription_id'));
    const eventType = normalizeOptional(url.searchParams.get('eventType')) ??
      normalizeOptional(url.searchParams.get('event_type'));
    const email = normalizeOptional(url.searchParams.get('email'));
    const search = normalizeOptional(url.searchParams.get('search')) ?? normalizeOptional(url.searchParams.get('q'));

    const { agency, client } = await getAgencyContext(locals);

    const { events, total } = await listSubscriptionEvents(client, agency.id, {
      page,
      pageSize,
      subscriptionId,
      eventType,
      email,
      search: search ?? null,
    });

    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    return ok({
      events,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
      filters: {
        subscriptionId: subscriptionId ?? null,
        eventType: eventType ?? null,
        email: email ?? null,
        search: search ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in GET /api/backend/subscriptions');
  }
});

