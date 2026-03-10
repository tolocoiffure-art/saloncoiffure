import type { APIRoute } from 'astro';

import { logAgencyActivity } from '~/utils/backend/activity';
import { getAgencyContext } from '~/utils/backend/context';
import { badRequest, handleApiError, noContent, ok, serviceUnavailable } from '~/utils/backend/http';
import { deleteTask, getTaskById, updateTask } from '~/utils/backend/services/tasks';
import { parseTaskUpdate } from '~/utils/backend/validation';
import { withAuth } from '~/utils/supabase/auth';

export const prerender = false;

const SUPABASE_ERROR = 'Supabase admin client is not configured';

export const GET: APIRoute = withAuth(async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing task id');
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const record = await getTaskById(client, agency.id, id);

    return ok({ task: record });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in GET /api/backend/tasks/[id]');
  }
});

export const PATCH: APIRoute = withAuth(async ({ locals, params, request }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing task id');
  }

  let payload: ReturnType<typeof parseTaskUpdate>;

  try {
    payload = parseTaskUpdate(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    return badRequest(message);
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const updated = await updateTask(client, agency.id, id, payload);

    await logAgencyActivity(client, agency.id, 'task_updated', 'task', updated.id, {
      title: updated.title,
      status: updated.status,
      priority: updated.priority,
    });

    return ok({ task: updated });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in PATCH /api/backend/tasks/[id]');
  }
});

export const DELETE: APIRoute = withAuth(async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing task id');
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const deleted = await deleteTask(client, agency.id, id);

    await logAgencyActivity(client, agency.id, 'task_deleted', 'task', deleted.id, {
      title: deleted.title,
    });

    return noContent();
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in DELETE /api/backend/tasks/[id]');
  }
});
