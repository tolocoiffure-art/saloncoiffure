import type { APIRoute } from 'astro';

import { logAgencyActivity } from '~/utils/backend/activity';
import { getAgencyContext } from '~/utils/backend/context';
import {
  badRequest,
  handleApiError,
  noContent,
  ok,
  serviceUnavailable,
} from '~/utils/backend/http';
import {
  deleteTeamMember,
  getTeamMemberById,
  updateTeamMember,
} from '~/utils/backend/services/team';
import { parseTeamMemberUpdate } from '~/utils/backend/validation';
import { withAuth } from '~/utils/supabase/auth';

export const prerender = false;

const SUPABASE_ERROR = 'Supabase admin client is not configured';

export const GET: APIRoute = withAuth(async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing team member id');
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const member = await getTeamMemberById(client, agency.id, id);

    return ok({ member });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in GET /api/backend/team/[id]');
  }
});

export const PATCH: APIRoute = withAuth(async ({ locals, params, request }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing team member id');
  }

  let payload: ReturnType<typeof parseTeamMemberUpdate>;

  try {
    payload = parseTeamMemberUpdate(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    return badRequest(message);
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const member = await updateTeamMember(client, agency.id, id, payload);

    await logAgencyActivity(client, agency.id, 'team_member_updated', 'team_member', member.id, {
      full_name: member.full_name,
      email: member.email,
      role: member.role,
    });

    return ok({ member });
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in PATCH /api/backend/team/[id]');
  }
});

export const DELETE: APIRoute = withAuth(async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    return badRequest('Missing team member id');
  }

  try {
    const { agency, client } = await getAgencyContext(locals);
    const member = await deleteTeamMember(client, agency.id, id);

    await logAgencyActivity(client, agency.id, 'team_member_removed', 'team_member', member.id, {
      full_name: member.full_name,
      email: member.email,
      role: member.role,
    });

    return noContent();
  } catch (error) {
    if (error instanceof Error && error.message === SUPABASE_ERROR) {
      return serviceUnavailable('Supabase not configured');
    }
    return handleApiError(error, 'Unexpected error in DELETE /api/backend/team/[id]');
  }
});

