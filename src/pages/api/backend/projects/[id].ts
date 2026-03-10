import type { APIRoute } from 'astro';

import { logAgencyActivity } from '~/utils/backend/activity';
import { getAgencyContext } from '~/utils/backend/context';
import { badRequest, handleApiError, noContent, ok, serviceUnavailable } from '~/utils/backend/http';
import {
  deleteProject,
  getProjectById,
  updateProject,
} from '~/utils/backend/services/projects';
import { parseProjectUpdate } from '~/utils/backend/validation';
import { withAuth } from '~/utils/supabase/auth';

export const prerender = false;

const SUPABASE_ERROR = 'Supabase admin client is not configured';

export const GET: APIRoute = withAuth(async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing project id');
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const project = await getProjectById(client, agency.id, id);

    return ok({ project });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in GET /api/backend/projects/[id]');
  }
});

export const PATCH: APIRoute = withAuth(async ({ locals, params, request }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing project id');
  }

  let payload: ReturnType<typeof parseProjectUpdate>;

  try {
    payload = parseProjectUpdate(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    return badRequest(message);
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const existing = await getProjectById(client, agency.id, id);
    const updated = await updateProject(client, agency.id, id, payload);

    await logAgencyActivity(client, agency.id, 'project_updated', 'project', id, {
      previous_status: existing.status,
      new_status: updated.status,
      previous_budget: existing.budget,
      new_budget: updated.budget,
    });

    return ok({ project: updated });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in PATCH /api/backend/projects/[id]');
  }
});

export const DELETE: APIRoute = withAuth(async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing project id');
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const { project, detached } = await deleteProject(client, agency.id, id);

    await logAgencyActivity(client, agency.id, 'project_deleted', 'project', project.id, {
      name: project.name,
      detached_tasks: detached.tasks,
      detached_invoices: detached.invoices,
    });

    return noContent();
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in DELETE /api/backend/projects/[id]');
  }
});
