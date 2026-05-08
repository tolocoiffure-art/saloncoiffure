import type { APIRoute } from 'astro';

import { logAgencyActivity } from '~/utils/backend/activity';
import { getAgencyContext } from '~/utils/backend/context';
import { badRequest, created, handleApiError, ok, serviceUnavailable } from '~/utils/backend/http';
import { createTask, listTasks } from '~/utils/backend/services/tasks';
import { parseTaskPayload, TASK_PRIORITIES, TASK_STATUSES } from '~/utils/backend/validation';
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

function normalizeEnum(value: string | null, allowed: readonly string[]): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : undefined;
}

function parseDateParam(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseBooleanParam(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export const GET: APIRoute = withAuth(async ({ locals, url }) => {
  try {
    const { agency, client } = await getAgencyContext(locals);

    const search = url.searchParams.get('search') ?? url.searchParams.get('q');
    const page = parsePositiveInteger(url.searchParams.get('page'), 1);
    const pageSize = parsePageSize(url.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);
    const status = normalizeEnum(url.searchParams.get('status'), TASK_STATUSES as readonly string[]);
    const priority = normalizeEnum(url.searchParams.get('priority'), TASK_PRIORITIES as readonly string[]);
    const projectId = url.searchParams.get('projectId') ?? url.searchParams.get('project_id') ?? undefined;
    const assigneeId = url.searchParams.get('assigneeId') ?? url.searchParams.get('assignee_id') ?? undefined;
    const dueBefore = parseDateParam(url.searchParams.get('dueBefore') ?? url.searchParams.get('due_before'));
    const dueAfter = parseDateParam(url.searchParams.get('dueAfter') ?? url.searchParams.get('due_after'));
    const includeSummaries = parseBooleanParam(url.searchParams.get('summaries'), true);

    const { tasks, total, summaries } = await listTasks(client, agency.id, {
      page,
      pageSize,
      status,
      priority,
      projectId: projectId ? projectId.trim() : undefined,
      assigneeId: assigneeId ? assigneeId.trim() : undefined,
      search,
      dueBefore,
      dueAfter,
      includeSummaries,
    });

    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    return ok({
      tasks,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
      summaries: includeSummaries ? summaries ?? { statusCounts: {}, priorityCounts: {} } : undefined,
    });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in GET /api/backend/tasks');
  }
});

export const POST: APIRoute = withAuth(async ({ locals, request }) => {
  let payload: ReturnType<typeof parseTaskPayload>;

  try {
    payload = parseTaskPayload(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    return badRequest(message);
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const record = await createTask(client, agency.id, payload);

    await logAgencyActivity(client, agency.id, 'task_created', 'task', record.id, {
      title: record.title,
      status: record.status,
      priority: record.priority,
    });

    return created({ task: record });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in POST /api/backend/tasks');
  }
});
